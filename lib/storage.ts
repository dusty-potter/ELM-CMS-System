import { Storage } from '@google-cloud/storage'
import path from 'path'
import { randomUUID } from 'crypto'

const storage = new Storage() // Uses ADC automatically on Cloud Run; locally run: gcloud auth application-default login
const BUCKET_NAME = process.env.GCS_BUCKET_NAME

if (!BUCKET_NAME) {
  console.warn('GCS_BUCKET_NAME is not set — image storage will not work')
}

/**
 * Downloads an image from a remote URL and uploads it to GCS.
 * Returns the public-ish GCS path (gs://bucket/path) stored as localUrl.
 * Images are never served directly from GCS — the app proxies them.
 *
 * @param sourceUrl  The remote URL to download from
 * @param folder     Subfolder in the bucket, e.g. 'form-factors/cuid123'
 * @param filename   Optional filename override; defaults to UUID + detected extension
 */
export async function uploadImageFromUrl(
  sourceUrl: string,
  folder: string,
  filename?: string,
): Promise<{ localUrl: string; contentType: string }> {
  if (!BUCKET_NAME) throw new Error('GCS_BUCKET_NAME is not configured')

  const fetchRes = await fetch(sourceUrl)
  if (!fetchRes.ok) {
    throw new Error(`Failed to fetch image from ${sourceUrl}: ${fetchRes.statusText}`)
  }

  const contentType = fetchRes.headers.get('content-type') ?? 'image/jpeg'
  const ext = extensionFromContentType(contentType)
  const name = filename ?? `${randomUUID()}${ext}`
  const gcsPath = `${folder}/${name}`

  const buffer = Buffer.from(await fetchRes.arrayBuffer())
  const bucket = storage.bucket(BUCKET_NAME)
  const file = bucket.file(gcsPath)

  await file.save(buffer, {
    contentType,
    metadata: { cacheControl: 'public, max-age=31536000' },
  })

  return {
    localUrl: `gs://${BUCKET_NAME}/${gcsPath}`,
    contentType,
  }
}

/**
 * Generates a short-lived signed URL so the app can serve a GCS file to a browser.
 * Use this in API routes that return image data — never expose the gs:// URL directly.
 */
export async function signedUrl(localUrl: string, expiresInSeconds = 3600): Promise<string> {
  if (!BUCKET_NAME) throw new Error('GCS_BUCKET_NAME is not configured')

  const gcsPath = localUrl.replace(`gs://${BUCKET_NAME}/`, '')
  const [url] = await storage
    .bucket(BUCKET_NAME)
    .file(gcsPath)
    .getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresInSeconds * 1000,
    })

  return url
}

/**
 * Deletes a file from GCS by its localUrl (gs://... path).
 */
export async function deleteImage(localUrl: string): Promise<void> {
  if (!BUCKET_NAME) throw new Error('GCS_BUCKET_NAME is not configured')
  const gcsPath = localUrl.replace(`gs://${BUCKET_NAME}/`, '')
  await storage.bucket(BUCKET_NAME).file(gcsPath).delete({ ignoreNotFound: true })
}

function extensionFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
  }
  return map[contentType.split(';')[0].trim()] ?? path.extname(contentType) ?? '.jpg'
}
