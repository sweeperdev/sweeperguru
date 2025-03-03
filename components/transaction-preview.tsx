"use client"

import { WalletInput } from "@/types/wallet"
import { SimulationResult } from "@/services/transaction-simulation"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/ui/icons"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface TransactionPreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletInputs: WalletInput[]
  destinationWallet: string
  selectedSolBalances: Set<string>
  selectedTransfers: Set<string>
  selectedCloses: Set<string>
  setSelectedSolBalances: (value: Set<string>) => void
  simulationResult: SimulationResult | null
  isSimulating: boolean
  isProcessingTokens: boolean
  onSimulate: () => Promise<void>
  onConfirm: () => Promise<void>
}

export function TransactionPreview({
  open,
  onOpenChange,
  walletInputs,
  destinationWallet,
  selectedSolBalances,
  selectedTransfers,
  selectedCloses,
  setSelectedSolBalances,
  simulationResult,
  isSimulating,
  isProcessingTokens,
  onSimulate,
  onConfirm,
}: TransactionPreviewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction Preview</DialogTitle>
          <DialogDescription>
            Review the consolidation operations before proceeding
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6">
          <div className="relative">
            {/* Source Wallets Column */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-6">
              <div className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground text-center mb-6">Source Wallets</p>
                {walletInputs.filter(w => w.publicKey).map((wallet) => (
                  <div key={wallet.id} className="relative">
                    <div className="rounded-lg border border-primary/10 p-4 bg-background/50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <p className="text-xs font-mono text-muted-foreground truncate">
                          {wallet.publicKey}
                        </p>
                      </div>

                      {/* SOL Balance */}
                      <div className="flex items-center justify-between py-1 border-b border-primary/10">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                            <Icons.wallet className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-sm font-medium">
                            {wallet.balance?.toFixed(4) || '0'} SOL
                          </span>
                        </div>
                        {wallet.balance && wallet.balance > 0.01 && (
                          <Checkbox
                            checked={selectedSolBalances.has(wallet.publicKey!)}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(selectedSolBalances);
                              if (checked) {
                                newSet.add(wallet.publicKey!);
                              } else {
                                newSet.delete(wallet.publicKey!);
                              }
                              setSelectedSolBalances(newSet);
                            }}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        )}
                      </div>
                      
                      {/* Tokens with balance */}
                      {wallet.tokens?.filter(t => Number(t.balance) > 0).map(token => (
                        <div key={token.tokenAccount} className="flex items-center gap-2 py-1">
                          {token.metadata?.image ? (
                            <Image 
                              src={token.metadata.image} 
                              alt={token.metadata.name || "Token"} 
                              width={20}
                              height={20}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                              <Icons.token className="w-3 h-3 text-primary/50" />
                            </div>
                          )}
                          <span className="text-sm">
                            {token.uiBalance} {token.metadata?.symbol || "tokens"}
                          </span>
                        </div>
                      ))}
                      
                      {/* Empty accounts count */}
                      {wallet.tokens && wallet.tokens.filter(t => Number(t.balance) === 0).length > 0 && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-primary/10">
                          <Icons.trash className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {wallet.tokens.filter(t => Number(t.balance) === 0).length} empty accounts
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Connection lines */}
                    <div className="absolute top-1/2 -right-7 w-7 h-px bg-primary/20" />
                  </div>
                ))}
              </div>
              
              {/* Center flow indicator */}
              <div className="flex flex-col items-center justify-center">
                <div className="h-full w-px bg-primary/20" />
                <div className="rounded-full bg-primary/10 p-2 my-4">
                  <Icons.wallet className="w-5 h-5 text-primary" />
                </div>
                <div className="h-full w-px bg-primary/20" />
              </div>
              
              {/* Destination Wallet Column */}
              <div>
                <p className="text-sm font-medium text-muted-foreground text-center mb-6">Destination Wallet</p>
                <div className="rounded-lg border border-primary/10 p-4 bg-background/50">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <p className="text-xs font-mono text-muted-foreground truncate">
                      {destinationWallet}
                    </p>
                  </div>
                  
                  {/* Summary of incoming assets */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Icons.wallet className="w-4 h-4 text-primary" />
                      <span className="text-sm">
                        Receiving from {walletInputs.length} {walletInputs.length === 1 ? 'wallet' : 'wallets'}
                      </span>
                    </div>

                    {/* Total SOL being consolidated */}
                    <div className="flex items-center gap-2">
                      <Icons.wallet className="w-4 h-4 text-primary" />
                      <span className="text-sm">
                        {walletInputs.reduce((acc, w) => acc + (w.balance || 0), 0).toFixed(4)} SOL total
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Icons.token className="w-4 h-4 text-primary" />
                      <span className="text-sm">
                        {walletInputs.reduce((acc, w) => 
                          acc + (w.tokens?.filter(t => Number(t.balance) > 0).length || 0), 0)
                        } tokens with balance
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Icons.trash className="w-4 h-4 text-primary" />
                      <span className="text-sm">
                        {walletInputs.reduce((acc, w) => 
                          acc + (w.tokens?.filter(t => Number(t.balance) === 0).length || 0), 0)
                        } empty accounts to close
                      </span>
                    </div>
                    
                    <Separator className="my-2" />
                    
                    {/* Final summary with total SOL including rent */}
                    <div className="flex items-center gap-2">
                      <Icons.wallet className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">
                        Total SOL after consolidation: {(
                          walletInputs.reduce((acc, w) => acc + (w.balance || 0), 0) + 
                          walletInputs.reduce((acc, w) => 
                            acc + (w.tokens?.filter(t => Number(t.balance) === 0).length || 0), 0) * 0.002
                        ).toFixed(4)} SOL
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="sticky bottom-0 bg-background/95 backdrop-blur-sm py-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {!simulationResult ? (
            <Button
              onClick={onSimulate}
              disabled={isSimulating}
            >
              {isSimulating ? (
                <>
                  <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                  Simulating...
                </>
              ) : (
                'Simulate Consolidation'
              )}
            </Button>
          ) : (
            <Button
              onClick={onConfirm}
              disabled={isProcessingTokens}
            >
              {isProcessingTokens ? (
                <>
                  <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Consolidation'
              )}
            </Button>
          )}
        </DialogFooter>

        {/* Simulation Results Section */}
        {simulationResult && (
          <div className="mt-6 space-y-4">
            <Separator />
            <div className="space-y-4 pb-4">
              <h3 className="text-lg font-semibold">Simulation Results</h3>
              {simulationResult.success ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    The following changes will occur after consolidation:
                  </p>
                  <div className="space-y-4">
                    {/* Source Wallets */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Source Wallets (Sending)</p>
                      {simulationResult.balanceChanges
                        .filter(change => change.address !== destinationWallet)
                        .map((change) => {
                          const wallet = walletInputs.find(w => w.publicKey === change.address);
                          const selectedTokens = wallet?.tokens?.filter(t => selectedTransfers.has(t.tokenAccount)) || [];
                          const selectedEmptyAccounts = wallet?.tokens?.filter(t => selectedCloses.has(t.tokenAccount)) || [];
                          const isSelectedForSol = selectedSolBalances.has(change.address);
                          return (
                            <div key={change.address} className="rounded-lg border border-primary/10 p-3 bg-background/50">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Icons.wallet className="w-3 h-3 text-primary" />
                                  </div>
                                  <span className="font-mono text-xs">{change.address.slice(0, 4)}...{change.address.slice(-4)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">{change.oldBalance.toFixed(4)} SOL</span>
                                  <Icons.wallet className="w-3 h-3 text-primary" />
                                  <span className={cn(
                                    "font-medium",
                                    change.change > 0 ? "text-green-500" : "text-red-500"
                                  )}>
                                    {change.newBalance.toFixed(4)} SOL
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({change.change > 0 ? "+" : ""}{change.change.toFixed(4)} SOL)
                                  </span>
                                </div>
                              </div>

                              {/* Show SOL transfer if selected */}
                              {isSelectedForSol && change.oldBalance > 0.01 && (
                                <div className="flex items-center justify-between text-sm text-muted-foreground border-t border-primary/10 pt-2 mt-2">
                                  <div className="flex items-center gap-2">
                                    <Icons.wallet className="w-3 h-3" />
                                    <span>SOL Transfer</span>
                                  </div>
                                  <span>
                                    {(change.oldBalance - 0.01).toFixed(4)} SOL
                                  </span>
                                </div>
                              )}
                              
                              {/* Show selected tokens with balances */}
                              {selectedTokens.length > 0 && (
                                <div className="space-y-2 border-t border-primary/10 pt-2 mt-2">
                                  <p className="text-xs text-muted-foreground">Selected Token Transfers:</p>
                                  {selectedTokens.map(token => (
                                    <div key={token.tokenAccount} className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-2">
                                        {token.metadata?.image ? (
                                          <Image 
                                            src={token.metadata.image} 
                                            alt={token.metadata.name || "Token"} 
                                            width={16}
                                            height={16}
                                            className="rounded-full"
                                          />
                                        ) : (
                                          <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Icons.token className="w-2 h-2 text-primary/50" />
                                          </div>
                                        )}
                                        <span>{token.metadata?.symbol || "Unknown"}</span>
                                      </div>
                                      <span className="text-muted-foreground">{token.uiBalance}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Show selected empty accounts */}
                              {selectedEmptyAccounts.length > 0 && (
                                <div className="space-y-2 border-t border-primary/10 pt-2 mt-2">
                                  <p className="text-xs text-muted-foreground">Empty Accounts to Close:</p>
                                  {selectedEmptyAccounts.map(token => (
                                    <div key={token.tokenAccount} className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-2">
                                        {token.metadata?.image ? (
                                          <Image 
                                            src={token.metadata.image} 
                                            alt={token.metadata.name || "Token"} 
                                            width={16}
                                            height={16}
                                            className="rounded-full"
                                          />
                                        ) : (
                                          <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Icons.token className="w-2 h-2 text-primary/50" />
                                          </div>
                                        )}
                                        <span>{token.metadata?.symbol || "Unknown"}</span>
                                      </div>
                                      <span className="text-muted-foreground">+0.002 SOL (rent)</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>

                    {/* Destination Wallet */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Destination Wallet (Receiving)</p>
                      {simulationResult.balanceChanges
                        .filter(change => change.address === destinationWallet)
                        .map((change) => {
                          // Calculate total tokens being received
                          const receivingTokens = walletInputs.flatMap(w => 
                            w.tokens?.filter(t => selectedTransfers.has(t.tokenAccount)) || []
                          );
                          
                          // Calculate total empty accounts being closed
                          const closingAccounts = walletInputs.flatMap(w => 
                            w.tokens?.filter(t => selectedCloses.has(t.tokenAccount)) || []
                          );

                          return (
                            <div key={change.address} className="rounded-lg border border-primary/10 p-3 bg-background/50">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center">
                                    <Icons.wallet className="w-3 h-3 text-green-500" />
                                  </div>
                                  <span className="font-mono text-xs">{change.address.slice(0, 4)}...{change.address.slice(-4)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">{change.oldBalance.toFixed(4)} SOL</span>
                                  <Icons.wallet className="w-3 h-3 text-green-500" />
                                  <span className="font-medium text-green-500">
                                    {change.newBalance.toFixed(4)} SOL
                                  </span>
                                  <span className="text-xs text-green-500">
                                    (+{change.change.toFixed(4)} SOL)
                                  </span>
                                </div>
                              </div>

                              {/* Show incoming tokens */}
                              {receivingTokens.length > 0 && (
                                <div className="space-y-2 border-t border-primary/10 pt-2 mt-2">
                                  <p className="text-xs text-muted-foreground">Receiving Tokens:</p>
                                  {receivingTokens.map(token => (
                                    <div key={token.tokenAccount} className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-2">
                                        {token.metadata?.image ? (
                                          <Image 
                                            src={token.metadata.image} 
                                            alt={token.metadata.name || "Token"} 
                                            width={16}
                                            height={16}
                                            className="rounded-full"
                                          />
                                        ) : (
                                          <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Icons.token className="w-2 h-2 text-primary/50" />
                                          </div>
                                        )}
                                        <span>{token.metadata?.symbol || "Unknown"}</span>
                                      </div>
                                      <span className="text-green-500">+{token.uiBalance}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Show rent reclamation summary */}
                              {closingAccounts.length > 0 && (
                                <div className="space-y-2 border-t border-primary/10 pt-2 mt-2">
                                  <p className="text-xs text-muted-foreground">Rent Reclamation:</p>
                                  <div className="flex items-center justify-between text-sm">
                                    <span>Total rent from {closingAccounts.length} empty accounts</span>
                                    <span className="text-green-500">+{(closingAccounts.length * 0.002).toFixed(4)} SOL</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertDescription>
                    {simulationResult.error || 'Simulation failed'}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 