"use client";

import { useState } from "react";
import { Wallet, HDNodeWallet } from "ethers";
import useVault from "@/hooks/useVault";

export default function VaultPage() {
  const [mnemonicInput, setMnemonicInput] = useState("");
  const [wallet, setWallet] = useState<Wallet | HDNodeWallet | null>(null);

  const { vault, addEntry, getDecryptedPassword, deleteEntry, vaultCid } = useVault(wallet);

  const handleCreateWallet = () => {
  const newWallet = Wallet.createRandom();
  if (newWallet.mnemonic) {
    console.log("Mnemonic:", newWallet.mnemonic.phrase);
  } else {
    console.error("No mnemonic generated.");
  }
  console.log("Address:", newWallet.address);
  setWallet(newWallet);
};


  const handleImportWallet = () => {
    try {
      const importedWallet = Wallet.fromMnemonic(mnemonicInput.trim());
      console.log("Imported Address:", importedWallet.address);
      setWallet(importedWallet);
    } catch (err) {
      alert("Invalid mnemonic");
    }
  };

  const handleAddEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const site = (form.elements.namedItem("site") as HTMLInputElement).value;
    const username = (form.elements.namedItem("username") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    await addEntry(site, username, password);
    form.reset();
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">🛡️ Web3 Password Vault</h1>

      {/* Wallet Section */}
      {!wallet ? (
        <div className="space-y-4">
          <button
            onClick={handleCreateWallet}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Create New Wallet
          </button>

          <div>
            <input
              type="text"
              placeholder="Enter mnemonic to import wallet"
              value={mnemonicInput}
              onChange={(e) => setMnemonicInput(e.target.value)}
              className="border px-2 py-1 rounded w-full mb-2"
            />
            <button
              onClick={handleImportWallet}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Import Wallet
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-sm text-gray-700">✅ Wallet connected: {wallet.address}</p>
          {vaultCid && (
            <p className="text-xs text-gray-500">
              Vault CID: {vaultCid}
            </p>
          )}
        </div>
      )}

      {/* Add Entry Form */}
      {wallet && (
        <form onSubmit={handleAddEntry} className="space-y-2 border-t pt-4 mt-4">
          <h2 className="text-xl font-semibold">Add New Password</h2>
          <input
            type="text"
            name="site"
            placeholder="Site"
            required
            className="border px-2 py-1 rounded w-full"
          />
          <input
            type="text"
            name="username"
            placeholder="Username"
            required
            className="border px-2 py-1 rounded w-full"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            className="border px-2 py-1 rounded w-full"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Save
          </button>
        </form>
      )}

      {/* Vault Display */}
      {wallet && vault.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Your Vault</h2>
          <ul className="space-y-2">
            {vault.map((entry) => (
              <li key={entry.id} className="border p-2 rounded">
                <p className="font-medium">{entry.site}</p>
                <p>{entry.username}</p>
                <button
                  onClick={async () => {
                    const decrypted = await getDecryptedPassword(entry);
                    alert(`Password for ${entry.site}: ${decrypted}`);
                  }}
                  className="text-sm text-blue-600 hover:underline mr-2"
                >
                  Show Password
                </button>
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
