# @tondevwallet/traces

A library for sending transaction traces to the TON DevWallet.

## Installation

```bash
npm install @tondevwallet/traces
# or
yarn add @tondevwallet/traces
# or
pnpm add @tondevwallet/traces
```

## Usage

```typescript
import { SendDumpToDevWallet, TraceDump } from '@tondevwallet/traces';

// Create a trace dump
const dump: TraceDump = {
  // Your trace dump data
};

// Send the dump to TON DevWallet
SendDumpToDevWallet(dump);
```

## Requirements

This package requires the following peer dependencies:
- `@ton/core`: ^0.60.1
- `@ton/crypto`: ^3.3.0

## License

MIT 