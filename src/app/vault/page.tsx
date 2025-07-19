// app/page.tsx
"use client";

import { useState } from "react";
import { useVault } from "@/hooks/useVault";

export default function Home() {
  const {
    mnemonic,
    setMnemonic,
    decryptedVault,
    encryptedVault,
    loadVault,
    saveVault,
  } = useVault();

  const [inputMnemonic, setInputMnemonic] = useState("");
  const [vaultInput, setVaultInput] = useState('{"entries":[{"site":"gmail","user":"me","pass":"123456"}]}');

  const handleLoad = async () => {
    try {
      await loadVault(encryptedVault || "", inputMnemonic);
    } catch (err) {
      alert("Decryption failed: " + err);
    }
  };

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(vaultInput);
      await saveVault(parsed);
      alert("Vault encrypted and stored in memory!");
    } catch (err) {
      alert("Encryption error: " + err);
    }
  };

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">🔐 Vault Manager (Test)</h1>

      <div className="space-y-2">
        <label className="font-semibold">Mnemonic:</label>
        <textarea
          className="w-full border p-2 rounded"
          rows={2}
          value={inputMnemonic}
          onChange={(e) => setInputMnemonic(e.target.value)}
        />
        <button
          className="mt-1 px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => {
            setMnemonic(inputMnemonic);
          }}
        >
          Set Mnemonic
        </button>
      </div>

      <div className="space-y-2">
        <label className="font-semibold">Vault JSON:</label>
        <textarea
          className="w-full border p-2 rounded"
          rows={4}
          value={vaultInput}
          onChange={(e) => setVaultInput(e.target.value)}
        />
        <div className="flex gap-4">
          <button
            className="px-4 py-2 bg-green-600 text-white rounded"
            onClick={handleSave}
          >
            Encrypt & Save
          </button>
          <button
            className="px-4 py-2 bg-purple-600 text-white rounded"
            onClick={handleLoad}
          >
            Decrypt & Load
          </button>
        </div>
      </div>

      {encryptedVault && (
        <div>
          <label className="font-semibold">🔒 Encrypted Vault (Base64):</label>
          <textarea
            className="w-full border p-2 rounded"
            rows={3}
            readOnly
            value={encryptedVault}
          />
        </div>
      )}

      {decryptedVault && (
        <div>
          <label className="font-semibold">🔓 Decrypted Vault:</label>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
            {JSON.stringify(decryptedVault, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}
