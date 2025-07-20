'use client';

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { useVault } from "@/hooks/useVault";

export default function VaultPage() {
  const { data: session } = useSession();
  const {
    mnemonic,
    setMnemonic,
    decryptedVault,
    addEntry,
    saveToServer,
    loadFromServer,
  } = useVault();

  const [site, setSite] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showMnemonicUI, setShowMnemonicUI] = useState(true); // first-time entry

  useEffect(() => {
    if (!session?.user?.email) redirect("/auth/signin");
  }, [session]);

  const handleMnemonicSubmit = async () => {
    await loadFromServer(mnemonic);
    setShowMnemonicUI(false);
  };

  const handleAdd = () => {
    if (!site || !username || !password) return;
    addEntry({ site, username, password });
    setSite("");
    setUsername("");
    setPassword("");
  };

  const handleSave = async () => {
    await saveToServer();
    alert("Vault saved!");
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">🔐 Secure Vault</h1>

      {/* 🔑 Mnemonic UI */}
      {showMnemonicUI ? (
        <div className="space-y-3">
          <p>Enter your recovery mnemonic to unlock your vault:</p>
          <input
            type="text"
            placeholder="Your 12-word mnemonic"
            className="w-full border p-2 rounded"
            value={mnemonic}
            onChange={(e) => setMnemonic(e.target.value)}
          />
          <button
            onClick={handleMnemonicSubmit}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            🔓 Unlock Vault
          </button>
        </div>
      ) : (
        <>
          {/* 🧾 Add Entry Form */}
          <div className="space-y-2 mb-6">
            <h2 className="text-lg font-semibold">Add New Entry</h2>
            <input
              type="text"
              placeholder="Site"
              className="w-full border p-2 rounded"
              value={site}
              onChange={(e) => setSite(e.target.value)}
            />
            <input
              type="text"
              placeholder="Username"
              className="w-full border p-2 rounded"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full border p-2 rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              onClick={handleAdd}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              ➕ Add Entry
            </button>
          </div>

          {/* 💾 Save Button */}
          <button
            onClick={handleSave}
            className="mb-4 bg-blue-700 text-white px-4 py-2 rounded"
          >
            💾 Save Vault
          </button>

          {/* 📦 Vault List */}
          <div>
            <h2 className="text-lg font-semibold mb-2">Your Entries</h2>
            {decryptedVault?.length === 0 && (
              <p className="text-gray-500 text-sm">No entries yet.</p>
            )}
            <ul className="space-y-2">
              {decryptedVault?.map((entry) => (
                <li
                  key={entry.id}
                  className="border p-2 rounded bg-gray-50"
                >
                  <strong>{entry.site}</strong> – {entry.username}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
