# TonDevWallet

TonDevWallet is a wallet designed to simplify the development process for the TON Blockchain. It provides extensive tools and features to streamline your Ton development experience. With TonDevWallet, you can easily manage multiple private keys, create multiple wallets, and leverage the capabilities of TonConnect. Additionally, it offers local transaction emulation for previewing transaction results before executing them on the TON.

## Features
 - **TonConnect Integration**: TonDevWallet seamlessly integrates with TonConnect, allowing you to connect your wallet to Ton-compatible websites with ease.
 - **Multiple Private Keys**: Store and manage multiple private keys within TonDevWallet, giving you the flexibility to access and control various accounts.
 - **Wallet Creation**: Create multiple wallets within TonDevWallet, enabling you to organize and manage different sets of accounts for your TON development projects.
 - **Local Transaction Emulation***: TonDevWallet supports local transaction emulation, which allows you to preview the results of transactions before executing them on the TON Blockchain. This feature helps you ensure the correctness of your transactions before submitting them to the blockchain.

![241359698-034410bc-f059-4d61-ad3f-e70b5985dcc6](https://github.com/TonDevWallet/TonDevWallet/assets/5431520/1fb51855-3fce-49c4-b044-232c4c8a71d1)
![241359899-24b62444-e97a-4b53-ad8c-4bf4ce7dbb8a](https://github.com/TonDevWallet/TonDevWallet/assets/5431520/acdc509a-46e2-4e06-92b4-32f198823950)
![241359827-040bf0c4-b54d-48e4-b763-082a4a9e5cdf](https://github.com/TonDevWallet/TonDevWallet/assets/5431520/7a5dd286-8f99-4fed-88e2-e87527a553a0)



## Using TonConnect
To connect to TonConnect supporting DApp, follow these steps:
1. Select Tonkeeper in wallets list to display connection QR Code.
2. In the TonDevWallet sidebar, locate and click the "TonConnect" button.
3. TonDevWallet will automatically scan the QR Code displayed on your screen and establish a connection.

##  Changelog
See the [CHANGELOG.md](CHANGELOG.md) file for details on recent updates, improvements, and bug fixes made to TonDevWallet.

## Disclaimer
TonDevWallet is provided "as is" without any warranty. Use it at your own risk. We are not responsible for any loss or damage caused by the use of TonDevWallet. Be cautious and take appropriate measures to secure your private keys and protect your funds.

# ADNL WebSocket Server

This project implements a WebSocket-based variant of the ADNL (Abstract Datagram Network Layer) protocol, which is used in TON (The Open Network) blockchain.

## Overview

The ADNL protocol typically uses direct TCP connections for communication between nodes. This implementation adapts ADNL to work over WebSockets, allowing browsers and other WebSocket-capable clients to connect to ADNL servers.

## Features

- **WebSocket Compatibility**: Allows browsers and web applications to communicate using ADNL protocol
- **Full ADNL Protocol Support**: Maintains all security and functionality of the original ADNL protocol
- **CORS Support**: Configurable cross-origin resource sharing for web applications
- **Path-Based Routing**: Configurable WebSocket path for the ADNL endpoint
- **Encrypted Communication**: Uses the same encryption mechanisms as standard ADNL

## Architecture

The ADNL WebSocket server consists of several key components:

1. **HTTP/WebSocket Server**: Accepts HTTP connections and upgrades them to WebSocket connections
2. **ADNL Protocol Handler**: Processes ADNL handshakes and message exchanges
3. **Cryptographic Layer**: Handles encryption/decryption of ADNL messages
4. **Subscriber System**: Allows registering handlers for different types of ADNL messages

## Usage

### Server Configuration

The server can be configured using JSON:

```json
{
  "address": "127.0.0.1:8080",
  "clients": "any",  // or a list of allowed client keys
  "server_key": {
    "type": "ed25519",
    "pub": "base64_encoded_public_key",
    "pvt": "base64_encoded_private_key"
  },
  "ws_path": "/adnl",
  "cors_origins": ["*"]  // or specific origins
}
```

### Starting the Server

```rust
use adnl_ws::{AdnlWsServer, AdnlWsServerConfig};

async fn start_server() {
    let config = AdnlWsServerConfig::from_json(config_json)?;
    let subscribers = Vec::new(); // Add actual subscribers if needed
    let server = AdnlWsServer::listen(config, subscribers).await?;
    
    // Keep server running until shutdown signal
    tokio::signal::ctrl_c().await.unwrap();
    server.shutdown().await;
}
```

### Client-Side Usage

The `src/client-example.js` file provides a JavaScript implementation that can be used in browsers or Node.js to connect to the ADNL WebSocket server:

```javascript
const client = new AdnlWebSocketClient(
  'ws://localhost:8080/adnl',
  { publicKey, privateKey },
  serverPublicKey
);

await client.connect();
const response = await client.sendQuery(query);
client.disconnect();
```

## Edge Cases and Handling

The implementation addresses several edge cases:

1. **Connection drops**: The server gracefully handles dropped connections
2. **WebSocket protocol violations**: Properly validates WebSocket frames
3. **Invalid ADNL messages**: Performs thorough validation of ADNL protocol messages
4. **CORS constraints**: Configurable CORS headers for browser compatibility
5. **Concurrent connections**: Uses Tokio for efficient async handling of many connections

## Security Considerations

- The implementation maintains the same security properties as standard ADNL
- Supports client authentication through public keys
- Uses the same cryptographic primitives as the TCP version
- WebSocket-specific security measures for browser contexts

## Dependencies

- `tokio`: For async runtime
- `hyper`: For HTTP server capabilities
- `tokio-tungstenite`: For WebSocket support
- `ton_api`: For TON API definitions
- `ever_block`: For cryptographic utilities
- Additional support libraries for handling connections

## Limitations

- Performance overhead compared to direct TCP due to WebSocket framing
- WebSocket protocol limitations on frame sizes and control messages
- Browser security restrictions for web clients

## Future Improvements

- WebSocket extensions for compression
- Performance optimizations
- Support for additional ADNL features
- Binary protocol optimizations
