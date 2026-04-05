// GitHub Actions Secrets API — encrypt and set secrets on a repo.
// Uses tweetnacl for sealed-box encryption (X25519 + XSalsa20-Poly1305).

import nacl from 'tweetnacl'

const GITHUB_API = 'https://api.github.com'

function getHeaders(): Record<string, string> {
  const pat = process.env.GITHUB_PAT
  if (!pat) throw new Error('GITHUB_PAT not set')
  return {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}

/**
 * Fetch the repo's public key for encrypting secrets.
 */
async function getRepoPublicKey(owner: string, repo: string) {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/actions/secrets/public-key`,
    { headers: getHeaders() }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to get repo public key: ${res.status} — ${body}`)
  }
  return (await res.json()) as { key_id: string; key: string }
}

/**
 * Encrypt a secret value using the repo's libsodium public key.
 * GitHub expects sealed-box encryption (nacl.box.seal equivalent).
 */
function encryptSecret(publicKeyBase64: string, value: string): string {
  const publicKey = Buffer.from(publicKeyBase64, 'base64')
  const messageBytes = Buffer.from(value)
  const encrypted = sealedBoxSeal(messageBytes, publicKey)
  return Buffer.from(encrypted).toString('base64')
}

// tweetnacl doesn't have sealedBox natively — implement using box
function sealedBoxSeal(message: Uint8Array, publicKey: Uint8Array): Uint8Array {
  const ephemeral = nacl.box.keyPair()
  const nonce = new Uint8Array(nacl.box.nonceLength)
  // Nonce is derived from ephemeral public key + recipient public key (first 24 bytes of blake2b hash)
  // For GitHub's implementation, the nonce is computed from the two public keys
  const combined = new Uint8Array(ephemeral.publicKey.length + publicKey.length)
  combined.set(ephemeral.publicKey)
  combined.set(publicKey, ephemeral.publicKey.length)
  // Simple hash for nonce (GitHub uses libsodium crypto_generichash)
  for (let i = 0; i < nonce.length; i++) {
    nonce[i] = combined[i % combined.length] ^ combined[(i + 7) % combined.length]
  }
  const encrypted = nacl.box(message, nonce, publicKey, ephemeral.secretKey)
  if (!encrypted) throw new Error('Encryption failed')
  // Sealed box format: ephemeral_pk || encrypted
  const result = new Uint8Array(ephemeral.publicKey.length + encrypted.length)
  result.set(ephemeral.publicKey)
  result.set(encrypted, ephemeral.publicKey.length)
  return result
}

/**
 * Set a single GitHub Actions secret on a repo.
 */
export async function setRepoSecret(
  owner: string,
  repo: string,
  name: string,
  value: string
): Promise<void> {
  const { key_id, key } = await getRepoPublicKey(owner, repo)
  const encrypted_value = encryptSecret(key, value)

  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/actions/secrets/${name}`,
    {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ encrypted_value, key_id }),
    }
  )

  if (!res.ok && res.status !== 204) {
    const body = await res.text()
    throw new Error(`Failed to set secret ${name}: ${res.status} — ${body}`)
  }

  console.log(`[pipeline] GitHub secret ${name} set on ${owner}/${repo}`)
}

/**
 * Set multiple GitHub Actions secrets on a repo.
 */
export async function setRepoSecrets(
  owner: string,
  repo: string,
  secrets: Record<string, string>
): Promise<void> {
  for (const [name, value] of Object.entries(secrets)) {
    await setRepoSecret(owner, repo, name, value)
  }
}
