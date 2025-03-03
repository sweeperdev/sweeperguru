'use client'

import WalletConsolidator from '@/components/wallet-consolidator'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useEffect } from 'react'
import { WalletConnectButton } from '@/components/wallet-connect-button'
import { ToastWrapper } from '@/components/ui/toast-wrapper'
import Image from 'next/image'
import Genie from '@/public/aw-peng.png'

export default function Home() {
  // Loading state management with default true (showing skeleton)
  const [isLoading, setIsLoading] = useState(true)

  // Simulate loading completion
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-background/95 overflow-hidden">
      {/* Add the ToastWrapper component */}
      <ToastWrapper />
      
      {/* Gradient background effects */}
      <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
      
      {/* Enhanced magic sparkles */}
      <div className="absolute top-20 left-1/4 w-2 h-2 rounded-full bg-magic-sparkle animate-sparkle opacity-70 pointer-events-none" style={{ animationDelay: '0.5s', backgroundColor: '#FFD700' }} />
      <div className="absolute top-40 right-1/3 w-3 h-3 rounded-full bg-magic-sparkle animate-sparkle opacity-60 pointer-events-none" style={{ animationDelay: '1.2s', backgroundColor: '#FFD700' }} />
      <div className="absolute bottom-1/4 left-1/5 w-2 h-2 rounded-full bg-magic-sparkle animate-sparkle opacity-50 pointer-events-none" style={{ animationDelay: '0.7s', backgroundColor: '#FFD700' }} />
      <div className="absolute top-1/3 right-1/4 w-2 h-2 rounded-full bg-magic-sparkle animate-sparkle opacity-60 pointer-events-none" style={{ animationDelay: '1.5s', backgroundColor: '#FFD700' }} />
      <div className="absolute bottom-1/3 right-1/5 w-2 h-2 rounded-full bg-magic-sparkle animate-sparkle opacity-65 pointer-events-none" style={{ animationDelay: '2.1s', backgroundColor: '#FFD700' }} />
      <div className="absolute top-2/3 left-1/3 w-3 h-3 rounded-full bg-magic-sparkle animate-sparkle opacity-55 pointer-events-none" style={{ animationDelay: '0.9s', backgroundColor: '#FFD700' }} />
      
      {/* Floating orbs effect */}
      <div className="absolute top-1/4 right-1/6 w-16 h-16 rounded-full bg-primary/5 blur-xl animate-float-slow pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/6 w-24 h-24 rounded-full bg-accent/5 blur-xl animate-float-slow pointer-events-none" style={{ animationDelay: '1.3s' }} />
      
      {/* Wallet Connect Button in top-right corner */}
      <div className="absolute top-4 right-4 z-10">
        <WalletConnectButton />
      </div>
      
      <div className="container relative px-4 py-16 mx-auto">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Header section - enhanced */}
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center mb-4">
            <span className="text-4xl md:text-[128px] animate-genie-appear" aria-hidden="true">
              <div style={{ overflow: 'hidden', height: '192px' }}>
                <Image src={Genie} alt="Genie" width={192} height={192}  />
              </div></span>

            </div>
            <h1 className="text-4xl md:text-6xl pb-2 lg:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary/70">
              sweeper.guru
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Sweep your solana wallet and dust tokens for extra SOL
            </p>
            {/* Badge */}
            <div className="flex justify-center mt-2">
              <span className="inline-flex items-center px-3 py-1 mt-4 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Fast & Secure
              </span>
            </div>
          </div>

          {/* Magical divider - enhanced */}
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-primary/20"></div>
            <div className="mx-4 flex items-center justify-center w-8 h-8 rounded-full bg-background border border-primary/30">
              <span className="text-sm" aria-hidden="true">✨</span>
            </div>
            <div className="flex-grow border-t border-primary/20"></div>
          </div>

          {/* Main consolidator component with skeleton loader */}
          <div className="bg-card/50 backdrop-blur-sm rounded-lg shadow-lg border border-primary/10 px-4 md:px-4 py-4 md:py-4 hover:shadow-xl hover:border-primary/20 transition-all duration-300">
            {isLoading ? (
              <div className="space-y-4">
                {/* Skeleton for header */}
                <div className="flex items-center justify-between">
                  <Skeleton className="h-8 w-[180px]" />
                  <Skeleton className="h-8 w-[120px] rounded-full" />
                </div>
                
                {/* Skeleton for main input area */}
                <Skeleton className="h-14 w-full mt-4" />
                
                {/* Skeleton for token list */}
                <div className="space-y-3 mt-6">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
                
                {/* Skeleton for buttons */}
                <div className="flex gap-3 mt-6">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ) : (
              <div className="animate-fade-in opacity-100 transition-opacity duration-500">
                <WalletConsolidator />
              </div>
            )}
          </div>

          
          {/* Features highlight */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-background/50 border border-primary/5 hover:border-primary/15 transition-all duration-300">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-medium text-sm">Security First</h3>
              <p className="text-xs text-muted-foreground">Your keys never leave your browser</p>
            </div>
            <div className="p-4 rounded-lg bg-background/50 border border-primary/5 hover:border-primary/15 transition-all duration-300">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-medium text-sm">Lightning Fast</h3>
              <p className="text-xs text-muted-foreground">Optimized for speed and efficiency</p>
            </div>
            <div className="p-4 rounded-lg bg-background/50 border border-primary/5 hover:border-primary/15 transition-all duration-300">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="font-medium text-sm">Fee Optimized</h3>
              <p className="text-xs text-muted-foreground">Minimal transaction costs</p>
            </div>
          </div>
          
          {/* Footer note - enhanced */}
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Your keys never leave your browser. All operations are performed locally by our trusty genie.
            </p>
            
            {/* Social links */}
            <div className="flex items-center justify-center gap-6 pt-2">
              <a 
                href="https://github.com/sweeperdev/sweeperguru" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="GitHub Repository"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
              </a>
              <a 
                href="https://x.com/sweeperguru" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Twitter Profile"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </a>
            </div>
            
            {/* Copyright and terms */}
            <div className="text-xs text-muted-foreground/70 pt-2">
              <a href="#" className="hover:underline">Terms</a>
              <span className="mx-1.5">•</span>
              <a href="#" className="hover:underline">Privacy</a>
              <span className="mx-1.5">•</span>
              <a href="#" className="hover:underline">Support</a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}