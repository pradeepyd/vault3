"use client";

import { useState, useEffect } from "react";
import { encryptData, decryptData, importEncryptionKey } from "@/lib/crypto";
import { Wallet, getBytes } from "ethers";
import { uploadVaultToIPFS, fetchVaultFromIPFS } from "@/lib/ipfs";

export interface VaultEntry {
  id: string;
  site: string;
  username: string;
  encryptedPassword: string;
}

export default function useVault(wallet: Wallet | null) {
  const [vault, setVault] = useState<VaultEntry[]>([]);
  const [vaultCid, setVaultCid] = useState<string | null>(null);

  // Load vault from IPFS when wallet imports
  useEffect(() => {
    const loadVault = async () => {
      if (!wallet) return;

      const savedCid = localStorage.getItem(`${wallet.address}_vaultCID`);
      if (savedCid) {
        try {
          const fetchedVault = await fetchVaultFromIPFS(savedCid);
          setVault(fetchedVault);
          setVaultCid(savedCid);
        } catch (err) {
          console.error("Failed to fetch vault from IPFS:", err);
        }
      }
    };
    loadVault();
  }, [wallet]);

  // Upload vault to IPFS whenever it changes and save CID
  useEffect(() => {
    const saveVault = async () => {
      if (!wallet) return;
      if (vault.length === 0) return;

      try {
        const cid = await uploadVaultToIPFS(vault);
        setVaultCid(cid);
        localStorage.setItem(`${wallet.address}_vaultCID`, cid);
        console.log("Vault uploaded to IPFS with CID:", cid);
      } catch (err) {
        console.error("Failed to upload vault to IPFS:", err);
      }
    };
    saveVault();
  }, [vault, wallet]);

  async function addEntry(site: string, username: string, password: string) {
    if (!wallet) {
      alert("Please create or import wallet first.");
      return;
    }

    const privateKeyBytes = getBytes(wallet.privateKey);
    const rawKey = await importEncryptionKey(privateKeyBytes);
    const encryptedPassword = await encryptData(password, rawKey);

    const newEntry: VaultEntry = {
      id: crypto.randomUUID(),
      site,
      username,
      encryptedPassword,
    };

    setVault([...vault, newEntry]);
  }

  async function editEntry(id: string, newSite: string, newUsername: string, newPassword: string) {
    if (!wallet) {
      alert("Please create or import wallet first.");
      return;
    }

    const privateKeyBytes = getBytes(wallet.privateKey);
    const rawKey = await importEncryptionKey(privateKeyBytes);
    const encryptedPassword = await encryptData(newPassword, rawKey);

    const updated = vault.map(entry =>
      entry.id === id
        ? { ...entry, site: newSite, username: newUsername, encryptedPassword }
        : entry
    );

    setVault(updated);
  }

  async function getDecryptedPassword(entry: VaultEntry): Promise<string> {
    if (!wallet) {
      alert("Please create or import wallet first.");
      return "";
    }

    const privateKeyBytes = getBytes(wallet.privateKey);
    const rawKey = await importEncryptionKey(privateKeyBytes);
    return decryptData(entry.encryptedPassword, rawKey);
  }

  function deleteEntry(id: string) {
    setVault(vault.filter(entry => entry.id !== id));
  }

  return { vault, addEntry, editEntry, getDecryptedPassword, deleteEntry, vaultCid };
}
