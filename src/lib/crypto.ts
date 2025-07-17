// lib/crypto.ts

/**
 * AES-GCM encryption using Web Crypto API
 * @param data - Plain text to encrypt
 * @param key - CryptoKey for encryption (derived from wallet)
 * @returns Base64 encoded cipher text with IV
 */
export async function encryptData(data: string, key: CryptoKey): Promise<string> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit nonce recommended for AES-GCM

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(data)
  );

  // Combine IV + ciphertext and encode in Base64 for storage
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);

  return btoa(String.fromCharCode(...combined));
}

/**
 * AES-GCM decryption using Web Crypto API
 * @param encrypted - Base64 encoded cipher text with IV
 * @param key - CryptoKey for decryption
 * @returns Decrypted plain text
 */
export async function decryptData(encrypted: string, key: CryptoKey): Promise<string> {
  const data = atob(encrypted);
  const combined = new Uint8Array([...data].map(char => char.charCodeAt(0)));

  const iv = combined.slice(0, 12); // First 12 bytes = IV
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Derive a CryptoKey from a raw Uint8Array key material (e.g. wallet private key)
 * @param rawKey - Uint8Array key material
 * @returns CryptoKey usable for AES-GCM
 */
export async function importEncryptionKey(rawKey: Uint8Array): Promise<CryptoKey> {
  // Hash the private key to derive a fixed length 256-bit key for AES-GCM
  const hashedKey = await crypto.subtle.digest("SHA-256", rawKey);

  return crypto.subtle.importKey(
    "raw",
    hashedKey,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}
