// lib/wallet.ts
import { ethers } from "ethers";

/**
 * Generate a new mnemonic seed phrase using ethers.js v6
 * @returns mnemonic string
 */
export function generateMnemonic(): string {
  const wallet = ethers.Wallet.createRandom();
  return wallet.mnemonic?.phrase || "";
}

/**
 * Create a wallet instance from a given mnemonic
 * @param mnemonic BIP39 mnemonic phrase
 * @returns ethers Wallet instance
 */
export function walletFromMnemonic(mnemonic: string): ethers.Wallet {
  // In ethers v6, use HDNode to derive private key, then create Wallet
  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic);
  return new ethers.Wallet(hdNode.privateKey);
}

/**
 * Derive a master encryption key from the wallet private key
 * @param wallet ethers Wallet instance
 * @returns Uint8Array encryption key
 */
export function deriveEncryptionKey(wallet: ethers.Wallet): Uint8Array {
  // Convert private key (hex) to Uint8Array
  return ethers.getBytes(wallet.privateKey);
}
