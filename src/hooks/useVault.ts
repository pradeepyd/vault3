import { decrypt, encrypt, getAesKey, getPrivateKey } from "@/lib/crypto";
import { useState } from "react";

export function useVault() {
  const [decryptedVault, setDecryptedVault] = useState<object | null>(null);
  const [encryptedVault, setEncryptedVault] = useState<string | null>(null);

  const [mnemonic, setMnemonic] = useState<string>("");

  // Load and decrypt vault from encrypted base64 using user-provided mnemonic
  const loadVault = async (encrypted: string, mnemonic: string) => {
    const privateKey = getPrivateKey(mnemonic);
    const aesKey = await getAesKey(privateKey);
    const decrypted = await decrypt(encrypted, aesKey);
    setDecryptedVault(JSON.parse(decrypted));
    setEncryptedVault(encrypted);
    setMnemonic(mnemonic);
  };

  // Encrypt vault and return base64 string
  const saveVault = async (vaultObject: object) => {
    const privateKey = getPrivateKey(mnemonic);
    const aesKey = await getAesKey(privateKey);
    const encrypted = await encrypt(JSON.stringify(vaultObject), aesKey);
    setDecryptedVault(vaultObject);
    setEncryptedVault(encrypted);
    return encrypted;
  };

  return {
    decryptedVault,
    encryptedVault,
    mnemonic,
    setMnemonic,
    loadVault,
    saveVault,
  };
}
