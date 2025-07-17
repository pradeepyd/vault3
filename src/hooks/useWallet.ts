// hooks/useWallet.ts
"use client"
import { useState } from "react";
import { generateMnemonic, walletFromMnemonic } from "@/lib/wallet";
import { ethers } from "ethers";

export default function useWallet() {
  const [mnemonic, setMnemonic] = useState<string>("");
  const [wallet, setWallet] = useState<ethers.Wallet | null>(null);

  /**
   * Generate new wallet and save state
   */
  function createWallet() {
    const newMnemonic = generateMnemonic();
    const newWallet = walletFromMnemonic(newMnemonic);
    setMnemonic(newMnemonic);
    setWallet(newWallet);
  }

  /**
   * Import wallet from existing mnemonic
   */
  function importWallet(inputMnemonic: string) {
    const importedWallet = walletFromMnemonic(inputMnemonic);
    setMnemonic(inputMnemonic);
    setWallet(importedWallet);
  }

  return {
    mnemonic,
    wallet,
    createWallet,
    importWallet,
  };
}
