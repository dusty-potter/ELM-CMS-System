import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MANUFACTURER_DOMAINS: Record<string, string> = {
  phonak: 'phonak.com', signia: 'signia.net', oticon: 'oticon.com',
  starkey: 'starkey.com', resound: 'resound.com', widex: 'widex.com',
  unitron: 'unitron.com', beltone: 'beltone.com', audibel: 'audibel.com',
}

/**
 * POST /api/cms/images/search
 * Body: { manufacturer: string, query: string }
 *
 * Searches manufacturer website for product images by scraping
 * known URL patterns and extracting <img> tags.
 */
export async function POST(req: NextRequest) {
  const { manufacturer, query } = await req.json()

  if (!manufacturer || !query) {
    return NextResponse.json({ error: 'manufacturer and query are required' }, { status: 400 })
  }

  const domain = MANUFACTURER_DOMAINS[manufacturer.toLowerCase()] ?? `${manufacturer.toLowerCase()}.com`
  const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

  // Try multiple URL patterns for the product page
  const urls = [
    `https://www.${domain}/hearing-aids/${slug}`,
    `https://www.${domain}/en-us/hearing-aids/${slug}`,
    `https://www.${domain}/hearing-aids/${slug}/`,
    `https://www.${domain}/en-us/hearing-aids/${slug}/`,
    `https://www.${domain}/products/${slug}`,
    `https://www.${domain}/${slug}`,
  ]

  const imageUrls: string[] = []
  const seen = new Set<string>()
  let pageFound = false

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ELM-CMS-Bot/1.0 (image-search)' },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) continue
      pageFound = true

      const html = await res.text()
      const baseUrl = new URL(url).origin

      // Extract from <img src="">
      const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
      let match
      while ((match = imgRegex.exec(html)) !== null && imageUrls.length < 30) {
        let imgUrl = match[1]
        if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl
        else if (imgUrl.startsWith('/')) imgUrl = baseUrl + imgUrl
        if (imgUrl.includes('data:') || imgUrl.includes('.svg') || imgUrl.includes('1x1') ||
            imgUrl.includes('pixel') || imgUrl.includes('icon') || imgUrl.includes('logo') ||
            imgUrl.includes('sprite') || imgUrl.includes('spacer') || imgUrl.includes('tracking')) continue
        if (!imgUrl.match(/\.(jpg|jpeg|png|webp)/i) && !imgUrl.includes('/image/') && !imgUrl.includes('/media/')) continue
        if (seen.has(imgUrl)) continue
        seen.add(imgUrl)
        imageUrls.push(imgUrl)
      }

      // Extract from data-src and srcset
      const dataSrcRegex = /(?:data-src|srcset)=["']([^"'\s,]+)/gi
      while ((match = dataSrcRegex.exec(html)) !== null && imageUrls.length < 30) {
        let imgUrl = match[1]
        if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl
        else if (imgUrl.startsWith('/')) imgUrl = baseUrl + imgUrl
        if (imgUrl.includes('data:') || imgUrl.includes('.svg')) continue
        if (!imgUrl.match(/\.(jpg|jpeg|png|webp)/i) && !imgUrl.includes('/image/') && !imgUrl.includes('/media/')) continue
        if (seen.has(imgUrl)) continue
        seen.add(imgUrl)
        imageUrls.push(imgUrl)
      }

      // If we found images, stop trying more URLs
      if (imageUrls.length > 0) break
    } catch {
      continue
    }
  }

  return NextResponse.json({
    query,
    manufacturer,
    pageFound,
    images: imageUrls.map(url => ({
      url,
      type: 'gallery' as const,
      description: `From ${domain}`,
    })),
  })
}
