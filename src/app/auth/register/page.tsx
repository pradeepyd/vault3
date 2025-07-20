"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    });

    let data;
    try {
      data = await res.json(); // safely handle response
    } catch {
      data = { error: "Invalid response from server." };
    }

    setLoading(false);

    if (res.ok) {
      alert("✅ Account created. Please log in.");
      router.push("/auth/signin");
    } else {
      alert(`❌ ${data.error || "Registration failed."}`);
    }
  }

  return (
    <form onSubmit={handleRegister} className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold">Register</h1>

      <input
        className="w-full border p-2 rounded"
        type="text"
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <input
        className="w-full border p-2 rounded"
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        className="w-full border p-2 rounded"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white p-2 rounded"
      >
        {loading ? "Registering..." : "Register"}
      </button>
    </form>
  );
}
