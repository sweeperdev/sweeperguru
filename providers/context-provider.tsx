'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WalletProvider } from '@/hooks/useWallet'

const queryClient = new QueryClient()

// Add global error handler for unhandled errors
if (typeof window !== 'undefined') {
  // Override window.onerror to catch and suppress rate limit errors
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    // Check if this is a rate limit error
    if (message && typeof message === 'string' && (
      message.includes('429') || 
      message.includes('rate limit') || 
      message.includes('too many requests') ||
      message.includes('Server responded with') ||
      message.includes('Retrying after')
    )) {
      // Suppress the error
      console.log('[Global] Rate limit error suppressed');
      return true; // Prevents the error from being propagated
    }
    
    // Call the original handler for other errors
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }
    return false;
  };
  
  // Also handle promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && (
      event.reason.message.includes('429') || 
      event.reason.message.includes('rate limit') || 
      event.reason.message.includes('too many requests') ||
      event.reason.message.includes('Server responded with') ||
      event.reason.message.includes('Retrying after')
    )) {
      // Suppress the rejection
      console.log('[Global] Rate limit rejection suppressed');
      event.preventDefault();
    }
  });
}

export default function ContextProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        {children}
      </WalletProvider>
    </QueryClientProvider>
  )
} 