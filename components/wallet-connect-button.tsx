import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { appKit } from '@/app/reown-config';

export function WalletConnectButton() {
  const { connected, publicKey, connecting, disconnecting, connect, disconnect } = useWallet();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if Reown is initialized
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Reown initialized check:', !!appKit);
    }
  }, []);

  // Reset loading state when connection state changes
  useEffect(() => {
    if (!connecting) {
      // Add a small delay to ensure the UI updates after the connection state changes
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [connecting]);

  // Update when connection state changes
  useEffect(() => {
    console.log('Connection state changed:', { connected, publicKey });
  }, [connected, publicKey]);

  // Format public key for display (first 4 and last 4 characters)
  const formatPublicKey = (key: string) => {
    if (!key) return '';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  // Handle connect button click
  const handleConnect = async () => {
    setIsLoading(true);
    try {
      console.log('Connecting wallet...', { appKitExists: !!appKit });
      await connect();
      // The loading state will be reset by the useEffect when connecting changes
    } catch (error) {
      console.error('Connection error:', error);
      setIsLoading(false);
    }
  };

  // Handle disconnect button click
  const handleDisconnect = async () => {
    try {
      console.log('Disconnecting wallet...');
      await disconnect();
    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      setIsDropdownOpen(false);
    }
  };

  // Copy address to clipboard
  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
      console.log('Copied address to clipboard:', publicKey);
      setIsDropdownOpen(false);
    }
  };

  // View on explorer
  const viewOnExplorer = () => {
    if (publicKey) {
      window.open(`https://explorer.solana.com/address/${publicKey}`, '_blank');
      setIsDropdownOpen(false);
    }
  };

  if (connected && publicKey) {
    return (
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="magical" size="sm" className="border-primary/20 hover:bg-primary/5">
            <Icons.wallet className="w-4 h-4 mr-2 text-primary" />
            {formatPublicKey(publicKey)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Wallet</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={copyAddress}>
            <Icons.edit className="w-4 h-4 mr-2" />
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem onClick={viewOnExplorer}>
            <Icons.target className="w-4 h-4 mr-2" />
            View on Explorer
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDisconnect} disabled={disconnecting} className="text-red-500 focus:text-red-500">
            <Icons.trash className="w-4 h-4 mr-2 text-red-500" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button 
      variant="genie" 
      size="sm" 
      onClick={handleConnect} 
      disabled={isLoading || connecting}
      className="relative overflow-hidden group"
    >
      {isLoading || connecting ? (
        <>
          <Icons.loader className="w-4 h-4 mr-2 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <Icons.wallet className="w-4 h-4 mr-2 text-primary" />
          Connect Wallet
        </>
      )}
    </Button>
  );
} 