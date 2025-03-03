import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, createCloseAccountInstruction, createTransferInstruction } from "@solana/spl-token"
import { WalletInput, TokenInfo } from "@/types/wallet"

export interface BalanceChange {
  address: string
  oldBalance: number
  newBalance: number
  change: number
}

export interface SimulationResult {
  success: boolean
  balanceChanges: BalanceChange[]
  error?: string
}

export const createConsolidateInstructions = async (
  connection: Connection,
  wallets: WalletInput[],
  destinationPubkey: PublicKey,
  selectedSolBalances: Set<string>,
  selectedTransfers: Set<string>,
  selectedCloses: Set<string>
) => {
  const instructions = [];
  const signers: Keypair[] = [];

  for (const wallet of wallets) {
    if (!wallet.keypair || !wallet.publicKey) continue;

    // Add SOL transfer if wallet has balance and is selected
    if (wallet.balance && wallet.balance > 0.01 && selectedSolBalances.has(wallet.publicKey)) {
      const transferAmount = Math.floor((wallet.balance - 0.01) * LAMPORTS_PER_SOL);
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: wallet.keypair.publicKey,
          toPubkey: destinationPubkey,
          lamports: transferAmount,
        })
      );
      signers.push(wallet.keypair);
    }

    // Add token transfer instructions for selected tokens with balance
    if (wallet.tokens) {
      for (const token of wallet.tokens) {
        if (Number(token.balance) > 0 && selectedTransfers.has(token.tokenAccount)) {
          // Get or create associated token account for destination
          const destinationAta = await PublicKey.findProgramAddress(
            [
              destinationPubkey.toBuffer(),
              TOKEN_PROGRAM_ID.toBuffer(),
              new PublicKey(token.mint).toBuffer(),
            ],
            ASSOCIATED_TOKEN_PROGRAM_ID
          );

          // Check if the token account exists
          const destinationAccount = await connection.getAccountInfo(destinationAta[0]);
          
          // If it doesn't exist, add create instruction
          if (!destinationAccount) {
            instructions.push(
              createAssociatedTokenAccountInstruction(
                wallet.keypair.publicKey,
                destinationAta[0],
                destinationPubkey,
                new PublicKey(token.mint)
              )
            );
          }

          instructions.push(
            createTransferInstruction(
              new PublicKey(token.tokenAccount),
              destinationAta[0],
              wallet.keypair.publicKey,
              BigInt(token.balance),
              []
            )
          );
        } else if (Number(token.balance) === 0 && selectedCloses.has(token.tokenAccount)) {
          // Add close instruction for selected empty accounts
          instructions.push(
            createCloseAccountInstruction(
              new PublicKey(token.tokenAccount),
              destinationPubkey,
              wallet.keypair.publicKey,
              []
            )
          );
        }
      }
    }
  }

  return { instructions, signers };
};

export const simulateTransaction = async (
  connection: Connection,
  instructions: any[],
  signers: Keypair[],
  wallets: WalletInput[],
  destinationWallet: string
): Promise<SimulationResult> => {
  try {
    const transaction = new Transaction();
    instructions.forEach(instruction => transaction.add(instruction));

    // Get all unique addresses involved
    const addresses = new Set<string>([
      destinationWallet,
      ...wallets.map(w => w.publicKey!).filter(Boolean)
    ]);

    // Get initial balances
    const initialBalances = new Map<string, number>();
    await Promise.all(
      Array.from(addresses).map(async (address) => {
        const balance = await connection.getBalance(new PublicKey(address));
        initialBalances.set(address, balance / LAMPORTS_PER_SOL);
      })
    );

    // Simulate transaction
    const { value: simResult } = await connection.simulateTransaction(transaction, signers);

    if (simResult.err) {
      // Parse the error object
      let errorMessage: string;
      if (typeof simResult.err === 'object') {
        const error = simResult.err as any;
        if (Array.isArray(error) && error[0] === 'InstructionError') {
          errorMessage = `Instruction Error: ${error[1]}`;
        } else {
          errorMessage = JSON.stringify(error);
        }
      } else {
        errorMessage = String(simResult.err);
      }
      throw new Error(errorMessage);
    }

    // Get final balances
    const finalBalances = new Map<string, number>();
    await Promise.all(
      Array.from(addresses).map(async (address) => {
        const balance = await connection.getBalance(new PublicKey(address));
        finalBalances.set(address, balance / LAMPORTS_PER_SOL);
      })
    );

    // Calculate balance changes
    const balanceChanges: BalanceChange[] = Array.from(addresses).map(address => ({
      address,
      oldBalance: initialBalances.get(address) || 0,
      newBalance: finalBalances.get(address) || 0,
      change: (finalBalances.get(address) || 0) - (initialBalances.get(address) || 0)
    }));

    return {
      success: true,
      balanceChanges
    };
  } catch (error: any) {
    let errorMessage: string;
    if (error.message.includes('InvalidAccountData')) {
      errorMessage = 'Some token accounts need to be created for the destination wallet. This will be handled automatically during consolidation.';
    } else {
      errorMessage = typeof error === 'string' 
        ? error 
        : error.message || JSON.stringify(error);
    }
    return {
      success: false,
      balanceChanges: [],
      error: errorMessage
    };
  }
}; 