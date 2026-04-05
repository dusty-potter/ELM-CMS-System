// GCP Secret Manager + Cloud Run service URL operations.
// Uses @google-cloud/secret-manager SDK (auth via ADC on Cloud Run,
// or service account key locally).

import { SecretManagerServiceClient } from '@google-cloud/secret-manager'

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'gen-lang-client-0546798119'
const CLOUD_RUN_REGION = process.env.CLOUD_RUN_REGION || 'us-central1'

let smClient: SecretManagerServiceClient | null = null

function getSecretManagerClient(): SecretManagerServiceClient {
  if (!smClient) {
    smClient = new SecretManagerServiceClient()
  }
  return smClient
}

/**
 * Create a GCP Secret Manager secret and add a version with the given value.
 * If the secret already exists, just adds a new version.
 */
export async function createOrUpdateSecret(secretId: string, value: string): Promise<void> {
  const client = getSecretManagerClient()
  const parent = `projects/${PROJECT_ID}`

  // Try to create the secret (ignore if already exists)
  try {
    await client.createSecret({
      parent,
      secretId,
      secret: {
        replication: { automatic: {} },
      },
    })
    console.log(`[pipeline] Created GCP secret: ${secretId}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (!msg.includes('ALREADY_EXISTS')) throw err
    console.log(`[pipeline] GCP secret ${secretId} already exists, adding version`)
  }

  // Add the secret value as a new version
  await client.addSecretVersion({
    parent: `${parent}/secrets/${secretId}`,
    payload: { data: Buffer.from(value) },
  })

  console.log(`[pipeline] GCP secret version added: ${secretId}`)
}

/**
 * Create all client-specific GCP secrets needed for Cloud Run deployment.
 */
export async function createClientSecrets(
  slug: string,
  siteId: string,
  apiKey: string,
  cmsBaseUrl: string,
  revalidateSecret: string,
  formWebhookUrl: string
): Promise<Record<string, string>> {
  // Map of GCP Secret Manager secret names → values
  const secrets: Record<string, string> = {
    [`elm-${slug}-site-id`]: siteId,
    [`elm-${slug}-api-key`]: apiKey,
    [`elm-${slug}-cms-base-url`]: cmsBaseUrl,
    [`elm-${slug}-revalidate`]: revalidateSecret,
    [`elm-${slug}-form-webhook`]: formWebhookUrl,
  }

  for (const [secretId, value] of Object.entries(secrets)) {
    await createOrUpdateSecret(secretId, value)
  }

  return secrets
}

/**
 * Get the URL of a Cloud Run service using the REST API.
 */
export async function getCloudRunServiceUrl(serviceName: string): Promise<string | null> {
  try {
    // Use the Cloud Run Admin v2 API
    const url = `https://run.googleapis.com/v2/projects/${PROJECT_ID}/locations/${CLOUD_RUN_REGION}/services/${serviceName}`

    // Get access token from ADC (works on Cloud Run, locally needs gcloud auth)
    const { GoogleAuth } = await import('google-auth-library')
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })
    const client = await auth.getClient()
    const tokenResponse = await client.getAccessToken()

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tokenResponse.token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      console.error(`[pipeline] Cloud Run API ${res.status}: ${await res.text()}`)
      return null
    }

    const data = await res.json()
    return (data as { uri?: string }).uri ?? null
  } catch (err) {
    console.error('[pipeline] Failed to get Cloud Run URL:', err)
    return null
  }
}
