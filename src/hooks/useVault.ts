import { useState } from "react";
import { decrypt, encrypt, getAesKey, getPrivateKey } from "@/lib/crypto";
import { VaultEntry } from "@/types";
import { v4 as uuidv4 } from "uuid";

export function useVault() {
  const [decryptedVault, setDecryptedVault] = useState<VaultEntry[] | null>(null);
  const [encryptedVault, setEncryptedVault] = useState<string | null>(null);
  const [mnemonic, setMnemonic] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vaultExists, setVaultExists] = useState<boolean>(false);

  // 🧠 Load + decrypt vault from encrypted string
  const loadVault = async (encrypted: string, mnemonic: string) => {
    try {
      setLoading(true);
      const privateKey = getPrivateKey(mnemonic);
      const aesKey = await getAesKey(privateKey);
      const decrypted = await decrypt(encrypted, aesKey);
      const parsed = JSON.parse(decrypted) as VaultEntry[];
      setDecryptedVault(parsed);
      setEncryptedVault(encrypted);
      setMnemonic(mnemonic);
    } catch (err: any) {
      setError("Failed to decrypt vault");
    } finally {
      setLoading(false);
    }
  };

  // 🔐 Encrypt vault and return encrypted string
  const saveVault = async (vaultObject: VaultEntry[]) => {
    const privateKey = getPrivateKey(mnemonic);
    const aesKey = await getAesKey(privateKey);
    const encrypted = await encrypt(JSON.stringify(vaultObject), aesKey);
    setDecryptedVault(vaultObject);
    setEncryptedVault(encrypted);
    return encrypted;
  };

  // 🧲 Load from server and decrypt using mnemonic
  const loadFromServer = async (mnemonic: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/vault/load");

      if (res.status === 404) {
        setVaultExists(false);
        setLoading(false);
        return;
      }

      const json = await res.json();
      setVaultExists(true);
      await loadVault(json.data, mnemonic);
    } catch (err: any) {
      setError("Failed to load vault from server");
    } finally {
      setLoading(false);
    }
  };

  // 💾 Encrypt and save to server
  const saveToServer = async () => {
    if (!decryptedVault) return;
    try {
      setLoading(true);
      const encrypted = await saveVault(decryptedVault);
      const res = await fetch("/api/vault/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: encrypted }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Save failed");
      }
    } catch (err: any) {
      setError("Failed to save vault to server");
    } finally {
      setLoading(false);
    }
  };

  // ➕ Add a new entry
  const addEntry = (entry: Omit<VaultEntry, "id">) => {
    setDecryptedVault((prev) =>
      prev ? [...prev, { ...entry, id: uuidv4() }] : [{ ...entry, id: uuidv4() }]
    );
  };

  // ❌ Remove an entry
  const removeEntry = (id: string) => {
    setDecryptedVault((prev) => prev?.filter((e) => e.id !== id) || []);
  };

  return {
    decryptedVault,
    encryptedVault,
    mnemonic,
    setMnemonic,
    loading,
    error,
    vaultExists,
    loadVault,
    saveVault,
    loadFromServer,
    saveToServer,
    addEntry,
    removeEntry,
  };
}
