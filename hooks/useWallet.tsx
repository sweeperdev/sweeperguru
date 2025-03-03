'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { appKit } from '@/app/reown-config';

// Define the wallet context type
type WalletContextType = {
  connected: boolean;
  publicKey: string | null;
  connecting: boolean;
  disconnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

// Create the context with default values
const WalletContext = createContext<WalletContextType>({
  connected: false,
  publicKey: null,
  connecting: false,
  disconnecting: false,
  connect: async () => {},
  disconnect: async () => {},
});

// Provider props type
type WalletProviderProps = {
  children: ReactNode;
};

// Create the AppKit provider component
export function WalletProvider({ children }: WalletProviderProps) {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  
  // Use AppKit hooks for initial state
  const { address, isConnected } = useAppKitAccount();
  const { disconnect: disconnectWallet } = useDisconnect();

  // Update state when AppKit account changes
  useEffect(() => {
    if (address) {
      setPublicKey(address);
      setConnected(isConnected);
    } else {
      setPublicKey(null);
      setConnected(false);
    }
  }, [address, isConnected]);

  // Connect function
  const connect = async () => {
    if (connected || connecting) return;
    
    try {
      setConnecting(true);
      console.log('Calling connect with appKit:', !!appKit);
      
      if (appKit) {
        await appKit.open({ view: 'Connect' });
      } else {
        console.error('Reown AppKit not initialized properly');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect function
  const disconnect = async () => {
    if (!connected || disconnecting) return;
    
    try {
      setDisconnecting(true);
      if (appKit) {
        await appKit.disconnect();
      } else {
        await disconnectWallet();
      }
      setPublicKey(null);
      setConnected(false);
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    } finally {
      setDisconnecting(false);
    }
  };

  // Set up event listeners for account changes
  useEffect(() => {
    // Early return if appKit is not initialized
    if (!appKit) {
      console.error('AppKit not initialized, cannot set up account listeners');
      return;
    }

    const kit = appKit; // Create a local reference that TypeScript knows is not undefined

    const handleAccountChange = () => {
      try {
        const address = kit.getAddress();
        console.log('Account changed:', address);
        
        if (address) {
          setPublicKey(address);
          setConnected(true);
        } else {
          setPublicKey(null);
          setConnected(false);
        }
      } catch (error) {
        console.error('Error getting address:', error);
      }
    };

    // Initial check
    handleAccountChange();

    // Set up subscription to account changes
    try {
      kit.subscribeAccount((state) => {
        console.log('Account state changed:', state);
        if (state.address) {
          setPublicKey(state.address);
          setConnected(state.isConnected);
        } else {
          setPublicKey(null);
          setConnected(false);
        }
      });
    } catch (error) {
      console.error('Error subscribing to account changes:', error);
    }

    // No cleanup needed as the subscription is managed by AppKit
    return () => {
      // No explicit cleanup needed
    };
  }, []);

  const value = {
    connected: connected,
    publicKey: publicKey,
    connecting,
    disconnecting,
    connect,
    disconnect,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

// Custom hook to use the wallet context
export function useWallet() {
  const context = useContext(WalletContext);
  
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  
  return context;
}

// Wrapper component for the wallet provider
export function AppKitProvider({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      {children}
    </WalletProvider>
  );
} 