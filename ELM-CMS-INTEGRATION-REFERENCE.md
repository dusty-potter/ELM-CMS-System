# ELM CMS — Integration Reference

**Ear Level Marketing Content Management System**
A headless CMS for hearing aid product content, built on Next.js 14, PostgreSQL, and Google Cloud.

---

## Source Code & Access

### GitHub Repository
- **Repo**: `github.com/dusty-potter/ELM-CMS-System`
- **Branch**: `main` (production)
- **Clone**: `git clone https://github.com/dusty-potter/ELM-CMS-System.git`

### Live Application
- **URL**: `https://ear-level-cms-429266701915.us-west1.run.app`
- **Cloud Run Service**: `ear-level-cms` in `us-west1`
- **GCP Project**: `gen-lang-client-0546798119`

### Google Cloud Console
- **Cloud Run**: Console → Cloud Run → `ear-level-cms` (us-west1)
- **Cloud SQL**: Console → SQL → `elm-cms-postgres` (PostgreSQL 18, us-west1)
- **Cloud Storage**: Bucket `elm-cms-media`
- **Cloud Build**: Auto-deploys on push to `main` via buildpacks (no Dockerfile)

### Database Access (Local Dev)
```bash
# Install Cloud SQL Auth Proxy
brew install cloud-sql-proxy

# Authenticate
gcloud auth login
gcloud auth application-default login
gcloud config set project gen-lang-client-0546798119

# Start proxy (keep running in background)
cloud-sql-proxy gen-lang-client-0546798119:us-west1:elm-cms-postgres --port=5432

# Connect via Prisma
DATABASE_URL='postgresql://elm-cms:ElmCms-Prod-2026@127.0.0.1:5432/elm_cms' npx prisma studio
```

### Prisma Commands
```bash
npx prisma generate        # Regenerate client from schema
npx prisma migrate deploy  # Apply pending migrations to production
npx prisma migrate dev     # Create new migration (dev only)
npx prisma studio          # Visual database browser
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, standalone output) | 14.2.x |
| Language | TypeScript | 5.6.x |
| Database | PostgreSQL via Prisma ORM | PG 18 / Prisma 5.22 |
| AI Research | Anthropic Claude Sonnet 4.6 | SDK 0.82+ |
| Image Processing | Sharp (webp conversion, 3 responsive variants) | 0.34.x |
| Media Storage | Google Cloud Storage | 7.19.x |
| Auth | NextAuth.js 4 (email/password, JWT sessions) | 4.24.x |
| Hosting | Google Cloud Run (buildpacks, auto-deploy on push) | — |
| Styling | Tailwind CSS 3 | 3.4.x |

---

## Environment Variables

```bash
# PostgreSQL — Cloud SQL via proxy (dev) or Unix socket (prod)
DATABASE_URL="postgresql://elm-cms:ElmCms-Prod-2026@127.0.0.1:5432/elm_cms"

# App URL
NEXT_PUBLIC_APP_URL="https://ear-level-cms-429266701915.us-west1.run.app"

# AI Research — Anthropic Claude
ANTHROPIC_API_KEY="sk-ant-..."

# NextAuth
NEXTAUTH_SECRET="..."     # openssl rand -hex 32
NEXTAUTH_URL="https://ear-level-cms-429266701915.us-west1.run.app"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Google Cloud Storage
GCS_BUCKET_NAME="elm-cms-media"

# Server-to-server auth (for future webhook delivery)
INTERNAL_API_SECRET="..."  # openssl rand -hex 32
```

---

## Data Model

### Hierarchy
```
Manufacturer (brand — e.g., Signia, Phonak)
  └── Platform (technology generation — e.g., IX, Infinio)
        ├── PlatformCapability (capability pool)
        ├── FittingOption (e.g., CROS — not a product)
        ├── PlatformImage (hero/gallery at platform level)
        └── Product (tier within platform — e.g., 7IX premium, 5IX advanced)
              ├── ProductCapabilityDeclaration (subset of platform pool)
              ├── ContentVariant (AI-generated description rewrites)
              ├── SitePublication (gate for delivery to a site)
              └── FormFactor (physical device style — e.g., Pure C&Go RIC)
                    ├── FormFactorCapabilityDeclaration
                    ├── FormFactorCapabilityExclusion
                    └── FormFactorImage (hero/gallery per style)

Site (connected client website)
  ├── SiteManufacturer (which brands a site carries)
  └── SitePublication (per-product publication gate)
```

### Key Design Rules
- All AI-ingested records land in `draft`. Nothing auto-publishes.
- `canonicalDescription` on Product is human-controlled. AI rewrites produce `ContentVariant` rows.
- Product status `published` does NOT mean it's live on a site. A `SitePublication` with status `published` must also exist.
- Capability inheritance is DB-enforced: FormFactor → Product → Platform capability pool.
- Images are downloaded at ingest time and stored in GCS. Never hotlinked.
- `retired` status means previously published, now withdrawn from all sites.
- `isLegacy` on Platform flags predecessor platforms excluded from active display.

### Enums

| Enum | Values |
|------|--------|
| PublishStatus | `draft`, `approved`, `published`, `retired` |
| ProductTier | `premium`, `advanced`, `standard`, `essential` |
| FormFactorStyle | `RIC`, `BTE`, `ITE`, `CIC`, `IIC`, `miniRITE`, `slimRIC`, `other` |
| BatteryType | `disposable`, `rechargeable` |
| CapabilityCategory | `processing`, `connectivity`, `health`, `physical` |
| ComparisonLevel | `low`, `medium`, `high` |
| ConfidenceLevel | `high`, `medium`, `low` |
| ImageType | `hero`, `gallery` |
| VariantScope | `global`, `site_specific` |
| SitePublicationStatus | `pending`, `published`, `failed` |
| UserRole | `admin`, `editor`, `viewer` |

---

## Complete API Reference

### Ingestion / AI Research

#### `POST /api/ingest/enumerate`
Enumerate a manufacturer's full product lineup organized by platform.
```json
// Request
{ "manufacturer": "Signia", "url": "https://optional-hint-url.com" }

// Response
{
  "manufacturer": "Signia",
  "platforms": [
    {
      "name": "IX",
      "displayName": "Signia Integrated Xperience",
      "generationYear": 2023,
      "isLegacy": false,
      "tiers": [
        { "id": "7IX", "label": "7IX", "tier": "premium" }
      ],
      "formFactors": [
        { "name": "Pure Charge&Go IX", "style": "RIC", "availableTiers": ["7IX","5IX","3IX"], "notes": null }
      ],
      "fittingOptions": [
        { "name": "CROS IX", "description": "...", "styles": ["RIC","BTE"] }
      ]
    }
  ]
}
```

#### `POST /api/ingest/platform`
Research an entire platform family in one AI call.
```json
// Request
{
  "manufacturer": "Signia",
  "platform": { "name": "IX", "tiers": [...], "formFactors": [...], "fittingOptions": [...] }
}

// Response
{
  "manufacturer": "Signia",
  "platform": "IX",
  "research": {
    "summary": "...",
    "keyDifferentiators": ["..."],
    "techTerms": ["..."],
    "connectivity": { "ios": true, "android": true, "bluetooth": true, ... },
    "capabilities": [{ "key": "...", "label": "...", "category": "...", "description": "..." }],
    "tiers": [{
      "id": "7IX", "tier": "premium",
      "canonicalDescription": "...", "bestFor": [...], "pros": [...], "cons": [...],
      "targetUser": "...", "hearingLossRange": [...],
      "compSpeechInNoise": "high", "compMusicQuality": "high", ...
    }],
    "formFactors": [{
      "name": "Pure Charge&Go IX", "style": "RIC", "availableTiers": [...],
      "batteryType": "rechargeable", "ipRating": "IP68", "colors": [...], ...
    }],
    "fittingOptions": [{ "name": "CROS IX", "description": "...", "styles": [...] }],
    "imageUrls": [{ "url": "https://...", "type": "hero", "description": "...", "formFactorName": "..." }],
    "confidenceLevel": "high"
  }
}
```

#### `POST /api/ingest` (legacy — single product)
Research a single product by model name.
```json
// Request
{ "manufacturer": "Signia", "modelName": "Pure Charge&Go IX" }

// Response
{ "manufacturer": "...", "modelName": "...", "product": { /* detailed specs */ } }
```

### CMS Save

#### `POST /api/cms/save-platform`
Create/update full hierarchy in one transaction.
```json
// Request
{
  "manufacturer": "Signia",
  "platform": { "name": "IX", "displayName": "...", "generationYear": 2023, "isLegacy": false, "tiers": [...], "formFactors": [...], "fittingOptions": [...] },
  "research": { /* full research object from /api/ingest/platform */ }
}

// Response
{
  "platformId": "cuid...",
  "manufacturerId": "cuid...",
  "productIds": ["cuid...", ...],
  "formFactorIds": ["cuid...", ...],
  "fittingOptionIds": ["cuid...", ...]
}
```

#### `POST /api/cms/save` (legacy — single product)
Upsert a single product record chain.
```json
// Request
{ "manufacturer": "Signia", "modelName": "Pure Charge&Go IX", "product": { /* research data */ } }

// Response
{ "productId": "...", "platformId": "...", "manufacturerId": "...", "slug": "...", "formFactorIds": [...] }
```

### Platforms CRUD

#### `GET /api/cms/platforms`
List all platforms with counts.
```json
// Response: Array of platforms
[{
  "id": "...", "name": "IX", "displayName": "...", "slug": "ix",
  "generationYear": 2023, "status": "draft", "isLegacy": false,
  "manufacturer": { "name": "Signia" },
  "_count": { "products": 3, "formFactors": 34, "fittingOptions": 1 }
}]
```

#### `GET /api/cms/platforms/[id]`
Full platform with all relations (products, form factors, capabilities, images, fitting options).

#### `PATCH /api/cms/platforms/[id]`
Update platform fields. When `status: "retired"`, cascades: deletes all SitePublications, sets all child products to retired.

**Allowed fields**: `displayName`, `summary`, `keyDifferentiators`, `techTerms`, `status`, `isLegacy`, `generationYear`, connectivity booleans.

#### `DELETE /api/cms/platforms/[id]`
Hard delete. Fails with 409 if any products are published to sites. Deletes all child products, form factors, capabilities, etc.

### Products CRUD

#### `GET /api/cms/products`
List all products with manufacturer, platform, form factors, counts.

#### `GET /api/cms/products/[id]`
Full product with form factors (including images), capabilities, variants, publications.

#### `PATCH /api/cms/products/[id]`
Update product fields. When `status: "retired"`, deletes all SitePublications.

#### `DELETE /api/cms/products/[id]`
Hard delete. Fails with 409 if published to sites. Cascades form factors, variants, publications.

### Manufacturers

#### `GET /api/cms/manufacturers`
List all manufacturers with platform/product counts.

#### `PATCH /api/cms/manufacturers`
Update manufacturer. Body: `{ "id": "...", "logoUrl": "..." }`

### Images

#### `POST /api/cms/images`
Process and upload images. Three modes:

**Form factor images:**
```json
{ "formFactorId": "...", "images": [{ "url": "https://...", "type": "hero" }] }
```

**Platform images:**
```json
{ "platformId": "...", "images": [{ "url": "https://...", "type": "gallery" }] }
```

**Manufacturer logo:**
```json
{ "manufacturerId": "...", "isLogo": true, "images": [{ "url": "https://..." }] }
```

All images are downloaded, converted to webp, resized to 3 variants (hero 1200x800, square 600x600, thumbnail 300x300), and uploaded to GCS.

#### `POST /api/cms/images/search`
Search manufacturer website for product images.
```json
// Request
{ "manufacturer": "Signia", "query": "Pure Charge&Go IX" }

// Response
{
  "query": "...", "manufacturer": "...", "pageFound": true,
  "images": [{ "url": "https://...", "type": "gallery", "description": "From signia.net" }]
}
```

### Sites

#### `GET /api/cms/sites`
List all connected sites.

#### `POST /api/cms/sites`
Create a new site.
```json
{ "id": "my-site-slug", "name": "My Site", "domain": "example.com", "webhookUrl": "https://...", "githubRepo": "owner/repo" }
```

#### `DELETE /api/cms/sites`
Delete a site. Body: `{ "id": "..." }`

### Users

#### `GET /api/cms/users`
List all CMS users.

#### `POST /api/cms/users`
Create user. Body: `{ "email": "...", "name": "...", "password": "...", "role": "editor" }`

#### `PATCH /api/cms/users`
Update user. Body: `{ "id": "...", "role": "admin", "active": true }`

#### `DELETE /api/cms/users`
Delete user. Body: `{ "id": "..." }`

### Storage

#### `POST /api/storage/upload`
Direct image upload to GCS.
```json
{ "sourceUrl": "https://...", "folder": "form-factors/abc123", "filename": "optional-name" }
```

### Auth

#### `GET/POST /api/auth/[...nextauth]`
NextAuth handler (login, session, CSRF).

#### `POST /api/cms/account/password`
Change password (requires active session).
```json
{ "currentPassword": "...", "newPassword": "..." }
```

---

## Image Processing Pipeline

All images go through `processAndUploadImage()` in `lib/storage.ts`:

1. **Download** source URL with User-Agent header
2. **Convert** to webp (85% quality for original)
3. **Generate 3 variants**:
   - `hero-wide`: 1200x800 (3:2, cover crop, 82% quality)
   - `square`: 600x600 (1:1, cover crop, 80% quality)
   - `thumbnail`: 300x300 (1:1, cover crop, 75% quality)
4. **Upload** all 4 files to GCS with `public, max-age=31536000` cache
5. **Return** paths: `{ localUrl, variantHeroWide, variantSquare, variantThumbnail }`

Storage paths: `{folder}/{uuid}-{variant}.webp` (e.g., `form-factors/abc123/550e8400-hero-wide.webp`)

---

## Database Schema (Prisma)

The full schema is at `prisma/schema.prisma`. Key tables:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `manufacturers` | Brands | name, slug, logoUrl, aliases[], approvedDomains[] |
| `platforms` | Technology generations | name, displayName, slug, isLegacy, summary, connectivity flags |
| `fitting_options` | CROS/BiCROS configs | name, description, styles[] |
| `platform_capabilities` | Capability pool | key, label, category, description |
| `products` | Tier within platform | name, tier, canonicalDescription, positioning, comparison data |
| `form_factors` | Physical device styles | style, battery, connectivity, colors[], receiverOptions[] |
| `form_factor_images` | Per-FF images | type, sourceUrl, localUrl, 3 variant URLs |
| `platform_images` | Platform-level images | same fields as FF images |
| `content_variants` | AI-generated rewrites | text, scope, siteId, aiGenerated, modelName |
| `sites` | Connected client sites | domain, apiKey, webhookUrl, githubRepo, cloudRunService |
| `site_publications` | Delivery gate | productId, siteId, status, variantId |
| `site_manufacturers` | Site ↔ Brand join | siteId, manufacturerId |
| `users` | CMS users | email, passwordHash, role |

### Migrations Applied
1. `0001_initial` — All core tables and enums
2. `0002_site_deployment_fields` — GitHub/Cloud Run fields on Site
3. `0003_users` — User table with roles
4. `0004_platform_restructure` — isLegacy, slimRIC enum, FittingOption model
5. `0005_retired_status` — retired added to PublishStatus
6. `0006_platform_images` — PlatformImage model

---

## Delivery API (Planned — Not Yet Built)

The intended delivery endpoint for connected sites:

```
GET /api/public/sites/{siteId}/products
Headers: x-api-key: {site.apiKey}

Returns published products with resolved content:
- Site-specific variant (if exists)
- Global variant (fallback)
- Canonical description (if allowCanonicalFallback)
```

Each site has an `apiKey` generated at creation. The `SitePublication` table gates which products are served to which site. `webhookUrl` on Site is reserved for push notifications on publish/update events (not yet implemented).

---

## CMS Pages

| Path | Purpose |
|------|---------|
| `/` | Dashboard / home |
| `/scan` | Scan manufacturer lineup (platforms, tiers, form factors) |
| `/ingest` | Research a single product |
| `/platforms` | Platform listing (active, legacy, retired) |
| `/platforms/[id]` | Platform detail with tiers, form factors, capabilities, images |
| `/products` | Product listing grouped by manufacturer and platform |
| `/products/[id]` | Product detail editor with form factor image search |
| `/manufacturers` | Brand management and logo upload |
| `/sites` | Connected sites CRUD |
| `/users` | User management |
| `/account` | Account settings |

---

## Development Setup

```bash
# Clone
git clone https://github.com/dusty-potter/ELM-CMS-System.git
cd ELM-CMS-System

# Install
npm install

# Copy env
cp .env.example .env
# Fill in DATABASE_URL, ANTHROPIC_API_KEY, GCS_BUCKET_NAME, NEXTAUTH_SECRET

# Generate Prisma client
npx prisma generate

# Start Cloud SQL proxy (in separate terminal)
cloud-sql-proxy gen-lang-client-0546798119:us-west1:elm-cms-postgres --port=5432

# Run dev server
npm run dev
```

### Deployment
Push to `main` → Cloud Build auto-triggers → buildpacks build → deploys to Cloud Run `ear-level-cms` in `us-west1`. No Dockerfile needed.

```bash
# Manual deploy check
gcloud builds list --limit=1
gcloud run services describe ear-level-cms --region=us-west1
```
