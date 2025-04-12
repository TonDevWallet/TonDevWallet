use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{SinkExt, StreamExt};
use log::info;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::error::Error as stdError;
use std::sync::atomic::{AtomicU16, Ordering};
use tauri::{AppHandle, Emitter};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
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

pub async fn start_ton_echo_server(
    app_handle: AppHandle,
) -> Result<u16, Box<dyn stdError + Send + Sync>> {
    let _ = env_logger::try_init();

    // Create a channel for sending events to main thread
    let (tx, mut rx) = mpsc::channel::<Value>(100);

    // Spawn a task to handle the events
    let event_handle = app_handle.clone();
    tokio::spawn(async move {
        while let Some(value) = rx.recv().await {
            match event_handle.emit("proxy_transaction", value.clone()) {
                Ok(_) => info!("Emitted proxy_transaction event to app"),
                Err(err) => info!("Error emitting proxy_transaction event: {:?}", err),
            }
        }
    });

    // Try ports from 33000 to 34000
    for port in 33000..34000 {
        let addr = format!("127.0.0.1:{}", port);
        match TcpListener::bind(&addr).await {
            Ok(listener) => {
                let actual_port = listener.local_addr()?.port();
                TON_ECHO_PORT.store(actual_port, Ordering::Relaxed);
                info!("TON echo server listening on port {}", actual_port);

                let tx_clone = tx.clone();
                tokio::spawn(async move {
                    if let Err(e) = run_echo_server(listener, tx_clone).await {
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

async fn run_echo_server(
    listener: TcpListener,
    tx: mpsc::Sender<Value>,
) -> Result<(), Box<dyn stdError + Send + Sync>> {
    while let Ok((stream, addr)) = listener.accept().await {
        info!("New TON echo connection from: {}", addr);
        let tx_clone = tx.clone();
        tokio::spawn(async move {
            if let Err(e) = handle_connection(stream, tx_clone).await {
                info!("Error processing connection: {:?}", e);
            }
        });
    }

    Ok(())
}

async fn handle_connection(
    stream: TcpStream,
    tx: mpsc::Sender<Value>,
) -> Result<(), Box<dyn stdError + Send + Sync>> {
    let ws_stream = tokio_tungstenite::accept_async(stream).await?;
    info!("WebSocket connection established");

    let (write, read) = ws_stream.split();
    process_messages(read, write, tx).await?;

    Ok(())
}

async fn process_messages(
    mut read: SplitStream<WebSocketStream<TcpStream>>,
    mut write: SplitSink<WebSocketStream<TcpStream>, Message>,
    tx: mpsc::Sender<Value>,
) -> Result<(), Box<dyn stdError + Send + Sync>> {
    while let Some(message) = read.next().await {
        let message = message?;

        if message.is_text() {
            let text = message.to_text()?;
            info!("Received message: {}", text);

            match serde_json::from_str::<Value>(text) {
                Ok(value) => {
                    // Check if it's a handshake request
                    if let Some("handshake") = value.get("type").and_then(|t| t.as_str()) {
                        if let Some(id) = value.get("id") {
                            let response = HandshakeResponse {
                                msg_type: "response".to_string(),
                                id: id.clone(),
                                name: "tondevwallet".to_string(),
                            };

                            let response_json = serde_json::to_string(&response)?;
                            write.send(Message::Text(response_json)).await?;
                            info!("Sent handshake response");
                        }
                        continue;
                    }

                    // Handle proxy_transaction
                    if let Some("proxy_transaction") =
                        value.get("type").and_then(|t| t.as_str())
                    {
                        info!("Received proxy transaction");

                        // Send the event through the channel
                        if let Err(err) = tx.send(value).await {
                            info!("Error sending proxy_transaction event: {:?}", err);
                        }
                        continue;
                    }

                    if let Some("transactions_dump") =
                        value.get("type").and_then(|t| t.as_str())
                    {
                        info!("Received transactions dump");

                        // Send the event through the channel
                        if let Err(err) = tx.send(value).await {
                            info!("Error sending proxy_transaction event: {:?}", err);
                        }
                        continue;
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
