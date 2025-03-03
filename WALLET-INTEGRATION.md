# Wallet Integration with Reown AppKit

This document outlines the wallet integration implemented in the Solana Wallet Consolidator application using Reown's AppKit.

## Overview

The wallet integration allows users to connect their Solana wallets to the application, providing a seamless experience for wallet management and token consolidation.

## Setup

1. Copy `.env.local.example` to `.env.local` and add your Reown project ID:
   ```
   NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id_here
   ```

2. Get your project ID by signing up at [Reown Cloud](https://cloud.reown.com)

## Components

### 1. Wallet Hook (`hooks/useWallet.tsx`)

The core of the wallet integration is the `useWallet` hook, which:

- Creates a context to manage wallet state globally
- Handles wallet connection and disconnection
- Provides wallet status (connected, connecting, disconnecting)
- Exposes the wallet's public key
- Uses Reown's AppKit hooks for wallet state management

### 2. Wallet Connect Button (`components/wallet-connect-button.tsx`)

A reusable UI component that:

- Displays "Connect Wallet" when no wallet is connected
- Shows the connected wallet address (abbreviated) when connected
- Provides a dropdown menu for wallet actions (copy address, disconnect)
- Uses the magical theme styling consistent with the application

### 3. AppKit Provider Integration (`app/layout.tsx`)

The AppKit provider is integrated at the root layout level, ensuring wallet connectivity is available throughout the application.

## Supported Wallets

The integration supports Solana wallets:

- Phantom
- Solflare

Additional wallets can be added by updating the wallets array in the SolanaAdapter configuration.

## Usage

To use the wallet functionality in any component:

```tsx
import { useWallet } from '@/hooks/useWallet';

function MyComponent() {
  const { connected, publicKey, connect, disconnect } = useWallet();
  
  // Use wallet state and functions
  return (
    <div>
      {connected ? (
        <p>Connected: {publicKey}</p>
      ) : (
        <button onClick={connect}>Connect</button>
      )}
    </div>
  );
}
```

## Benefits

1. **Persistent Connection**: The wallet connection persists across page refreshes
2. **Global State**: Wallet state is available throughout the application
3. **User-Friendly UI**: Intuitive UI for connecting and managing wallets
4. **Consistent Styling**: Wallet UI elements match the application's magical theme
5. **Multiple Wallet Support**: Users can choose from various wallet providers 