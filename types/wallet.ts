import { Keypair } from "@solana/web3.js"

export interface TokenMetadata {
  name: string
  symbol: string
  image?: string
  address: string
  imageUrls: string[]
}

export interface TokenInfo {
  mint: string
  balance: number
  decimals: number
  uiBalance: string
  metadata?: TokenMetadata
  tokenAccount: string
}

export interface WalletInput {
  id: string
  value: string
  type: 'privateKey' | 'seedPhrase'
  keypair?: Keypair
  publicKey?: string
  balance?: number
  tokens?: TokenInfo[]
  isValid?: boolean
  error?: string
  isSaved?: boolean
  tempValue?: string
  isEditing?: boolean
  isLoadingTokens?: boolean
} 