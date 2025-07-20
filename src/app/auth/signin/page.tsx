// pages/auth/signin.tsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/vault",
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      alert(res.error);
    } else {
      window.location.href = "/vault"; // redirect manually
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold">Sign In</h1>

      <button
        onClick={() => signIn("google", { callbackUrl: "/vault" })}
        className="w-full bg-red-600 text-white p-2 rounded"
      >
        Sign in with Google
      </button>

      <div className="text-center font-medium py-2">or</div>

      <form onSubmit={handleLogin} className="space-y-2">
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
          {loading ? "Logging in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
