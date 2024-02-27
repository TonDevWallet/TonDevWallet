use std::borrow::Cow;

use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{SinkExt, StreamExt, TryStreamExt};
use log::info;
use std::error::Error as stdError;
use std::net::SocketAddr;
use tokio::io::{AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::net::tcp::{OwnedReadHalf, OwnedWriteHalf};
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::WebSocketStream;
use tungstenite::{http, Message};
use url::form_urlencoded;
use std::time::Duration;
use tokio::time::timeout;
use tokio_tungstenite::{
    accept_hdr_async,
    tungstenite::handshake::server::{Request, Response},
};

pub async fn spawn_proxy(listener: &mut TcpListener) -> Result<(), Box<dyn stdError + Send>> {
    let _ = env_logger::try_init();

    while let Ok((stream, _)) = listener.accept().await {
        tokio::spawn(async move {
            // Process each socket concurrently.
            let res = accept_connection(stream).await;
            if res.is_err() {
                info!("Res error {:?}", res.err())
            }
        });
    }

    Ok(())
}

fn int_to_ip(int: i32) -> String {
    let part1 = int & 255;
    let part2 = (int >> 8) & 255;
    let part3 = (int >> 16) & 255;
    let part4 = (int >> 24) & 255;

    return format!("{}.{}.{}.{}", part4, part3, part2, part1);
}

async fn accept_connection(mut stream: TcpStream) -> Result<(), Box<dyn stdError + Send + Sync>> {
    let addr = stream
        .peer_addr()
        .expect("connected streams should have a peer address");
    info!("Peer address: {}", addr);

    let mut ip: String = String::from("");
    let mut port: i32 = 0;

    let auth_callback = |req: &Request, res: Response| {
        info!("req uri {} {:?}", req.uri(), req.uri().host(),);
        let mut pairs = form_urlencoded::parse(req.uri().query().unwrap_or("").as_bytes());
        info!("Got pairs");

        loop {
            info!("Got pairs loop");
            let (k, v) = match pairs.next() {
                None => break,
                Some(v) => v,
            };

            info!("Got k, v {} {}", k, v);

            match k {
                Cow::Borrowed("ip") => {
                    info!("ip {}", v);
                    let ip_num = v.parse::<i32>().unwrap();
                    ip = int_to_ip(ip_num);
                }
                Cow::Borrowed("port") => {
                    info!("port {}", v);
                    let port_num = v.parse::<i32>().unwrap();
                    port = port_num;
                }
                _ => {}
            }
        }

        if port == 0 {
            return Err(http::Response::<Option<String>>::new(None));
        }
        Ok(res)
    };


    // let mut rng = rand::thread_rng();
    let random_value: f64 = rand::random();
    
    if random_value < 0.5 {
        if let Err(e) = stream.shutdown().await {
            info!("Error while closing WebSocket: {:?}", e);
        }
        return Ok(());
    }

    let ws_stream = match accept_hdr_async(stream, auth_callback).await {
        Ok(v) => v,
        Err(e) => {
            info!("got error {:?}", e);
            panic!("Error");
        }
    };

    


    info!("New WebSocket connection: {}", addr);

    let addr_str = format!("{}:{}", ip, port);
    info!("addr_str {}", addr_str);
    let addr = addr_str.parse::<SocketAddr>()?;
    let stream = TcpStream::connect(&addr).await?;

    let (ri, wi) = stream.into_split();
    let (wo, ro) = ws_stream.split();

    tokio::spawn(ws_to_tcp(ro, wi));
    tokio::spawn(tcp_to_ws(ri, wo));

    Ok(())
}

async fn ws_to_tcp(
    mut ro: SplitStream<WebSocketStream<TcpStream>>,
    mut wi: OwnedWriteHalf,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    info!("got ws to tcp start");

    loop {
        let msg_or_timeout = timeout(Duration::from_secs(60), ro.try_next()).await;

        let msg = match msg_or_timeout {
            Ok(Ok(msg)) => msg,
            Ok(Err(_)) => {
                // Error occurred while receiving message
                break;
            }
            Err(_) => {
                // Timeout occurred, break the loop
                info!("No activity for 60 seconds, breaking the loop");
                break;
            }
        };

        match msg {
            Some(msg) => {
                if msg.is_binary() {
                    info!("got ws to tcp");
                    let mut data = msg.into_data();
                    wi.write(&mut data).await?;
                    info!("written to tcp {}", data.len());
                } else {
                    // Handle other message types if needed
                }
            }
            None => {
                info!("No more messages, breaking the loop");
                break;
            }
        }
        // if msg.is_binary() {
        //     info!("got ws to tcp");
        //     let mut data = msg.into_data();
        //     wi.write(&mut data).await?;
        //     info!("written to tcp {}", data.len());
        // } else {
        //     // Handle other message types if needed
        // }
    }

    wi.shutdown().await?;
    Ok(())
}

async fn tcp_to_ws(
    ri: OwnedReadHalf,
    mut wo: SplitSink<WebSocketStream<TcpStream>, Message>,
) -> Result<Option<SplitSink<WebSocketStream<TcpStream>, Message>>, Box<dyn stdError + Send + Sync>>
{
    info!("tcp_to_ws start");

    // ri.readable().await?;
    let mut stream = BufReader::new(ri);
    info!("tcp_to_ws readeable");
    let mut byte = vec![0_u8; 1024 * 3];
    loop {
        info!("tcp_to_ws loop");
        // let mut line = String::new();
        let n = stream.read(&mut byte).await?;
        info!("tcp_to_ws got info {}", n);
        match n {
            0 => break,
            // 1 => info!("A byte read: {}", byte[0]),
            _ => {
                let capped = &mut byte[0..n];
                let msg = tungstenite::Message::Binary(Vec::from(capped));
                wo.send(msg).await?;
            }
        }
    }

    wo.send(Message::Close(None)).await?;
    wo.close().await?;
    Ok(Some(wo))
}
