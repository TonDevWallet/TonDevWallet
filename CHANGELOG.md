# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.4] - 2024-05-07

### Updates
- Rewritten ui to use shadcn/ui
- HighloadV2R2 support
- HighloadV3 support
- MultisigV2 support
- Added custom network selector
- Improve network connectivity and reconnects

## [0.4.3] - 2023-12-15

### Updates
- Added new SendTransaction feature with maxMessages to tonconnect.
- Fixed empty name saved for new wallet from random generation.
- Wallet list now respects testnet flag for addresses.
- Transaction emulation preview now has a different background for testnet.

## [0.4.2] - 2023-07-28

### Added
 - Add option to automatically approve and send any message from selected session.
 - Change app name in TonConnect event to `tonkeeper`.

## [0.4.1] - 2023-07-15

### Added
 - Refactor login popup.
 - Remember last used wallet for website.
 - Allow to paste tonconnect links anywhere to initiate session.
 - Add fallback in case manifest cannot be reached.

## [0.4.0] - 2023-07-13

### Added
 - Move QRCode parser to rust side.
 - Allow to paste images of qrcodes to initiate tonconnect.
 - Bring to front on transactions and login attempts.
 - Fix no login screen on first start.

## [0.3.9] - 2023-05-27

### Added
 - Stack Trace Viewer for Emulated Transactions. Now you can view stack trace for transactions.
 