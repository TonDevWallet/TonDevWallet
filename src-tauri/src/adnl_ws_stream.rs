use crate::adnl_common::Timeouts;
use futures::{SinkExt, StreamExt};
use tokio::net::TcpStream;
use tokio_tungstenite::{
    accept_async, 
    tungstenite::Message,
    WebSocketStream
};
use ever_block::{
    error,
    fail,
    Result
};

/// ADNL WebSocket stream
pub struct AdnlWsStream {
    pub ws_stream: WebSocketStream<TcpStream>,
    pub timeouts: Timeouts,
    pub buffer: Vec<u8>, // Internal buffer for storing incoming WebSocket data
}

impl AdnlWsStream {
    /// Create a new ADNL WebSocket stream
    pub async fn new(stream: TcpStream, timeouts: &Timeouts) -> Result<Self> {
        let ws_stream = accept_async(stream).await.map_err(|e| {
            error!("WebSocket handshake error: {}", e)
        })?;
        
        Ok(Self {
            ws_stream,
            timeouts: timeouts.clone(),
            buffer: Vec::new(),
        })
    }

    /// Read data from the WebSocket stream
    pub async fn read(&mut self, buf: &mut Vec<u8>, len: usize) -> Result<()> {
        buf.resize(len, 0);
        
        // Check if we have enough data in the buffer
        while self.buffer.len() < len {
            // Need to read more data from WebSocket
            let timeout = tokio::time::timeout(
                self.timeouts.read(),
                self.ws_stream.next()
            ).await.map_err(|_| error!("WebSocket read timeout"))?;
            
            let message = timeout.ok_or_else(|| error!("WebSocket stream ended"))??;
            
            match message {
                Message::Binary(data) => {
                    log::info!("Received binary message len: {}", data.len());
                    // Append the new data to our buffer
                    self.buffer.extend_from_slice(&data);
                },
                Message::Close(_) => {
                    fail!("WebSocket connection closed by client")
                },
                _ => {
                    fail!("Expected binary message, got {:?}", message)
                }
            }
        }
        
        // Copy requested amount of data to the output buffer
        buf.copy_from_slice(&self.buffer[..len]);
        
        // Remove the read data from the buffer
        self.buffer.drain(0..len);
        
        Ok(())
    }

    /// Write data to the WebSocket stream
    pub async fn write(&mut self, buf: &mut Vec<u8>) -> Result<()> {
        let message = Message::Binary(buf.clone());
        
        tokio::time::timeout(
            self.timeouts.write(),
            self.ws_stream.send(message)
        ).await.map_err(|_| error!("WebSocket write timeout"))??;
        
        buf.truncate(0);
        Ok(())
    }

    /// Shutdown the WebSocket stream
    pub async fn shutdown(&mut self) -> Result<()> {
        let close_frame = Message::Close(None);
        
        tokio::time::timeout(
            self.timeouts.write(),
            self.ws_stream.send(close_frame)
        ).await.map_err(|_| error!("WebSocket close timeout"))??;
        
        Ok(())
    }
}