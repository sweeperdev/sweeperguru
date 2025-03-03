'use client'

import { createAppKit, AppKit } from '@reown/appkit/react'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'
import { solana } from '@reown/appkit/networks'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'

// Add type declaration for window.reown
declare global {
  interface Window {
    reown?: AppKit;
  }
}

let appKit: AppKit | undefined = undefined;

// Initialize AppKit only on the client side
if (typeof window !== 'undefined') {
  try {
    // 0. Set up Solana Adapter
    const solanaWeb3JsAdapter = new SolanaAdapter({
      wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
    })

    // 1. Get projectId from .env.local
    const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || 'fe395a34687763344cbe5b814dedca78'

    // 2. Create a metadata object
    const metadata = {
      name: 'sweeper.guru',
      description: 'Claim dust and get 0.002 SOL for every token you have',
      url: 'https://sweeper.guru', // Update with your actual domain
      icons: ['https://sweeper.guru/favicon.ico'] // Update with your actual icon
    }

    // 3. Create AppKit instance
    appKit = createAppKit({
      adapters: [solanaWeb3JsAdapter],
      networks: [solana],
      metadata: metadata,
      projectId,
      features: {
        history: true,
        analytics: true,
        allWallets: true,
        emailShowWallets: true,
        socials: ['discord', 'x', 'google', 'apple']
      }
    })

    // Assign to window.reown for global access
    window.reown = appKit;

    console.log('Reown AppKit initialized with project ID:', projectId)
  } catch (error) {
    console.error('Failed to initialize Reown AppKit:', error)
  }
}

export { appKit }; 