use crate::adnl_common::{
    AdnlCryptoUtils, AdnlHandshake, AdnlPeers, AdnlPingSubscriber, Query, Subscriber, Timeouts,
};
use aes_ctr::cipher::SyncStreamCipher;
use ever_block::{
    base64_encode, error, fail, Ed25519KeyOption, KeyId, KeyOption, KeyOptionJson, Result,
};
use futures::StreamExt;
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::{convert::TryInto, net::SocketAddr, sync::Arc, time::Duration};
use stream_cancel::{Trigger, Tripwire};
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::accept_async;
use ton_api::{deserialize_boxed, serialize_boxed_inplace, ton::adnl::Message as AdnlMessage};

use crate::adnl_ws_stream::AdnlWsStream;

pub(crate) const TARGET: &str = "adnl_ws";

/// ADNL WebSocket server configuration in JSON format
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
enum AdnlWsServerClients {
    Any,
    List(Vec<KeyOptionJson>),
}

/// ADNL WebSocket server configuration in JSON format
#[derive(Deserialize, Serialize)]
pub struct AdnlWsServerConfigJson {
    address: String,
    // clients: AdnlWsServerClients,
    server_key: KeyOptionJson,
    timeouts: Option<Timeouts>,
    /// Path for logging purposes only (not used for actual routing since we're using direct WebSockets)
    ws_path: Option<String>,
}

impl AdnlWsServerConfigJson {
    pub fn with_params(
        address: String,
        server_key: KeyOptionJson,
        client_keys: Vec<KeyOptionJson>,
        timeouts: Option<Timeouts>,
        ws_path: Option<String>,
    ) -> Self {
        AdnlWsServerConfigJson {
            address,
            // clients: AdnlWsServerClients::List(vec![]),
            server_key,
            timeouts,
            ws_path,
        }
    }
}

/// ADNL WebSocket server configuration
pub struct AdnlWsServerConfig {
    address: SocketAddr,
    clients: Arc<Option<lockfree::map::Map<[u8; 32], u8>>>,
    server_key: Arc<lockfree::map::Map<Arc<KeyId>, Arc<dyn KeyOption>>>,
    server_id: Arc<KeyId>,
    timeouts: Timeouts,
    ws_path: String,
}

impl AdnlWsServerConfig {
    /// Constructs from JSON data
    pub fn from_json(json: &str) -> Result<Self> {
        let json_config: AdnlWsServerConfigJson = serde_json::from_str(json)?;
        Self::from_json_config(&json_config)
    }

    /// Construct from JSON config structure
    pub fn from_json_config(json_config: &AdnlWsServerConfigJson) -> Result<Self> {
        let key = Ed25519KeyOption::from_private_key_json(&json_config.server_key)?;
        let server_key = lockfree::map::Map::new();
        let server_id = key.id().clone();
        server_key.insert(key.id().clone(), key);

        let clients = None;
        //  match &json_config.clients {
        //     AdnlWsServerClients::Any => None,
        //     AdnlWsServerClients::List(list) => {
        //         let clients = lockfree::map::Map::new();
        //         for key in list.iter() {
        //             let key = Ed25519KeyOption::from_public_key_json(key)?;
        //             let key = key.pub_key()?;
        //             if clients.insert(key.try_into()?, 0).is_some() {
        //                 fail!("Duplicated client key {} in server config", base64_encode(key))
        //             }
        //         }
        //         Some(clients)
        //     }
        // };

        let ret = AdnlWsServerConfig {
            address: json_config.address.parse()?,
            clients: Arc::new(clients),
            server_key: Arc::new(server_key),
            server_id,
            timeouts: if let Some(timeouts) = &json_config.timeouts {
                timeouts.clone()
            } else {
                Timeouts::default()
            },
            ws_path: json_config
                .ws_path
                .clone()
                .unwrap_or_else(|| "/adnl".to_string()),
        };

        Ok(ret)
    }

    /// Get timeouts
    pub fn timeouts(&self) -> &Timeouts {
        &self.timeouts
    }

    /// Get server ID
    pub fn server_id(&self) -> &[u8; 32] {
        self.server_id.data()
    }
}

/// ADNL WebSocket stream cryptographic context
struct AdnlWsStreamCrypto {
    cipher_recv: aes_ctr::Aes256Ctr,
    cipher_send: aes_ctr::Aes256Ctr,
}

impl AdnlWsStreamCrypto {
    /// Construct as server
    pub fn with_nonce_as_server(nonce: &mut [u8; 160]) -> Self {
        /* Clear nonce */
        let ret = Self {
            cipher_recv: AdnlCryptoUtils::build_cipher_unsecure(nonce, 32..64, 80..96),
            cipher_send: AdnlCryptoUtils::build_cipher_unsecure(nonce, 0..32, 64..80),
        };
        nonce.iter_mut().for_each(|a| *a = 0);
        ret
    }

    /// Send data in-place
    pub async fn send(&mut self, stream: &mut AdnlWsStream, buf: &mut Vec<u8>) -> Result<()> {
        let nonce: [u8; 32] = rand::thread_rng().gen();
        let len = buf.len();
        buf.reserve(len + 68);
        buf.resize(len + 36, 0);
        buf[..].copy_within(..len, 36);
        buf[..4].copy_from_slice(&((len + 64) as u32).to_le_bytes());
        buf[4..36].copy_from_slice(&nonce);
        buf.extend_from_slice(&AdnlCryptoUtils::calc_checksum(&None, &buf[4..]));
        // StreamCipher::apply_keystream(&mut self.cipher_send, &mut buf[..]);
        self.cipher_send.apply_keystream(&mut buf[..]);
        stream.write(buf).await?;
        Ok(())
    }

    /// Receive data
    pub async fn receive(&mut self, buf: &mut Vec<u8>, stream: &mut AdnlWsStream) -> Result<()> {
        log::info!("Receiving ADNL message");
        stream.read(buf, 4).await?;
        log::info!("Got 4 bytes");
        self.cipher_recv.apply_keystream(&mut buf[..4]);
        let length = u32::from_le_bytes([buf[0], buf[1], buf[2], buf[3]]) as usize;
        log::info!("Length: {}", length);
        if length < 64 {
            fail!("Too small size for ANDL packet: {}", length);
        }
        log::info!("Reading length bytes");
        stream.read(buf, length).await?;
        log::info!("Read length bytes");
        self.cipher_recv.apply_keystream(&mut buf[..length]);
        log::info!("Applied keystream");
        if !AdnlCryptoUtils::calc_checksum(&None, &buf[..length - 32]).eq(&buf[length - 32..length])
        {
            fail!("Bad checksum for ANDL packet");
        }
        buf.truncate(length - 32);
        buf.drain(..32);
        Ok(())
    }
}

/// ADNL WebSocket server thread (one connection)
struct AdnlWsServerThread;

impl AdnlWsServerThread {
    fn spawn(
        stream: TcpStream,
        config: &AdnlWsServerConfig,
        subscribers: Arc<Vec<Arc<dyn Subscriber>>>,
    ) {
        let clients = config.clients.clone();
        let key = config.server_key.clone();
        let timeouts = config.timeouts.clone();

        tokio::spawn(async move {
            let ws_stream = match AdnlWsStream::new(stream, &timeouts).await {
                Ok(stream) => stream,
                Err(e) => {
                    log::warn!(target: TARGET, "WebSocket handshake error: {}", e);
                    return;
                }
            };

            if let Err(e) = AdnlWsServerThread::run(ws_stream, key, clients, subscribers).await {
                log::warn!(target: TARGET, "ADNL WebSocket server ERROR --> {}", e);
                return;
            }

            unreachable!();
        });
    }

    async fn run(
        mut stream: AdnlWsStream,
        key: Arc<lockfree::map::Map<Arc<KeyId>, Arc<dyn KeyOption>>>,
        clients: Arc<Option<lockfree::map::Map<[u8; 32], u8>>>,
        subscribers: Arc<Vec<Arc<dyn Subscriber>>>,
    ) -> Result<()> {
        let mut buf = Vec::with_capacity(256);

        // Read the ADNL handshake data
        stream.read(&mut buf, 256).await?;

        if let Some(clients) = clients.as_ref() {
            // Check known client if any
            if buf.len() < 64 {
                fail!("ADNL init message is too short ({})", buf.len())
            }
            if !clients.iter().any(|client| &buf[32..64] == client.key()) {
                fail!(
                    "Message from unknown client {}",
                    base64_encode(&buf[32..64])
                )
            }
        }

        let (mut crypto, peers) = Self::parse_init_packet(&key, &mut buf)?;

        buf.truncate(0);
        crypto.send(&mut stream, &mut buf).await?;

        log::info!("Handshake sent");

        loop {
            log::info!("Receiving ADNL message");
            crypto.receive(&mut buf, &mut stream).await?;
            log::info!("ADNL message received");

            let msg = deserialize_boxed(&buf[..])?
                .downcast::<AdnlMessage>()
                .map_err(|msg| error!("Unsupported ADNL message {:?}", msg))?;

            log::info!("Received ADNL message: {:?}", msg);

            let answer = match &msg {
                AdnlMessage::Adnl_Message_Query(query) => {
                    Query::process_adnl(&subscribers, query, &peers).await?
                }
                _ => None,
            };

            if let Some(answer) = answer {
                let msg = match answer.try_finalize()? {
                    (Some(answer), _) => answer.wait().await?,
                    (None, msg) => msg,
                };

                if let Some(msg) = msg {
                    serialize_boxed_inplace(&mut buf, &msg.object)?;
                    crypto.send(&mut stream, &mut buf).await?;
                }
            } else {
                fail!("Unexpected ADNL message {:?}", msg);
            }
        }
    }

    fn parse_init_packet(
        key: &lockfree::map::Map<Arc<KeyId>, Arc<dyn KeyOption>>,
        buf: &mut Vec<u8>,
    ) -> Result<(AdnlWsStreamCrypto, AdnlPeers)> {
        let other_key = buf[32..64].try_into()?;
        let (local_key, version) = AdnlHandshake::parse_packet(key, buf, Some(160), false)?;

        let local_key =
            local_key.ok_or_else(|| error!("Unknown ADNL server key, cannot decrypt"))?;

        if version.is_some() {
            fail!("Unsupported ADNL versioning {} in WebSocket connection")
        }

        let other_key = Ed25519KeyOption::from_public_key(&other_key).id().clone();

        crate::dump!(trace, TARGET, "Nonce", &buf[..160]);

        let nonce: &mut [u8; 160] = buf.as_mut_slice().try_into()?;
        let ret = AdnlWsStreamCrypto::with_nonce_as_server(nonce);

        buf.drain(0..160);

        Ok((ret, AdnlPeers::with_keys(local_key, other_key)))
    }
}

/// ADNL WebSocket server
pub struct AdnlWsServer(Trigger);

impl AdnlWsServer {
    const TIMEOUT_SHUTDOWN: u64 = 100; // Milliseconds

    /// Listen to WebSocket connections
    pub async fn listen(
        config: AdnlWsServerConfig,
        mut subscribers: Vec<Arc<dyn Subscriber>>,
    ) -> Result<Self> {
        let (trigger, tripwire) = Tripwire::new();

        subscribers.push(Arc::new(AdnlPingSubscriber));
        let subscribers = Arc::new(subscribers);

        // Use tokio TcpListener directly since we have issues with hyper integration
        let listener = TcpListener::bind(config.address).await?;

        log::info!(
            target: TARGET,
            "ADNL WebSocket server listening on {} with path {}",
            config.address,
            config.ws_path
        );

        // Use the websocket-only approach, without HTTP routing
        let config_arc = Arc::new(config);

        tokio::spawn(async move {
            let mut incoming =
                tokio_stream::wrappers::TcpListenerStream::new(listener).take_until(tripwire);

            while let Some(Ok(stream)) = incoming.next().await {
                let peer_addr = stream
                    .peer_addr()
                    .unwrap_or_else(|_| "Unknown".parse().unwrap());
                log::debug!(target: TARGET, "New connection from {}", peer_addr);

                let config = config_arc.clone();
                let subscribers = subscribers.clone();

                tokio::spawn(async move {
                    // Accept WebSocket connection
                    match accept_async(stream).await {
                        Ok(ws_stream) => {
                            // Create AdnlWsStream
                            let adnl_ws_stream = AdnlWsStream {
                                ws_stream,
                                timeouts: config.timeouts().clone(),
                                buffer: Vec::new(),
                            };

                            if let Err(e) = AdnlWsServerThread::run(
                                adnl_ws_stream,
                                config.server_key.clone(),
                                config.clients.clone(),
                                subscribers,
                            )
                            .await
                            {
                                log::warn!(target: TARGET, "ADNL WebSocket server ERROR --> {}", e);
                            }
                        }
                        Err(e) => {
                            log::warn!(target: TARGET, "WebSocket handshake error: {}", e);
                        }
                    }
                });
            }
        });

        Ok(Self(trigger))
    }

    /// Shutdown server
    pub async fn shutdown(self) {
        drop(self.0);
        tokio::time::sleep(Duration::from_millis(Self::TIMEOUT_SHUTDOWN)).await;
    }
}

// Update the Clone implementation
impl Clone for AdnlWsServerConfig {
    fn clone(&self) -> Self {
        AdnlWsServerConfig {
            address: self.address,
            clients: self.clients.clone(),
            server_key: self.server_key.clone(),
            server_id: self.server_id.clone(),
            timeouts: self.timeouts.clone(),
            ws_path: self.ws_path.clone(),
        }
    }
}
