import { NFTStorage, File } from 'nft.storage';

function getAccessToken() {
  return process.env.NEXT_PUBLIC_NFTSTORAGE_TOKEN || "";
}

function makeStorageClient() {
  return new NFTStorage({ token: getAccessToken() });
}

export async function uploadVaultToIPFS(vault: any): Promise<string> {
  const client = makeStorageClient();
  const blob = new Blob([JSON.stringify(vault)], { type: 'application/json' });
  const files = [new File([blob], 'vault.json')];
  const cid = await client.storeDirectory(files);
  console.log('Vault uploaded with CID:', cid);
  return cid;
}

export async function fetchVaultFromIPFS(cid: string): Promise<any> {
  const client = makeStorageClient();
  const res = await fetch(`https://${cid}.ipfs.nftstorage.link/vault.json`);
  if (!res.ok) {
    throw new Error(`Failed to fetch vault from IPFS with cid ${cid}`);
  }
  return await res.json();
}
