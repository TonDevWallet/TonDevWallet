use std::borrow::Cow;
use std::net::{Ipv4Addr, SocketAddr};

use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{SinkExt, StreamExt, TryStreamExt};
use log::trace;
use std::error::Error as stdError;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::net::tcp::{OwnedReadHalf, OwnedWriteHalf};
use tokio::net::{TcpListener, TcpStream};
use tokio::time::timeout;
use tokio_tungstenite::WebSocketStream;
use tokio_tungstenite::{
    accept_hdr_async,
    tungstenite::handshake::server::{Request, Response},
};
use tungstenite::{http, Message};
use url::form_urlencoded;
// use log::info;

pub async fn spawn_proxy(listener: &mut TcpListener) -> Result<(), Box<dyn stdError + Send>> {
    let _ = env_logger::try_init();

    while let Ok((stream, _)) = listener.accept().await {
        tokio::spawn(async move {
            if let Err(e) = accept_connection(stream).await {
                trace!("Connection error: {:?}", e);
            }
        });
    }

    Ok(())
}

fn int_to_ip(int: i32) -> String {
    Ipv4Addr::from(int as u32).to_string()
}

async fn accept_connection(stream: TcpStream) -> Result<(), Box<dyn stdError + Send + Sync>> {
    let peer_addr = stream.peer_addr()?;
    trace!("Peer address: {}", peer_addr);

    let mut target_addr: Option<SocketAddr> = None;

    let auth_callback = |req: &Request, res: Response| {
        trace!("Request URI: {}", req.uri());
        let mut ip = None;
        let mut port = None;

        if let Some(query) = req.uri().query() {
            for (k, v) in form_urlencoded::parse(query.as_bytes()) {
                match k.as_ref() {
                    "ip" => {
                        if let Ok(ip_num) = v.parse::<i32>() {
                            ip = Some(int_to_ip(ip_num));
                        }
                    }
                    "port" => {
                        if let Ok(port_num) = v.parse::<u16>() {
                            port = Some(port_num);
                        }
                    }
                    _ => {}
                }
            }
        }

        if let (Some(ip_str), Some(port_val)) = (ip, port) {
            if let Ok(addr) = format!("{}:{}", ip_str, port_val).parse() {
                target_addr = Some(addr);
                return Ok(res);
            }
        }

        Err(http::Response::builder()
            .status(http::StatusCode::BAD_REQUEST)
            .body(Some(
                "Missing or invalid 'ip' or 'port' query parameters.".to_string(),
            ))
            .unwrap())
    };

    let ws_stream = accept_hdr_async(stream, auth_callback).await?;

    trace!("New WebSocket connection: {}", peer_addr);

    let addr = target_addr.unwrap();
    trace!("Target address {}", addr);
    let target_stream = TcpStream::connect(&addr).await?;

    let (ri, wi) = target_stream.into_split();
    let (wo, ro) = ws_stream.split();

    tokio::spawn(ws_to_tcp(ro, wi));
    tokio::spawn(tcp_to_ws(ri, wo));

    Ok(())
}

async fn ws_to_tcp(
    mut ro: SplitStream<WebSocketStream<TcpStream>>,
    mut wi: OwnedWriteHalf,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    trace!("ws_to_tcp start");

    loop {
        let msg = match timeout(Duration::from_secs(60), ro.try_next()).await {
            Err(_) => {
                trace!("ws_to_tcp: Timeout after 60s of inactivity");
                break;
            }
            Ok(Err(e)) => {
                trace!("ws_to_tcp: WebSocket read error: {}", e);
                break;
            }
            Ok(Ok(None)) => {
                trace!("ws_to_tcp: WebSocket stream closed");
                break;
            }
            Ok(Ok(Some(msg))) => msg,
        };

        if let Message::Binary(data) = msg {
            trace!("ws_to_tcp: received {} bytes", data.len());
            if wi.write_all(&data).await.is_err() {
                trace!("ws_to_tcp: TCP write error, connection likely closed.");
                break;
            }
            trace!("ws_to_tcp: written to tcp {}", data.len());
        }
    }

    let _ = wi.shutdown().await;
    Ok(())
}

async fn tcp_to_ws(
    ri: OwnedReadHalf,
    mut wo: SplitSink<WebSocketStream<TcpStream>, Message>,
) -> Result<(), Box<dyn stdError + Send + Sync>> {
    trace!("tcp_to_ws start");

    let mut stream = BufReader::new(ri);
    let mut buffer = vec![0_u8; 1024 * 3];

    loop {
        let n = match stream.read(&mut buffer).await {
            Ok(0) => {
                trace!("tcp_to_ws: TCP stream ended");
                break;
            }
            Ok(n) => n,
            Err(e) => {
                trace!("tcp_to_ws: TCP read error: {}", e);
                break;
            }
        };

        trace!("tcp_to_ws: read {} bytes from tcp", n);
        let msg = Message::Binary(buffer[..n].to_vec());
        if wo.send(msg).await.is_err() {
            trace!("tcp_to_ws: WebSocket send error, connection likely closed.");
            break;
        }
    }

    let _ = wo.close().await;
    Ok(())
}
