import { Storage } from '@google-cloud/storage'
import path from 'path'
import { randomUUID } from 'crypto'
import sharp from 'sharp'

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
    localUrl: `https://storage.googleapis.com/${BUCKET_NAME}/${gcsPath}`,
    contentType,
  }
}

/** Extract the GCS object path from either gs:// or https:// URL format */
function extractGcsPath(localUrl: string): string {
  return localUrl
    .replace(`gs://${BUCKET_NAME}/`, '')
    .replace(`https://storage.googleapis.com/${BUCKET_NAME}/`, '')
}

/**
 * Generates a short-lived signed URL so the app can serve a GCS file to a browser.
 */
export async function signedUrl(localUrl: string, expiresInSeconds = 3600): Promise<string> {
  if (!BUCKET_NAME) throw new Error('GCS_BUCKET_NAME is not configured')

  const gcsPath = extractGcsPath(localUrl)
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
 * Resolves a gs:// URL to a signed URL, or returns the input if it's already an http(s) URL.
 * Returns null for null/undefined inputs.
 */
export async function resolveImageUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('gs://')) {
    try {
      return await signedUrl(url, 3600)
    } catch {
      return null
    }
  }
  return url
}

/**
 * Resolves all image URLs in an object that has standard image fields.
 * Works on FormFactorImage and PlatformImage shapes.
 */
export async function resolveImageRecord(record: Record<string, unknown>): Promise<Record<string, unknown>> {
  const result = { ...record }
  const fields = ['localUrl', 'variantHeroWide', 'variantSquare', 'variantThumbnail']
  for (const field of fields) {
    if (field in result && typeof result[field] === 'string') {
      result[field] = await resolveImageUrl(result[field] as string)
    }
  }
  return result
}

/**
 * Deletes a file from GCS by its localUrl.
 */
export async function deleteImage(localUrl: string): Promise<void> {
  if (!BUCKET_NAME) throw new Error('GCS_BUCKET_NAME is not configured')
  const gcsPath = extractGcsPath(localUrl)
  await storage.bucket(BUCKET_NAME).file(gcsPath).delete({ ignoreNotFound: true })
}

// ---------------------------------------------------------------------------
// Standard image sizes for the CMS
// ---------------------------------------------------------------------------

export const IMAGE_SIZES = {
  hero:      { width: 1200, height: 800 },   // 3:2 hero banner
  square:    { width: 600,  height: 600 },    // 1:1 product card
  thumbnail: { width: 300,  height: 300 },    // 1:1 small thumbnail
} as const

/**
 * Downloads an image, processes it into standard sizes, converts to webp,
 * and uploads all variants to GCS.
 *
 * Returns paths for all generated variants.
 */
export async function processAndUploadImage(
  sourceUrl: string,
  folder: string,
  options?: { filename?: string; type?: 'hero' | 'gallery' },
): Promise<{
  sourceUrl: string
  localUrl: string
  variantHeroWide: string | null
  variantSquare: string | null
  variantThumbnail: string | null
  contentType: string
}> {
  if (!BUCKET_NAME) throw new Error('GCS_BUCKET_NAME is not configured')

  // Fetch the source image
  const fetchRes = await fetch(sourceUrl, {
    headers: { 'User-Agent': 'ELM-CMS-Bot/1.0 (image-download)' },
    signal: AbortSignal.timeout(15000),
  })
  if (!fetchRes.ok) {
    throw new Error(`Failed to fetch image from ${sourceUrl}: ${fetchRes.statusText}`)
  }

  const buffer = Buffer.from(await fetchRes.arrayBuffer())
  const baseName = options?.filename ?? randomUUID()
  const bucket = storage.bucket(BUCKET_NAME)

  // Process and upload the original as webp (full quality)
  const originalWebp = await sharp(buffer)
    .webp({ quality: 85 })
    .toBuffer()

  const originalPath = `${folder}/${baseName}-original.webp`
  await bucket.file(originalPath).save(originalWebp, {
    contentType: 'image/webp',
    metadata: { cacheControl: 'public, max-age=31536000' },
  })

  // Generate variants
  const variants: Record<string, string | null> = {
    variantHeroWide: null,
    variantSquare: null,
    variantThumbnail: null,
  }

  // Hero wide (3:2, cover crop)
  try {
    const heroBuffer = await sharp(buffer)
      .resize(IMAGE_SIZES.hero.width, IMAGE_SIZES.hero.height, {
        fit: 'cover',
        position: 'centre',
      })
      .webp({ quality: 82 })
      .toBuffer()

    const heroPath = `${folder}/${baseName}-hero.webp`
    await bucket.file(heroPath).save(heroBuffer, {
      contentType: 'image/webp',
      metadata: { cacheControl: 'public, max-age=31536000' },
    })
    variants.variantHeroWide = `https://storage.googleapis.com/${BUCKET_NAME}/${heroPath}`
  } catch (e) {
    console.error('Failed to generate hero variant:', e)
  }

  // Square (1:1, cover crop)
  try {
    const squareBuffer = await sharp(buffer)
      .resize(IMAGE_SIZES.square.width, IMAGE_SIZES.square.height, {
        fit: 'cover',
        position: 'centre',
      })
      .webp({ quality: 80 })
      .toBuffer()

    const squarePath = `${folder}/${baseName}-square.webp`
    await bucket.file(squarePath).save(squareBuffer, {
      contentType: 'image/webp',
      metadata: { cacheControl: 'public, max-age=31536000' },
    })
    variants.variantSquare = `https://storage.googleapis.com/${BUCKET_NAME}/${squarePath}`
  } catch (e) {
    console.error('Failed to generate square variant:', e)
  }

  // Thumbnail (1:1, small)
  try {
    const thumbBuffer = await sharp(buffer)
      .resize(IMAGE_SIZES.thumbnail.width, IMAGE_SIZES.thumbnail.height, {
        fit: 'cover',
        position: 'centre',
      })
      .webp({ quality: 75 })
      .toBuffer()

    const thumbPath = `${folder}/${baseName}-thumb.webp`
    await bucket.file(thumbPath).save(thumbBuffer, {
      contentType: 'image/webp',
      metadata: { cacheControl: 'public, max-age=31536000' },
    })
    variants.variantThumbnail = `https://storage.googleapis.com/${BUCKET_NAME}/${thumbPath}`
  } catch (e) {
    console.error('Failed to generate thumbnail variant:', e)
  }

  return {
    sourceUrl,
    localUrl: `https://storage.googleapis.com/${BUCKET_NAME}/${originalPath}`,
    variantHeroWide: variants.variantHeroWide,
    variantSquare: variants.variantSquare,
    variantThumbnail: variants.variantThumbnail,
    contentType: 'image/webp',
  }
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
