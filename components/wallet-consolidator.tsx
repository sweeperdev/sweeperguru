"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Icons } from "@/components/ui/icons"

import { 
  TOKEN_PROGRAM_ID, 
  createCloseAccountInstruction, 
  createTransferInstruction,
  createBurnInstruction, // <-- NEW IMPORT
  
} from "@solana/spl-token";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { createConsolidateInstructions, simulateTransaction } from "@/services/transaction-simulation"
import { toast } from "@/components/ui/use-toast"
import { useWallet } from "@/hooks/useWallet"
import {  useAppKitProvider } from '@reown/appkit/react'
import { type Provider } from '@reown/appkit-adapter-solana/react'
import useDebounce from "@/hooks/useDebounce"

const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const MAINNET_NODES = [
  "https://mainnet.helius-rpc.com/?api-key=de28aa1a-ca50-4ef8-863d-d5d0b940a28c",
];

// Test each RPC endpoint and return the fastest one
const getBestRpcEndpoint = async () => {
  const testResults = await Promise.all(
    MAINNET_NODES.map(async (endpoint) => {
      const start = Date.now();
      try {
        const connection = new Connection(endpoint, "confirmed");
        await connection.getSlot(); // Simple test request
        const latency = Date.now() - start;
        console.log(`${endpoint} latency: ${latency}ms`);
        return { endpoint, latency, working: true };
      } catch {
        return { endpoint, latency: Infinity, working: false };
      }
    })
  );

  const bestEndpoint = testResults
    .filter(result => result.working)
    .sort((a, b) => a.latency - b.latency)[0];
  
  return bestEndpoint?.endpoint || MAINNET_NODES[0];
};

interface TokenMetadata {
  name: string
  symbol: string
  image?: string
  address: string
  imageUrls: string[]
}

interface TokenInfo {
  mint: string
  balance: number
  decimals: number
  uiBalance: string
  metadata?: TokenMetadata
  tokenAccount: string // Store token account address for closing
}



const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.ipfs.io/ipfs/',
  'https://ipfs.fleek.co/ipfs/'
];

const transformUri = (uri: string): string[] => {
  let hash = uri;
  
  // Handle ipfs:// protocol
  if (uri.startsWith('ipfs://')) {
    hash = uri.replace('ipfs://', '');
  }
  // Handle full IPFS gateway URLs
  else if (uri.includes('/ipfs/')) {
    hash = uri.split('/ipfs/')[1];
  }
  // Handle Arweave
  else if (uri.startsWith('ar://')) {
    return [`https://arweave.net/${uri.slice(5)}`];
  }
  
  // If we have an IPFS hash (either directly or extracted)
  if (hash.startsWith('Qm') || hash.startsWith('bafy')) {
    return IPFS_GATEWAYS.map(gateway => `${gateway}${hash}`);
  }
  
  // Return original URI if no patterns match
  return [uri];
}

const tryFetchFromMultipleUrls = async (urls: string[]): Promise<Response> => {
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
    } catch (error) {
      console.warn(`Failed to fetch from ${url}:`, error);
    }
  }
  throw new Error('Failed to fetch from all available URLs');
}

const fetchJsonMetadata = async (uri: string) => {
  try {
    const urls = transformUri(uri);
    const response = await tryFetchFromMultipleUrls(urls);
    const data = await response.json();
    
    // Transform image URL if it exists
    let imageUrls: string[] = [];
    if (data.image) {
      // If the image URL contains /ipfs/ or starts with ipfs://, transform it
      imageUrls = transformUri(data.image);
    }

    return {
      name: data.name,
      symbol: data.symbol,
      image: imageUrls[0] || data.image || '',
      imageUrls // Store all possible URLs for fallback
    };
  } catch (error) {
    console.error('Failed to fetch JSON metadata:', error);
    return null;
  }
}

// Add this helper function for better transaction confirmation
const confirmTransaction = async (connection: Connection, signature: string, timeout = 30000) => {
  let done = false;
  const status: { value?: { err?: Error; confirmationStatus?: string } } | null = null;
  const startTime = Date.now();

  do {
    const status = await connection.getSignatureStatus(signature);
    
    if (status?.value?.err) {
      toast({
        title: "Transaction failed",
        description: `Transaction failed: ${status.value.err.toString()}`,
        duration: 3000,
      });
    }
    
    if (status?.value?.confirmationStatus === "confirmed" || status?.value?.confirmationStatus === "finalized") {
      done = true;
      break;
    }

    // Sleep for a second before retrying
    await new Promise(resolve => setTimeout(resolve, 1000));
  } while (!done && Date.now() - startTime < timeout);

  if (!done) {
    throw new Error(`Transaction confirmation timeout after ${timeout}ms`);
  }

  return status;
}

// Add these new interfaces after the existing interfaces
interface BalanceChange {
  address: string
  oldBalance: number
  newBalance: number
  change: number
}

interface SimulationResult {
  success: boolean
  balanceChanges: BalanceChange[]
  error?: string
}

const isValidUint8ArrayString = (value: string): boolean => {
  try {
    // Check if it's a valid Solana address (base58 encoded string of length 44 or 43)
    // Solana addresses are typically 44 characters long, but some may be 43
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;
    return base58Regex.test(value);
  } catch {
    return false;
  }
};

// Add back the TokenDisplay component that was removed in the previous edit
interface TokenDisplayProps {
  token: TokenInfo
  onClose?: () => void
  isSelected?: boolean
  onSelect?: (selected: boolean) => void
  showCheckbox?: boolean
}

function TokenDisplay({ token, onClose, isSelected, onSelect, showCheckbox }: TokenDisplayProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="group flex items-center gap-2 p-2 rounded-lg hover:bg-primary/5 transition-colors">
            <div className="flex items-center gap-2 flex-1">
              {showCheckbox && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={onSelect}
                  onClick={(e) => e.stopPropagation()}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              )}
              {token.metadata?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={token.metadata.image} 
                  alt={token.metadata.name} 
                  className="w-6 h-6 rounded-full"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    const urls = token.metadata?.imageUrls || [];
                    const currentIndex = urls.indexOf(img.src);
                    if (currentIndex < urls.length - 1) {
                      img.src = urls[currentIndex + 1];
                    } else {
                      img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMjJDMTcuNTIyOCAyMiAyMiAxNy41MjI4IDIyIDEyQzIyIDYuNDc3MTUgMTcuNTIyOCAyIDEyIDJDNi40NzcxNSAyIDIgNi40NzcxNSAyIDEyQzIgMTcuNTIyOCA2LjQ3NzE1IDIyIDEyIDIyWiIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==';
                      img.className = img.className + ' opacity-50';
                    }
                  }}
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icons.token className="w-3 h-3 text-primary/50" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {token.metadata?.symbol || "???"}
                </Badge>
                <span className="text-sm font-medium">
                  {token.uiBalance}
                </span>
              </div>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-destructive/5 text-destructive"
              >
                <Icons.trash className="w-3 h-3 mr-1" />
                Close
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          align="center" 
          className="max-w-[300px] z-50"
          sideOffset={5}
          alignOffset={0}
          avoidCollisions={true}
        >
          <div className="space-y-2">
            <p className="font-medium">{token.metadata?.name || "Unknown Token"}</p>
            <p className="text-xs text-muted-foreground break-all">{token.mint}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default function WalletConsolidator() {
  const { connected, publicKey } = useWallet()
  const { walletProvider } = useAppKitProvider<Provider>('solana')
  
  const [mounted, setMounted] = useState(false)
  const [destinationWallet, setDestinationWallet] = useState<string>("")
  const [isEditingDestination, setIsEditingDestination] = useState(false)
  const [tempDestination, setTempDestination] = useState<string>("")
  const [connection, setConnection] = useState(() => new Connection(MAINNET_NODES[0]));
  const [selectedTransfers, setSelectedTransfers] = useState<Set<string>>(new Set())
  const [selectedCloses, setSelectedCloses] = useState<Set<string>>(new Set())
  const [isProcessingTokens, setIsProcessingTokens] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isSimulating, setIsSimulating] = useState(false);
  const [useConnectedWallet, setUseConnectedWallet] = useState(true)
  const [walletBalances, setWalletBalances] = useState<{
    [wallet: string]: {
      sol: number;
      tokens: TokenInfo[];
      isLoading: boolean;
    }
  }>({});
  const [isProcessingCloses, setIsProcessingCloses] = useState(false);
  const [showBurnConfirm, setShowBurnConfirm] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now())
  const [refreshCooldown, setRefreshCooldown] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSelectAll = (type: 'tokens' | 'empty') => {
    if (!connected || !publicKey) return;
    
    const walletAddress = publicKey.toString();
    const tokens = walletBalances[walletAddress]?.tokens || [];
    
    switch (type) {
      case 'tokens':
        setSelectedTransfers(new Set(
          tokens
            .filter(t => Number(t.balance) > 0)
            .map(t => t.tokenAccount)
        ));
        break;
      case 'empty':
        setSelectedCloses(new Set(
          tokens
            .filter(t => Number(t.balance) === 0)
            .map(t => t.tokenAccount)
        ));
        break;
    }
  };
  const fetchWalletBalances = async (wallet: string, silent = false) => {
    if (!isValidUint8ArrayString(wallet)) return;
    
    // Only update loading state if not in silent mode
    if (!silent) {
      setWalletBalances(prev => ({
        ...prev,
        [wallet]: {
          ...(prev[wallet] || { sol: 0, tokens: [] }),
          isLoading: true
        }
      }));
    }
    
    try {
      // Fetch SOL balance
      const publicKey = new PublicKey(wallet);
      const solBalance = await connection.getBalance(publicKey, 'processed') / LAMPORTS_PER_SOL;
      
      // Fetch token accounts
      const tokens = await fetchTokenAccounts(wallet);
      
      // Update balances
      setWalletBalances(prev => ({
        ...prev,
        [wallet]: {
          sol: solBalance,
          tokens,
          isLoading: false
        }
      }));
    } catch (error) {
      console.error("Error fetching wallet balances:", error);
      
      // Update error state
      setWalletBalances(prev => ({
        ...prev,
        [wallet]: {
          ...(prev[wallet] || { sol: 0, tokens: [] }),
          isLoading: false
        }
      }));
      
      if (!silent) {
        toast({
          title: "Error",
          description: `Failed to fetch balances for wallet ${wallet.slice(0, 6)}...${wallet.slice(-6)}`,
          variant: "error",
          duration: 3000,
        });
      }
    }
  };

  const handleRefresh = useCallback(() => {
    if (refreshCooldown || !connected || !publicKey) return;
    
    // Set cooldown
    setRefreshCooldown(true);
    
    // Fetch wallet balances
    fetchWalletBalances(publicKey.toString(), false);
    setLastRefreshTime(Date.now());
    
    // Reset cooldown after 5 seconds
    setTimeout(() => {
      setRefreshCooldown(false);
    }, 5000);
  }, [connected, publicKey, refreshCooldown, fetchWalletBalances]);

  // Format time function
  const formatLastCheckedTime = (timestamp: number) => {
    const diffSeconds = Math.floor((currentTime - timestamp) / 1000);
    
    if (diffSeconds < 10) return "just now";
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return `${Math.floor(diffSeconds / 3600)}h ago`;
  };

  // Update connection to best endpoint after mount
  useEffect(() => {
    getBestRpcEndpoint().then(endpoint => {
      setConnection(new Connection(endpoint));
    });
  }, []);

  // Handle initial localStorage load after mount
  useEffect(() => {
    const savedWallet = localStorage.getItem('destinationWallet')
    if (savedWallet) {
      setDestinationWallet(savedWallet)
      setUseConnectedWallet(false)
    } else {
      setUseConnectedWallet(true)
    }
    setMounted(true)
  }, [])

  // Save destination wallet to localStorage whenever it changes
  useEffect(() => {
    if (mounted && destinationWallet) {
      localStorage.setItem('destinationWallet', destinationWallet)
    }
  }, [destinationWallet, mounted])

  // Add a useEffect to fetch wallet balances when connected
  useEffect(() => {
    if (connected && publicKey && mounted) {
      fetchWalletBalances(publicKey.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, mounted, connection]);

  // Now update the debounced refresh function to use silent mode
  const debouncedRefresh = useDebounce((walletAddress: string) => {
    if (walletAddress && isValidUint8ArrayString(walletAddress)) {
      fetchWalletBalances(walletAddress, true); // Pass true for silent mode
      setLastRefreshTime(Date.now());
    }
  }, 1000);
  
  // Memoized refresh function to avoid recreating on every render
  const refreshWalletBalances = useCallback(() => {
    if (connected && publicKey) {
      debouncedRefresh(publicKey.toString());
    }
  }, [connected, publicKey, debouncedRefresh]);
  
  // Also, let's increase the refresh interval to be less intrusive
  useEffect(() => {
    if (!connected || !publicKey || !mounted) return;
    
    // Initial fetch happens via the main useEffect that runs on connection change
    
    // Set up interval for periodic refresh (increased to 30 seconds)
    const intervalId = setInterval(() => {
      refreshWalletBalances();
    }, 10000); // 30 seconds
    
    return () => clearInterval(intervalId);
  }, [connected, publicKey, mounted, refreshWalletBalances]);

  // Add this useEffect to update the current time every second
  useEffect(() => {
    setCurrentTime(Date.now());
    
    timerRef.current = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Prevent hydration errors by not rendering until mounted
  if (!mounted) {
    return null
  }

  const handleEditDestination = () => {
    setTempDestination(destinationWallet)
    setIsEditingDestination(true)
    setUseConnectedWallet(false)
  }

  const handleSaveDestination = () => {
    if (isValidUint8ArrayString(tempDestination)) {
      // It's a valid Solana address
      setDestinationWallet(tempDestination);
      setIsEditingDestination(false);
      setUseConnectedWallet(false);
      
      // Show confirmation toast
      toast({
        title: "Destination wallet set",
        description: `Wallet ${tempDestination.slice(0, 6)}...${tempDestination.slice(-6)} set as destination`,
        duration: 3000,
      });
    } else {
      // Show error toast
      toast({
        title: "Invalid address",
        description: "Please enter a valid Solana wallet address",
        duration: 3000,
      });
    }
  }

  const handleUseConnectedWallet = () => {
    if (connected && publicKey) {
      setDestinationWallet(publicKey.toString());
      setUseConnectedWallet(true);
      localStorage.removeItem('destinationWallet'); // Clear saved wallet since we're using connected
    }
  }

  const handleClearDestination = () => {
    setDestinationWallet("");
    localStorage.removeItem('destinationWallet');
    setUseConnectedWallet(true);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleConsolidate = async () => {
    if (!connected || !publicKey) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to continue",
        duration: 3000,
      });
      return;
    }
    
    const targetWallet = useConnectedWallet ? publicKey.toString() : destinationWallet;
    
    if (!targetWallet) {
      toast({
        title: "No destination wallet",
        description: "Please set a destination wallet or use your connected wallet",
        duration: 3000,
      });
      return;
    }
    
    try {
      setIsSimulating(true);
      const destinationPubkey = new PublicKey(targetWallet);
      
      // Create all instructions
      const { instructions, signers } = await createConsolidateInstructions(
        connection,
        [], // walletInputs - Not needed anymore
        destinationPubkey,
        new Set(), // selectedSolBalances - Not needed anymore
        selectedTransfers,
        selectedCloses
      );

      // Simulate first
      const simulation = await simulateTransaction(
        connection,
        instructions,
        signers,
        [], // walletInputs - Not needed anymore
        targetWallet
      );

      setSimulationResult(simulation);
      setIsSimulating(false);

      if (!simulation.success) {
        const errorMessage = typeof simulation.error === 'string' 
          ? simulation.error 
          : 'Simulation failed';
        throw new Error(errorMessage);
      }
    } catch (error: unknown) {
      console.error('Consolidation failed:', error);
      setSimulationResult({
        success: false,
        balanceChanges: [],
        error: error instanceof Error ? error.message : 'Simulation failed'
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const fetchTokenMetadata = async (mint: string): Promise<TokenMetadata | undefined> => {
    try {
      const mintPubkey = new PublicKey(mint);
      const [metadataAddress] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          mintPubkey.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      );

      const accountInfo = await connection.getAccountInfo(metadataAddress);
      if (!accountInfo) return undefined;

      // Get the metadata account data
      const metadataAccountData = accountInfo.data;
      
      // First byte is the version, next 32 bytes are the update authority
      let offset = 1 + 32;
      
      // Next 32 bytes are the mint address
      offset += 32;
      
      // Read name length (u32 LE) and name string
      const nameLength = Math.min(metadataAccountData.readUInt32LE(offset), 32);
      offset += 4;
      const name = metadataAccountData.slice(offset, offset + nameLength).toString('utf8').replace(/\0/g, '');
      offset += nameLength;
      
      // Read symbol length (u32 LE) and symbol string
      const symbolLength = Math.min(metadataAccountData.readUInt32LE(offset), 10);
      offset += 4;
      const symbol = metadataAccountData.slice(offset, offset + symbolLength).toString('utf8').replace(/\0/g, '');
      offset += symbolLength;
      
      // Read uri length (u32 LE) and uri string
      const uriLength = Math.min(metadataAccountData.readUInt32LE(offset), 200);
      offset += 4;
      const uri = metadataAccountData.slice(offset, offset + uriLength).toString('utf8').replace(/\0/g, '');

      // If we have a URI, fetch the JSON metadata
      let jsonMetadata = null;
      if (uri) {
        try {
          jsonMetadata = await fetchJsonMetadata(uri);
        } catch (error) {
          console.error('Failed to fetch JSON metadata:', error);
        }
      }

      return {
        name: jsonMetadata?.name || name,
        symbol: jsonMetadata?.symbol || symbol,
        image: jsonMetadata?.image,
        address: mint,
        imageUrls: jsonMetadata?.imageUrls || []
      };
    } catch (error) {
      console.error("Failed to fetch token metadata:", error);
      return undefined;
    }
  };

  const fetchTokenAccounts = async (publicKey: string): Promise<TokenInfo[]> => {
    try {
      const accounts = await connection.getParsedTokenAccountsByOwner(
        new PublicKey(publicKey),
        {
          programId: TOKEN_PROGRAM_ID,
        }
      );

      // Fetch all metadata in parallel
      const tokens = await Promise.all(
        accounts.value.map(async ({ account, pubkey }) => {
          const parsedData = account.data.parsed.info;
          const uiBalance = (parsedData.tokenAmount.uiAmount || 0).toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: parsedData.tokenAmount.decimals
          });

          const metadata = await fetchTokenMetadata(parsedData.mint);

          return {
            mint: parsedData.mint,
            balance: Number(parsedData.tokenAmount.amount),
            decimals: parsedData.tokenAmount.decimals,
            uiBalance,
            metadata,
            tokenAccount: pubkey.toString()
          };
        })
      );

      return tokens;
    } catch (error) {
      console.error("Failed to fetch token accounts:", error);
      return [];
    }
  };

  // Add a function to handle closing empty accounts using appkit adapter
  const handleCloseEmptyAccounts = async () => {
    if (selectedCloses.size === 0) {
      toast({
        title: "No accounts selected",
        description: "Please select at least one empty account to close",
        duration: 3000,
      });
      return;
    }
    
    if (!connected || !publicKey || !walletProvider) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to continue",
        duration: 3000,
      });
      return;
    }

    try {
      setIsProcessingCloses(true);
      
      // Get the target address for rent reclamation
      const targetWallet = useConnectedWallet ? publicKey.toString() : destinationWallet;
      
      if (!targetWallet) {
        toast({
          title: "No destination set",
          description: "Please set a destination wallet or use your connected wallet",
          duration: 3000,
        });
        setIsProcessingCloses(false);
        return;
      }

      // Use a different approach for toasts to avoid the dismiss issue
      toast({
        title: "Preparing transaction",
        description: `Closing ${selectedCloses.size} empty token ${selectedCloses.size === 1 ? 'account' : 'accounts'}...`,
        duration: 5000,
      });
      
      // Create the transaction
      const transaction = new Transaction();
      
      // Convert wallet addresses to PublicKey objects
      const walletPublicKey = new PublicKey(publicKey.toString());
      const targetPublicKey = new PublicKey(targetWallet);
      
      // Add close account instructions
      Array.from(selectedCloses).forEach(tokenAccount => {
        transaction.add(
          createCloseAccountInstruction(
            new PublicKey(tokenAccount),  // Token account to close
            targetPublicKey,              // Destination for rent (explicitly use target)
            walletPublicKey,              // Authority (connected wallet)
            []
          )
        );
      });
      
      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPublicKey;
      
      // Sign transaction with wallet adapter
      const signedTransaction = await walletProvider.signTransaction(transaction);

      // Show a new toast instead of dismissing the previous one
      toast({
        title: "Sending transaction",
        description: "Transaction is being processed...",
        duration: 5000,
      });
      
      // Send the signed transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      // Wait for confirmation
      await confirmTransaction(connection, signature);
      
      // Update the account list by refreshing wallet balances
      if (publicKey) {
        await fetchWalletBalances(publicKey.toString());
      }
      
      // Clear the selected accounts
      setSelectedCloses(new Set());
      
      // Show success toast
      toast({
        title: "Accounts closed successfully",
        description: `Closed ${selectedCloses.size} empty token ${selectedCloses.size === 1 ? 'account' : 'accounts'}`,
        duration: 5000,
      });
      
    } catch (error: unknown) {
      console.error("Error closing empty accounts:", error);
      
      // Handle user rejection
      if (error instanceof Error && (error.message.includes('rejected') || error.message.includes('User rejected'))) {
        toast({
          title: "Transaction rejected",
          description: "You declined the transaction in your wallet",
          duration: 3000,
        });
      } else {
        toast({
          title: "Error closing accounts",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          duration: 5000,
        });
      }
    } finally {
      setIsProcessingCloses(false);
    }
  };

  // Add a function to handle transferring tokens using appkit adapter
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleTransferSelectedTokens = async () => {
    if (selectedTransfers.size === 0) {
      toast({
        title: "No tokens selected",
        description: "Please select at least one token to transfer",
        duration: 3000,
      });
      return;
    }
    
    if (!connected || !publicKey || !walletProvider) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to continue",
        duration: 3000,
      });
      return;
    }

    try {
      setIsProcessingTokens(true);
      
      // Get the target address for token transfer
      const targetWallet = useConnectedWallet ? publicKey.toString() : destinationWallet;
      
      if (!targetWallet) {
        toast({
          title: "No destination set",
          description: "Please set a destination wallet or use your connected wallet",
          duration: 3000,
        });
        setIsProcessingTokens(false);
        return;
      }

      // Use a different approach for toasts to avoid the dismiss issue
      toast({
        title: "Preparing transaction",
        description: `Transferring ${selectedTransfers.size} token ${selectedTransfers.size === 1 ? 'balance' : 'balances'}...`,
        duration: 5000,
      });
      
      // Create the transaction
      const transaction = new Transaction();
      
      // Add transfer instructions for each selected token
      const walletPublicKey = new PublicKey(publicKey.toString());
      
      // For each selected token, create a transfer instruction
      for (const tokenAccount of Array.from(selectedTransfers)) {
        // Find the token info to get the balance
        const walletAddress = publicKey.toString();
        const token = walletBalances[walletAddress]?.tokens.find(t => t.tokenAccount === tokenAccount);
        
        if (!token) {
          console.error(`Token info not found for account ${tokenAccount}`);
          continue;
        }
        
        // Create the transfer instruction
        transaction.add(
          createTransferInstruction(
            new PublicKey(tokenAccount),
            new PublicKey(targetWallet),
            walletPublicKey,
            BigInt(token.balance),
            []
          )
        );
      }
      
      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPublicKey;
      
      // Sign transaction with wallet adapter
      const signedTransaction = await walletProvider.signTransaction(transaction);

      // Show a new toast instead of dismissing the previous one
      toast({
        title: "Sending transaction",
        description: "Transaction is being processed...",
        duration: 5000,
      });
      
      // Send the signed transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      // Wait for confirmation
      await confirmTransaction(connection, signature);
      
      // Update the account list by refreshing wallet balances
      if (publicKey) {
        await fetchWalletBalances(publicKey.toString());
      }
      
      // Clear the selected tokens
      setSelectedTransfers(new Set());
      
      // Show success toast
      toast({
        title: "Tokens transferred successfully",
        description: `Transferred ${selectedTransfers.size} token ${selectedTransfers.size === 1 ? 'balance' : 'balances'}`,
        duration: 5000,
      });
      
    } catch (error: unknown) {
      console.error("Error transferring tokens:", error);
      
      // Handle user rejection
      if (error instanceof Error && (error.message.includes('rejected') || error.message.includes('User rejected'))) {
        toast({
          title: "Transaction rejected",
          description: "You declined the transaction in your wallet",
          duration: 3000,
        });
      } else {
        toast({
          title: "Error transferring tokens",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          duration: 5000,
        });
      }
    } finally {
      setIsProcessingTokens(false);
    }
  };

  // Add this function to calculate estimated SOL return
  const calculateEstimatedSOLReturn = (accountCount: number) => {
    // Each empty account returns roughly 0.002 SOL in rent
    const estimatedSOL = accountCount * 0.002;
    return estimatedSOL.toFixed(3);
  };

  // Updated handler function
  const handleBurnDustTokens = async () => {
    if (selectedTransfers.size === 0 && selectedCloses.size === 0) {
      toast({
        title: "No accounts selected",
        description: "Please select at least one token account to burn or close",
        duration: 3000,
      });
      return;
    }
    
    if (!connected || !publicKey || !walletProvider) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to continue",
        duration: 3000,
      });
      return;
    }

    try {
      setIsProcessingTokens(true);
      setIsProcessingCloses(true);
      
      // Get the target address for rent reclamation
      const targetWallet = useConnectedWallet ? publicKey.toString() : destinationWallet;
      
      if (!targetWallet) {
        toast({
          title: "No destination set",
          description: "Please set a destination wallet or use your connected wallet",
          duration: 3000,
        });
        setIsProcessingTokens(false);
        setIsProcessingCloses(false);
        return;
      }

      const totalAccounts = selectedTransfers.size + selectedCloses.size;
      
      toast({
        title: "Preparing transaction",
        description: `Processing ${totalAccounts} token ${totalAccounts === 1 ? 'account' : 'accounts'}...`,
        duration: 5000,
      });
      
      // Create the transaction
      const transaction = new Transaction();
      
      // Get the wallet address and tokens
      const walletAddress = publicKey.toString();
      const tokens = walletBalances[walletAddress]?.tokens || [];
      const walletPublicKey = new PublicKey(publicKey.toString());
      const targetPublicKey = new PublicKey(targetWallet);
      
      // Process all selected accounts at once
      const allAccounts = [...Array.from(selectedTransfers), ...Array.from(selectedCloses)];
      
      for (const tokenAccount of allAccounts) {
        const token = tokens.find(t => t.tokenAccount === tokenAccount);
        
        if (token) {
          const tokenAccountPublicKey = new PublicKey(tokenAccount);
          
          // If token has a balance, we need to burn it first
          if (Number(token.balance) > 0) {
            // Add burn instruction
            transaction.add(
              createBurnInstruction(
                tokenAccountPublicKey, // Token account to burn from
                new PublicKey(token.mint), // Mint address
                walletPublicKey, // Owner of the token account
                BigInt(token.balance), // Amount to burn
                [] // Additional signers
              )
            );
            
            // Always add close account instruction after burning
            transaction.add(
              createCloseAccountInstruction(
                tokenAccountPublicKey,
                targetPublicKey,   // Explicitly use target PublicKey
                walletPublicKey,
                []
              )
            );
          } 
          // If account is empty and was selected for closing
          else if (Number(token.balance) === 0) {
            transaction.add(
              createCloseAccountInstruction(
                tokenAccountPublicKey,
                targetPublicKey,   // Explicitly use target PublicKey
                walletPublicKey,
                []
              )
            );
          }
        }
      }
      
      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPublicKey;
      
      // Sign transaction with wallet adapter
      const signedTransaction = await walletProvider.signTransaction(transaction);

      toast({
        title: "Sending transaction",
        description: "Transaction is being processed...",
        duration: 5000,
      });
      
      // Send the signed transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      // Wait for confirmation
      await confirmTransaction(connection, signature);
      
      // Update the account list by refreshing wallet balances
      if (publicKey) {
        await fetchWalletBalances(publicKey.toString());
      }
      
      // Clear the selected accounts
      setSelectedTransfers(new Set());
      setSelectedCloses(new Set());
      
      toast({
        title: "Accounts processed successfully",
        description: `Processed ${totalAccounts} token ${totalAccounts === 1 ? 'account' : 'accounts'} and reclaimed ${totalAccounts * 0.002} SOL`,
        link: `https://solscan.io/tx/${signature}`,
        variant: "success",
        duration: 15000,
      });
      
    } catch (error: unknown) {
      if (error instanceof Error && (error.message.includes('Transaction cancelled') || error.message.includes('User rejected'))) {
        toast({
          title: "Transaction cancelled",
          description: "You cancelled the transaction in your wallet",
          duration: 3000,
        });
      }
        
      if (error instanceof Error && (error.message.includes('rejected') || error.message.includes('User rejected'))) {
        toast({
          title: "Transaction rejected",
          description: "You declined the transaction in your wallet",
          duration: 3000,
        });
      } else {
        toast({
          title: "Error processing accounts",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "error",
          duration: 5000,
        });
      }
    } finally {
      setIsProcessingTokens(false);
      setIsProcessingCloses(false);
    }
  };

  return (
    <>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Icons.wallet className="w-5 h-5 text-primary" />
          Wallet Consolidator
        </CardTitle>
        <CardDescription>
          Manage your token accounts and reclaim rent
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {!connected ? (
            <Alert>
              <AlertDescription>
                Please connect your wallet to continue.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Destination Wallet Section - Made Responsive */}
              <div className="border-b border-primary/10 pb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                  <h3 className="text-sm font-medium">Destination Address</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleUseConnectedWallet}
                    className="h-8 text-xs w-full sm:w-auto"
                    disabled={useConnectedWallet}
                  >
                    Use Connected Wallet
                  </Button>
                </div>
                
                {isEditingDestination ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter destination wallet address"
                        value={tempDestination}
                        onChange={(e) => setTempDestination(e.target.value)}
                        className="font-mono bg-background/50 border-primary/10 focus:border-primary/30 flex-1"
                      />
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleSaveDestination}
                        disabled={tempDestination !== "" && !isValidUint8ArrayString(tempDestination)}
                        className="hover:bg-primary/90 p-0 w-10 h-10"
                      >
                        <Icons.check className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter a valid Solana wallet address where you want to receive reclaimed rent
                    </p>
                  </div>
                ) : (
                  <div>
                    {useConnectedWallet ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <Badge variant="secondary" className="font-medium">Connected Wallet</Badge>
                        <Badge variant="outline" className="font-mono px-3 py-1.5 bg-primary/5 border-primary/20">
                          {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleEditDestination}
                          className="ml-auto text-xs h-8 mt-2 sm:mt-0"
                        >
                          Change
                        </Button>
                      </div>
                    ) : destinationWallet ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <Badge variant="outline" className="font-mono px-3 py-1.5 bg-primary/5 border-primary/20">
                          {destinationWallet.slice(0, 8)}...{destinationWallet.slice(-8)}
                        </Badge>
                        <div className="ml-auto flex gap-2 mt-2 sm:mt-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleEditDestination}
                            className="h-8 text-xs"
                          >
                            Change
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearDestination}
                            className="text-destructive hover:bg-destructive/5 h-8 text-xs"
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEditDestination}
                        className="w-full border-primary/20 hover:bg-primary/5"
                      >
                        Set Destination Address
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Tokens Section - Made Responsive */}
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                  <h3 className="text-sm font-medium">Token Accounts</h3>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs flex-1 sm:flex-none"
                      onClick={() => handleSelectAll('tokens')}
                    >
                      Select All Tokens
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs flex-1 sm:flex-none"
                      onClick={() => handleSelectAll('empty')}
                    >
                      Select Empty
                    </Button>
                    <div className="flex gap-2 items-center">
                      <div className="text-xs text-muted-foreground flex items-center">
                        <Icons.clock className="h-3 w-3 mr-1" />
                        <span>{formatLastCheckedTime(lastRefreshTime)}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`h-8 w-8 p-0 ${refreshCooldown ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={handleRefresh}
                        disabled={refreshCooldown}
                        title={refreshCooldown ? "Please wait before refreshing again" : "Refresh token accounts"}
                      >
                        {refreshCooldown ? (
                          <Icons.spinner className="h-4 w-4 animate-spin" />
                        ) : (
                          <Icons.refresh className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {publicKey && walletBalances[publicKey.toString()]?.isLoading ? (
                  <div className="space-y-2 py-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : publicKey && walletBalances[publicKey.toString()]?.tokens?.length > 0 ? (
                  <div className="space-y-3">
                    {/* Token Accounts with Balance */}
                    {walletBalances[publicKey.toString()].tokens.filter(t => Number(t.balance) > 0).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium pl-1">Tokens with Balance</h4>
                        <div className="space-y-2">
                          {walletBalances[publicKey.toString()].tokens
                            .filter(token => Number(token.balance) > 0)
                            .map((token) => (
                              <TokenDisplay 
                                key={token.tokenAccount} 
                                token={token}
                                showCheckbox={true}
                                isSelected={selectedTransfers.has(token.tokenAccount)}
                                onSelect={(selected) => {
                                  setSelectedTransfers(prev => {
                                    const newSet = new Set(prev);
                                    if (selected) {
                                      newSet.add(token.tokenAccount);
                                    } else {
                                      newSet.delete(token.tokenAccount);
                                    }
                                    return newSet;
                                  });
                                }}
                              />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Empty Token Accounts */}
                    {walletBalances[publicKey.toString()].tokens.filter(t => Number(t.balance) === 0).length > 0 && (
                      <div className="space-y-2 mt-4">
                        <h4 className="text-xs font-medium pl-1">Empty Accounts (Claimable Rent)</h4>
                        <div className="space-y-2">
                          {walletBalances[publicKey.toString()].tokens
                            .filter(token => Number(token.balance) === 0)
                            .map((token) => (
                              <TokenDisplay 
                                key={token.tokenAccount} 
                                token={token}
                                showCheckbox={true}
                                isSelected={selectedCloses.has(token.tokenAccount)}
                                onSelect={(selected) => {
                                  setSelectedCloses(prev => {
                                    const newSet = new Set(prev);
                                    if (selected) {
                                      newSet.add(token.tokenAccount);
                                    } else {
                                      newSet.delete(token.tokenAccount);
                                    }
                                    return newSet;
                                  });
                                }}
                              />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="mt-6 flex gap-3 justify-end">
                      
                      
                      {selectedCloses.size > 0 && (
                        <Button
                          variant="default"
                          onClick={() => setShowCloseConfirm(true)}
                          disabled={isProcessingCloses}
                          className="space-x-2"
                        >
                          <Icons.wallet className="h-4 w-4 mr-2" />
                          Close Empty Accounts
                        </Button>
                      )}

                      {/* Show Burn & Claim button when either tokens or empty accounts are selected */}
                      {(selectedTransfers.size > 0 || selectedCloses.size > 0) && (
                        <Button
                          variant="outline"
                          onClick={() => setShowBurnConfirm(true)}
                          disabled={isProcessingTokens || isProcessingCloses}
                          className="space-x-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                        >
                          <Icons.token className="h-4 w-4 mr-2" />
                          Burn Dust & Claim SOL
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="flex justify-center mb-3">
                      <Icons.token className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                    <p className="font-medium">No token accounts found</p>
                    <p className="text-sm mt-1">
                      Connect your wallet or refresh to see your token accounts
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>

      {/* Confirmation Dialogs - Improved for Mobile */}
      <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <DialogContent className="sm:max-w-[425px] max-w-[95vw] p-4 sm:p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle>Close Empty Token Accounts</DialogTitle>
            <DialogDescription>
              You are about to close {selectedCloses.size} empty token {selectedCloses.size === 1 ? 'account' : 'accounts'} and reclaim rent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-4">
            <p className="text-sm">
              Closing empty accounts will return the rent (~0.002 SOL per account) to your destination address.
              <strong className="block mt-2">
                Estimated SOL return: {calculateEstimatedSOLReturn(selectedCloses.size)} SOL
              </strong>
            </p>
            {useConnectedWallet ? (
              <Badge variant="secondary" className="font-medium">Destination: Connected Wallet</Badge>
            ) : destinationWallet ? (
              <Badge variant="outline" className="font-mono px-3 py-1.5 bg-primary/5 border-primary/20 break-all">
                Destination: {destinationWallet.slice(0, 8)}...{destinationWallet.slice(-8)}
              </Badge>
            ) : null}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowCloseConfirm(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                setShowCloseConfirm(false);
                handleCloseEmptyAccounts();
              }}
              disabled={isProcessingCloses}
              className="w-full sm:w-auto"
            >
              {isProcessingCloses ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Close"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Burn Dust Confirmation Dialog - Improved for Mobile */}
      <Dialog open={showBurnConfirm} onOpenChange={setShowBurnConfirm}>
        <DialogContent className="sm:max-w-[425px] max-w-[95vw] px-3 py-4 sm:p-6 rounded-3xl">
          <DialogHeader className="space-y-2">
            <DialogTitle>Burn Dust & Claim SOL</DialogTitle>
            <DialogDescription>
              You are about to burn and close a total of {selectedTransfers.size + selectedCloses.size} token {(selectedTransfers.size + selectedCloses.size) === 1 ? 'account' : 'accounts'} and reclaim rent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-4 max-h-[40vh] overflow-y-auto pr-1">
            {/* Show token details for accounts being burned */}
            {selectedTransfers.size > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Tokens to Burn:</h4>
                <div className="space-y-1">
                  {Array.from(selectedTransfers).map(tokenAccount => {
                    const token = walletBalances[publicKey?.toString() || '']?.tokens.find(t => t.tokenAccount === tokenAccount);
                    return token && Number(token.balance) > 0 ? (
                      <div key={tokenAccount} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {token.metadata?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={token.metadata.image} 
                              alt={token.metadata.name} 
                              className="w-5 h-5 rounded-full flex-shrink-0"
                            />
                          ) : (
                            <Icons.token className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="truncate">
                            {token.metadata?.name || 'Unknown Token'} ({token.metadata?.symbol || 'UNK'})
                          </span>
                        </div>
                        <span className="font-mono ml-2 flex-shrink-0">
                          {token.uiBalance}
                        </span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Show empty accounts being closed */}
            {selectedCloses.size > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Empty Accounts to Close:</h4>
                <div className="text-sm text-muted-foreground">
                  {selectedCloses.size} empty token {selectedCloses.size === 1 ? 'account' : 'accounts'} will be closed
                </div>
              </div>
            )}

            <p className="text-sm">
              This will {selectedTransfers.size > 0 ? 'burn your dust tokens' : ''} 
              {selectedTransfers.size > 0 && selectedCloses.size > 0 ? ' and ' : ''}
              {selectedCloses.size > 0 ? 'close your empty accounts' : ''} 
              and return approximately 0.002 SOL per account to your destination wallet.
              <strong className="block mt-2">
                Estimated SOL return: {calculateEstimatedSOLReturn(selectedTransfers.size + selectedCloses.size)} SOL
              </strong>
            </p>
            {useConnectedWallet ? (
              <Badge variant="secondary" className="font-medium">Destination: Connected Wallet</Badge>
            ) : destinationWallet ? (
              <Badge variant="outline" className="font-mono px-3 py-1.5 bg-primary/5 border-primary/20 break-all">
                Destination: {destinationWallet.slice(0, 8)}...{destinationWallet.slice(-8)}
              </Badge>
            ) : null}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowBurnConfirm(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                setShowBurnConfirm(false);
                handleBurnDustTokens();
              }}
              disabled={isProcessingTokens || isProcessingCloses}
              className="w-full sm:w-auto"
            >
              {isProcessingTokens || isProcessingCloses ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Burn & Claim SOL"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}