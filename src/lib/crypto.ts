import * as bip39 from "bip39";
import { HDNodeWallet } from "ethers";

/**
 * Generate a new 12-word BIP-39 mnemonic phrase
 */
export function generateMnemonic(): string {
  return bip39.generateMnemonic(); // 128-bit entropy
}

/**
 * Derive the private key from a BIP-39 mnemonic using ethers HD wallet
 * Throws error if mnemonic is invalid
 */
export function getPrivateKey(mnemonic: string): string {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error("Invalid mnemonic");
  }
  return HDNodeWallet.fromPhrase(mnemonic).privateKey; // 0x-prefixed hex string
}

/**
 * Derive AES-GCM key from the private key using SHA-256
 * This CryptoKey will be used for encryption/decryption
 */
export async function getAesKey(privateKey: string): Promise<CryptoKey> {
  const hex = privateKey.replace(/^0x/, "");
  const raw = Uint8Array.from(Buffer.from(hex, "hex"));
  const hash = await crypto.subtle.digest("SHA-256", raw); // 256-bit uniform key

  return crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt plain text using AES-GCM and return base64 encoded (IV + ciphertext)
 */
export async function encrypt(plainText: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const data = new TextEncoder().encode(plainText);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  // Combine IV + ciphertext
  const encryptedBytes = new Uint8Array(encrypted);
  const combined = new Uint8Array(iv.length + encryptedBytes.length);
  combined.set(iv, 0);
  combined.set(encryptedBytes, iv.length);

  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt base64 encoded (IV + ciphertext) using AES-GCM
 */
export async function decrypt(encoded: string, key: CryptoKey): Promise<string> {
  const binary = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const iv = binary.slice(0, 12); // first 12 bytes = IV
  const ciphertext = binary.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}
