# ELM CMS — System Context

**Ear Level Marketing Content Management System**
Built on Next.js 14 (App Router), PostgreSQL via Prisma ORM, Google Cloud Run, Google Cloud Storage, and Google Gemini AI.

---

## Purpose

ELM CMS is a multi-tenant headless CMS purpose-built for managing hearing aid and hearing health product content across a network of client websites. It ingests structured product data (via AI research), manages editorial review and approval, and distributes approved content to connected client sites via a delivery API.

---

## Infrastructure

| Layer | Technology |
|---|---|
| Frontend / Backend | Next.js 14 (App Router, standalone output) |
| Database | PostgreSQL 18 via Cloud SQL (`elm-cms-postgres`, us-west1) |
| ORM | Prisma 5 |
| AI Research | Google Gemini 2.0 Flash |
| Media Storage | Google Cloud Storage (`GCS_BUCKET_NAME`) |
| Hosting | Google Cloud Run (`elm-intake`, us-central1) |
| Source | GitHub (`dusty-potter/ELM-CMS-System`) — auto-deploys via Cloud Build |

### Environment Variables (Cloud Run)
- `GEMINI_API_KEY` — Google AI API key for product research
- `DATABASE_URL` — PostgreSQL connection string via Cloud SQL Unix socket
- `GCS_BUCKET_NAME` — GCS bucket name for media asset storage
- `NEXT_PUBLIC_APP_URL` — Public URL of the deployed service
- `INTERNAL_API_SECRET` — Server-to-server auth secret (for webhook delivery, not yet implemented)

---

## Data Model

The schema follows a strict hierarchy enforced at the database level:

```
Manufacturer
  └── Platform (technology generation / chipset)
        ├── PlatformCapability (master capability pool)
        └── Product (tier within a platform, e.g. IX7, IX5, IX3)
              ├── ProductCapabilityDeclaration (subset of platform pool)
              ├── FormFactor (physical device style, e.g. miniRITE R)
              │     ├── FormFactorCapabilityDeclaration
              │     ├── FormFactorCapabilityExclusion
              │     └── FormFactorImage
              └── ContentVariant (AI-generated or human-authored description rewrites)

Site
  ├── SiteManufacturer (which manufacturers a site carries)
  └── SitePublication (gate between product existing in CMS and being served to a site)
```

### Key Design Rules
- All AI-ingested records land in `draft` status. Nothing auto-publishes.
- A product's `canonicalDescription` is human-controlled. AI rewrites produce `ContentVariant` rows — they never modify the canonical.
- A product being `published` in the CMS does **not** mean it's live on a site. A `SitePublication` record with `status: published` must also exist.
- Capability inheritance is DB-enforced: FormFactors can only declare capabilities their parent Product has declared; Products can only declare from their Platform's pool.
- Images are downloaded at ingest time and stored in GCS. Source URLs are retained for audit. Images are never hotlinked.
- Tech terms and controlled vocabulary are locked — AI cannot rename, redefine, or generate new entries.

### Enums
- `PublishStatus`: `draft`, `approved`, `published`
- `ProductTier`: `premium`, `advanced`, `standard`, `essential`
- `FormFactorStyle`: `RIC`, `BTE`, `ITE`, `CIC`, `IIC`, `miniRITE`, `other`
- `BatteryType`: `disposable`, `rechargeable`
- `CapabilityCategory`: `processing`, `connectivity`, `health`, `physical`
- `ConfidenceLevel`: `high`, `medium`, `low` (set by AI pipeline, reviewed by human)
- `ComparisonLevel`: `low`, `medium`, `high`
- `VariantScope`: `global`, `site_specific`
- `SitePublicationStatus`: `pending`, `published`, `failed`

---

## Current Functionality

### Pages

#### `/` — Homepage
Simple nav hub linking to the two active tools.

#### `/ingest` — Research a Single Product
1. User selects a manufacturer and enters a model name
2. Calls `POST /api/ingest` → Gemini 2.0 Flash researches the product
3. Returns structured data: platform, tier, canonical description, pros/cons, best-for, target user, hearing loss range, capabilities (with categories), connectivity flags, form factors (with battery, IP rating, colors), and comparison ratings
4. Review panel displays all data with a confidence badge (high/medium/low)
5. Canonical description is editable before saving
6. **Save to CMS** writes the full record chain to PostgreSQL via Prisma (upsert — safe to re-run)
7. **Copy as JSON** exports the full researched payload

#### `/scan` — Scan Manufacturer Lineup
1. User selects a manufacturer (or enters a custom name + optional URL hint)
2. Calls `POST /api/ingest/enumerate` → Gemini enumerates the full current product lineup
3. Products displayed grouped by platform, sorted newest platform first / premium tier first
4. **Per-product Active/Inactive toggle** — controls which products will be researched and saved
5. Bulk actions: Activate All, Deactivate All, Research Active (N), Save to CMS (N)
6. Per-row actions: Research → Save → shows inline status (Researching… / Researched / ✓ Saved / Retry)
7. Research runs sequentially so progress is visible row by row
8. Bulk Save to CMS saves all active researched products sequentially

### Supported Manufacturers
Phonak, Oticon, Starkey, ReSound, Widex, Signia, Unitron, Audibel, Beltone, Lenire, + Custom

---

## API Routes

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/ingest` | Research a single product via Gemini. Body: `{ manufacturer, modelName }` |
| `POST` | `/api/ingest/enumerate` | Enumerate a manufacturer's full lineup via Gemini. Body: `{ manufacturer, url? }` |
| `POST` | `/api/cms/save` | Upsert full product record chain to PostgreSQL. Body: `{ manufacturer, modelName, product }` |
| `POST` | `/api/storage/upload` | Download image from URL and upload to GCS. Body: `{ sourceUrl, folder, filename? }` |

---

## Library Utilities (`/lib`)

- **`lib/prisma.ts`** — Prisma client singleton (hot-reload safe for Next.js dev)
- **`lib/slugify.ts`** — Diacritic-stripping URL slug generator (handles Audéo → audeo, etc.)
- **`lib/storage.ts`** — GCS utilities: `uploadImageFromUrl`, `signedUrl`, `deleteImage`. Uses Application Default Credentials (ADC) — zero config on Cloud Run.

---

## What Is Not Yet Built

The following is planned but not yet implemented:

- **Delivery API** — `GET /api/public/sites/[siteId]/products` — the endpoint connected client sites call to fetch published content. Resolves content variant priority: site-specific → global → canonical fallback. Authenticated by `x-api-key`.
- **Webhook dispatch** — notifying connected sites when a product is published or updated
- **Admin UI** — managing Sites, SitePublications, content variant approval workflow, publish/unpublish controls
- **Image ingestion** — downloading and storing form factor images at save time (storage utility exists, not yet wired into the save flow)
- **Content variant generation** — AI rewrite of canonical descriptions scoped per-site, approval workflow
- **True web scraping** — headless browser crawl of manufacturer websites (Playwright-based). The `Manufacturer.scrapingConfig` field is reserved for this. Currently the AI uses training knowledge; URL is passed as a hint only.
- **User authentication** — the CMS has no auth layer yet
- **Site management UI** — creating and managing `Site` records and their `SiteManufacturer` associations

---

## Legacy App

A previous version of the CMS exists in `/legacy/` — a Vite + React app backed by Firebase/Firestore. It had working UI for product editing, site management, AI rewrite generation, and site publication toggling. It is being replaced by this Next.js + PostgreSQL system. The legacy app should be used as a reference for feature parity but not modified.
