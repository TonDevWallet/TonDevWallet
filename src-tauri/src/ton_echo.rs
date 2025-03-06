use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{SinkExt, StreamExt};
use log::info;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::error::Error as stdError;
use std::net::SocketAddr;
use std::sync::atomic::{AtomicU16, Ordering};
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::WebSocketStream;
use tungstenite::Message;

static TON_ECHO_PORT: AtomicU16 = AtomicU16::new(0);

#[derive(Serialize, Deserialize)]
struct HandshakeRequest {
    #[serde(rename = "type")]
    msg_type: String,
    id: Value,
}

#[derive(Serialize, Deserialize)]
struct HandshakeResponse {
    #[serde(rename = "type")]
    msg_type: String,
    id: Value,
    name: String,
}

pub async fn start_ton_echo_server() -> Result<u16, Box<dyn stdError + Send + Sync>> {
    let _ = env_logger::try_init();
    
    // Try ports from 33000 to 34000
    for port in 33000..34000 {
        let addr = format!("127.0.0.1:{}", port);
        match TcpListener::bind(&addr).await {
            Ok(listener) => {
                let actual_port = listener.local_addr()?.port();
                TON_ECHO_PORT.store(actual_port, Ordering::Relaxed);
                info!("TON echo server listening on port {}", actual_port);
                
                tokio::spawn(async move {
                    if let Err(e) = run_echo_server(listener).await {
                        info!("TON echo server error: {:?}", e);
                    }
                });
                
                return Ok(actual_port);
            }
            Err(_) => {
                // Port already in use, try the next one
                continue;
            }
        }
    }
    
    Err("Could not find an available port between 33000 and 34000".into())
}

async fn run_echo_server(listener: TcpListener) -> Result<(), Box<dyn stdError + Send + Sync>> {
    while let Ok((stream, addr)) = listener.accept().await {
        info!("New TON echo connection from: {}", addr);
        tokio::spawn(async move {
            if let Err(e) = handle_connection(stream).await {
                info!("Error processing connection: {:?}", e);
            }
        });
    }
    
    Ok(())
}

async fn handle_connection(stream: TcpStream) -> Result<(), Box<dyn stdError + Send + Sync>> {
    let ws_stream = tokio_tungstenite::accept_async(stream).await?;
    info!("WebSocket connection established");
    
    let (write, read) = ws_stream.split();
    process_messages(read, write).await?;
    
    Ok(())
}

async fn process_messages(
    mut read: SplitStream<WebSocketStream<TcpStream>>,
    mut write: SplitSink<WebSocketStream<TcpStream>, Message>,
) -> Result<(), Box<dyn stdError + Send + Sync>> {
    while let Some(message) = read.next().await {
        let message = message?;
        
        if message.is_text() {
            let text = message.to_text()?;
            info!("Received message: {}", text);
            
            match serde_json::from_str::<HandshakeRequest>(text) {
                Ok(request) => {
                    if request.msg_type == "handshake" {
                        let response = HandshakeResponse {
                            msg_type: "response".to_string(),
                            id: request.id,
                            name: "tondevwallet".to_string(),
                        };
                        
                        let response_json = serde_json::to_string(&response)?;
                        write.send(Message::Text(response_json)).await?;
                        info!("Sent handshake response");
                    }
                }
                Err(e) => {
                    info!("Error parsing request: {:?}", e);
                }
            }
        }
    }
    
    Ok(())
}

pub fn get_ton_echo_port() -> u16 {
    TON_ECHO_PORT.load(Ordering::Relaxed)
} 