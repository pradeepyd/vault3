// lib/storage.ts

export async function uploadVaultToLocalStorage(vault: any): Promise<string> {
  const json = JSON.stringify(vault);
  localStorage.setItem("vault", json);
  console.log("✅ Vault saved to localStorage.");
  return "localstorage"; // dummy CID equivalent
}

export async function fetchVaultFromLocalStorage(): Promise<any | null> {
  const json = localStorage.getItem("vault");
  if (!json) {
    console.warn("⚠️ No vault found in localStorage.");
    return null;
  }
  const data = JSON.parse(json);
  console.log("✅ Vault fetched from localStorage:", data);
  return data;
}
