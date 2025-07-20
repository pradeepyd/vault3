
export interface VaultEntry {
  id: string;
  site: string;
  username: string;
  password: string;
}

export interface UseVaultResult {
  vault: VaultEntry[];
  loading: boolean;
  error: string | null;
  addEntry: (entry: Omit<VaultEntry, "id">) => void;
  removeEntry: (id: string) => void;
  saveVault: () => Promise<void>;
}
