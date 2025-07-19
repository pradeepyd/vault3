// pages/test-encryption.tsx
"use client"
import { useState } from "react";
import {
  generateMnemonic,
  getPrivateKey,
  getAesKey,
  encrypt,
  decrypt,
} from "@/lib/crypto";

export default function TestEncryption() {
  const [mnemonic, setMnemonic] = useState("");
  const [vault, setVault] = useState('{"site": "gmail", "user": "me", "pass": "123456"}');
  const [encrypted, setEncrypted] = useState("");
  const [decrypted, setDecrypted] = useState("");

  const handleGenerateMnemonic = () => {
    setMnemonic(generateMnemonic());
  };

  const handleEncrypt = async () => {
    try {
      const privateKey = getPrivateKey(mnemonic);
      const aesKey = await getAesKey(privateKey);
      const encryptedVault = await encrypt(vault, aesKey);
      setEncrypted(encryptedVault);
    } catch (err) {
      alert("Encryption error: " + err);
    }
  };

  const handleDecrypt = async () => {
    try {
      const privateKey = getPrivateKey(mnemonic);
      const aesKey = await getAesKey(privateKey);
      const decryptedVault = await decrypt(encrypted, aesKey);
      setDecrypted(decryptedVault);
    } catch (err) {
      alert("Decryption error: " + err);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">🔐 Test Vault Encryption</h1>

      <div>
        <label className="font-medium">Mnemonic:</label>
        <textarea
          className="w-full border p-2 rounded mt-1"
          rows={2}
          value={mnemonic}
          onChange={(e) => setMnemonic(e.target.value)}
        />
        <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded" onClick={handleGenerateMnemonic}>
          Generate Mnemonic
        </button>
      </div>

      <div>
        <label className="font-medium">Vault JSON:</label>
        <textarea
          className="w-full border p-2 rounded mt-1"
          rows={3}
          value={vault}
          onChange={(e) => setVault(e.target.value)}
        />
      </div>

      <div className="flex gap-4">
        <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={handleEncrypt}>
          Encrypt
        </button>
        <button className="px-4 py-2 bg-purple-600 text-white rounded" onClick={handleDecrypt}>
          Decrypt
        </button>
      </div>

      <div>
        <label className="font-medium">Encrypted (Base64):</label>
        <textarea className="w-full border p-2 rounded mt-1" rows={3} readOnly value={encrypted} />
      </div>

      <div>
        <label className="font-medium">Decrypted Vault:</label>
        <textarea className="w-full border p-2 rounded mt-1" rows={3} readOnly value={decrypted} />
      </div>
    </div>
  );
}
