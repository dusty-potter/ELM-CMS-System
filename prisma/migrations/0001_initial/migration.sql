-- ELM CMS — Initial Schema Migration
-- Generated from prisma/schema.prisma
-- Review before running: prisma migrate deploy

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE "PublishStatus" AS ENUM ('draft', 'approved', 'published');
CREATE TYPE "VariantScope" AS ENUM ('global', 'site_specific');
CREATE TYPE "SitePublicationStatus" AS ENUM ('pending', 'published', 'failed');
CREATE TYPE "ConfidenceLevel" AS ENUM ('high', 'medium', 'low');
CREATE TYPE "CapabilityCategory" AS ENUM ('processing', 'connectivity', 'health', 'physical');
CREATE TYPE "ProductTier" AS ENUM ('premium', 'advanced', 'standard', 'essential');
CREATE TYPE "FormFactorStyle" AS ENUM ('RIC', 'BTE', 'ITE', 'CIC', 'IIC', 'miniRITE', 'other');
CREATE TYPE "BatteryType" AS ENUM ('disposable', 'rechargeable');
CREATE TYPE "ComparisonLevel" AS ENUM ('low', 'medium', 'high');
CREATE TYPE "ImageType" AS ENUM ('hero', 'gallery');

-- ---------------------------------------------------------------------------
-- manufacturers
-- ---------------------------------------------------------------------------

CREATE TABLE "manufacturers" (
    "id"                  TEXT        NOT NULL,
    "name"                TEXT        NOT NULL,
    "slug"                TEXT        NOT NULL,
    "aliases"             TEXT[]      NOT NULL DEFAULT '{}',
    "approvedDomains"     TEXT[]      NOT NULL DEFAULT '{}',
    "productPagePatterns" TEXT[]      NOT NULL DEFAULT '{}',
    -- Manufacturer-specific scraping rules. Admin-managed, never AI-generated.
    "scrapingConfig"      JSONB,
    "logoUrl"             TEXT,
    "active"              BOOLEAN     NOT NULL DEFAULT true,
    "autoFilled"          BOOLEAN     NOT NULL DEFAULT false,
    "confidenceLevel"     "ConfidenceLevel",
    "ingestSource"        TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "manufacturers_name_key" ON "manufacturers"("name");
CREATE UNIQUE INDEX "manufacturers_slug_key" ON "manufacturers"("slug");

-- ---------------------------------------------------------------------------
-- platforms
-- ---------------------------------------------------------------------------

CREATE TABLE "platforms" (
    "id"                         TEXT           NOT NULL,
    "manufacturerId"             TEXT           NOT NULL,
    "name"                       TEXT           NOT NULL,
    "displayName"                TEXT,
    "slug"                       TEXT           NOT NULL,
    "generationYear"             INTEGER,
    "status"                     "PublishStatus" NOT NULL DEFAULT 'draft',
    -- Technology narrative
    "summary"                    TEXT,
    "keyDifferentiators"         TEXT[]         NOT NULL DEFAULT '{}',
    -- Controlled vocabulary — AI cannot modify these terms.
    "techTerms"                  TEXT[]         NOT NULL DEFAULT '{}',
    -- Connectivity ceiling (maximum the platform supports at its best)
    "connectivityIos"            BOOLEAN        NOT NULL DEFAULT false,
    "connectivityAndroid"        BOOLEAN        NOT NULL DEFAULT false,
    "connectivityBluetooth"      BOOLEAN        NOT NULL DEFAULT false,
    "connectivityAuracast"       BOOLEAN        NOT NULL DEFAULT false,
    "connectivityHandsFree"      BOOLEAN        NOT NULL DEFAULT false,
    "connectivityRemoteControl"  BOOLEAN        NOT NULL DEFAULT false,
    -- Ingestion provenance
    "autoFilled"                 BOOLEAN        NOT NULL DEFAULT false,
    "confidenceLevel"            "ConfidenceLevel",
    "ingestSource"               TEXT,
    "createdAt"                  TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                  TIMESTAMP(3)   NOT NULL,

    CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

-- Platform slug is unique within a manufacturer.
CREATE UNIQUE INDEX "platforms_manufacturerId_slug_key" ON "platforms"("manufacturerId", "slug");

ALTER TABLE "platforms"
    ADD CONSTRAINT "platforms_manufacturerId_fkey"
    FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- platform_capabilities  (the pool)
-- ---------------------------------------------------------------------------

CREATE TABLE "platform_capabilities" (
    "id"          TEXT                  NOT NULL,
    "platformId"  TEXT                  NOT NULL,
    "key"         TEXT                  NOT NULL,
    "label"       TEXT                  NOT NULL,
    "category"    "CapabilityCategory"  NOT NULL,
    "description" TEXT,
    -- If true, this is a locked tech term. AI cannot rename or redefine it.
    "techTerm"    BOOLEAN               NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)          NOT NULL,

    CONSTRAINT "platform_capabilities_pkey" PRIMARY KEY ("id")
);

-- A capability key is unique within a platform.
CREATE UNIQUE INDEX "platform_capabilities_platformId_key_key"
    ON "platform_capabilities"("platformId", "key");

ALTER TABLE "platform_capabilities"
    ADD CONSTRAINT "platform_capabilities_platformId_fkey"
    FOREIGN KEY ("platformId") REFERENCES "platforms"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------

CREATE TABLE "products" (
    "id"                     TEXT             NOT NULL,
    "platformId"             TEXT             NOT NULL,
    "manufacturerId"         TEXT             NOT NULL,
    "name"                   TEXT             NOT NULL,
    "displayName"            TEXT,
    "slug"                   TEXT             NOT NULL,
    "tier"                   "ProductTier",
    "status"                 "PublishStatus"  NOT NULL DEFAULT 'draft',
    -- Ingestion provenance
    "autoFilled"             BOOLEAN          NOT NULL DEFAULT false,
    "confidenceLevel"        "ConfidenceLevel",
    "ingestSource"           TEXT,
    -- Normalized comparison data (derived from capabilities, stored for query perf)
    "compSpeechInNoise"      "ComparisonLevel",
    "compMusicQuality"       "ComparisonLevel",
    "compTinnitusSupport"    BOOLEAN,
    "compAiProcessing"       BOOLEAN,
    "compRemoteCare"         BOOLEAN,
    "compHealthTracking"     BOOLEAN,
    "compFallDetection"      BOOLEAN,
    -- Positioning
    "bestFor"                TEXT[]           NOT NULL DEFAULT '{}',
    "pros"                   TEXT[]           NOT NULL DEFAULT '{}',
    -- Must NOT include universal clinical truths — enforced at application layer.
    "cons"                   TEXT[]           NOT NULL DEFAULT '{}',
    "targetUser"             TEXT,
    "hearingLossRange"       TEXT[]           NOT NULL DEFAULT '{}',
    -- Value positioning
    "valueSummary"           TEXT,
    "upgradeReasons"         TEXT[]           NOT NULL DEFAULT '{}',
    -- Content layer
    -- Human-authored or human-approved. AI rewrites produce variants only.
    "canonicalDescription"   TEXT,
    "allowCanonicalFallback" BOOLEAN          NOT NULL DEFAULT true,
    "createdAt"              TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

ALTER TABLE "products"
    ADD CONSTRAINT "products_platformId_fkey"
    FOREIGN KEY ("platformId") REFERENCES "platforms"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "products"
    ADD CONSTRAINT "products_manufacturerId_fkey"
    FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- product_capability_declarations
-- ---------------------------------------------------------------------------

CREATE TABLE "product_capability_declarations" (
    "id"           TEXT    NOT NULL,
    "productId"    TEXT    NOT NULL,
    "capabilityId" TEXT    NOT NULL,
    -- false = pipeline-mapped, pending human review.
    "confirmed"    BOOLEAN NOT NULL DEFAULT false,
    "notes"        TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_capability_declarations_pkey" PRIMARY KEY ("id")
);

-- A product declares each capability at most once.
CREATE UNIQUE INDEX "product_capability_declarations_productId_capabilityId_key"
    ON "product_capability_declarations"("productId", "capabilityId");

ALTER TABLE "product_capability_declarations"
    ADD CONSTRAINT "product_capability_declarations_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- FK to platform_capabilities (not platforms) enforces that only pool-level
-- capabilities can be declared by a product.
ALTER TABLE "product_capability_declarations"
    ADD CONSTRAINT "product_capability_declarations_capabilityId_fkey"
    FOREIGN KEY ("capabilityId") REFERENCES "platform_capabilities"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- form_factors
-- ---------------------------------------------------------------------------

CREATE TABLE "form_factors" (
    "id"                   TEXT               NOT NULL,
    "productId"            TEXT               NOT NULL,
    -- Denormalized for query efficiency.
    "platformId"           TEXT               NOT NULL,
    "manufacturerId"       TEXT               NOT NULL,
    "style"                "FormFactorStyle"  NOT NULL,
    "name"                 TEXT               NOT NULL,
    "slug"                 TEXT               NOT NULL,
    "status"               "PublishStatus"    NOT NULL DEFAULT 'draft',
    "availableAtLaunch"    BOOLEAN            NOT NULL DEFAULT true,
    "launchDate"           TIMESTAMP(3),
    -- Ingestion provenance
    "autoFilled"           BOOLEAN            NOT NULL DEFAULT false,
    "confidenceLevel"      "ConfidenceLevel",
    "ingestSource"         TEXT,
    -- Physical specifications
    "batteryType"          "BatteryType",
    "batterySize"          TEXT,              -- e.g. "312", "13"; null for rechargeable
    "batteryEstimatedHours" INTEGER,
    "ipRating"             TEXT,              -- e.g. "IP68"
    "waterResistant"       BOOLEAN            NOT NULL DEFAULT false,
    "colors"               TEXT[]             NOT NULL DEFAULT '{}',
    "receiverOptions"      TEXT[]             NOT NULL DEFAULT '{}',
    -- Connectivity (explicit per-form-factor confirmation)
    "connectivityIos"       BOOLEAN           NOT NULL DEFAULT false,
    "connectivityAndroid"   BOOLEAN           NOT NULL DEFAULT false,
    "connectivityBluetooth" BOOLEAN           NOT NULL DEFAULT false,
    "connectivityAuracast"  BOOLEAN           NOT NULL DEFAULT false,
    "connectivityHandsFree" BOOLEAN           NOT NULL DEFAULT false,
    "createdAt"            TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3)       NOT NULL,

    CONSTRAINT "form_factors_pkey" PRIMARY KEY ("id")
);

-- A product cannot have two form factors with the same slug.
CREATE UNIQUE INDEX "form_factors_productId_slug_key"
    ON "form_factors"("productId", "slug");

ALTER TABLE "form_factors"
    ADD CONSTRAINT "form_factors_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "form_factors"
    ADD CONSTRAINT "form_factors_platformId_fkey"
    FOREIGN KEY ("platformId") REFERENCES "platforms"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "form_factors"
    ADD CONSTRAINT "form_factors_manufacturerId_fkey"
    FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- form_factor_capability_declarations
--
-- FK references product_capability_declarations, NOT platform_capabilities.
-- This is the DB-level enforcement of the inheritance rule: a FormFactor can
-- only declare a capability its parent Product has already declared.
-- ---------------------------------------------------------------------------

CREATE TABLE "form_factor_capability_declarations" (
    "id"                             TEXT    NOT NULL,
    "formFactorId"                   TEXT    NOT NULL,
    "productCapabilityDeclarationId" TEXT    NOT NULL,
    "confirmed"                      BOOLEAN NOT NULL DEFAULT false,
    -- Physical reason why this form factor includes or limits this capability.
    "exclusionReason"                TEXT,
    "createdAt"                      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_factor_capability_declarations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "form_factor_capability_declarations_ffId_pcdId_key"
    ON "form_factor_capability_declarations"("formFactorId", "productCapabilityDeclarationId");

ALTER TABLE "form_factor_capability_declarations"
    ADD CONSTRAINT "form_factor_capability_declarations_formFactorId_fkey"
    FOREIGN KEY ("formFactorId") REFERENCES "form_factors"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- RESTRICT: deleting a product declaration that a form factor references
-- requires explicit cleanup first — prevents silent orphaning.
ALTER TABLE "form_factor_capability_declarations"
    ADD CONSTRAINT "form_factor_capability_declarations_pcdId_fkey"
    FOREIGN KEY ("productCapabilityDeclarationId") REFERENCES "product_capability_declarations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- form_factor_capability_exclusions
--
-- Explicit record that a form factor does NOT support a capability its parent
-- product has declared. Distinct from the absence of a declaration row:
-- absence = unknown/pending; an exclusion row = confirmed not supported.
-- Required for the ingestion review UI to surface gaps during gap-fill.
--
-- FK references product_capability_declarations (not platform_capabilities),
-- maintaining the same inheritance rule as form_factor_capability_declarations:
-- only capabilities in the parent product's declared set can be excluded here.
-- ---------------------------------------------------------------------------

CREATE TABLE "form_factor_capability_exclusions" (
    "id"                             TEXT NOT NULL,
    "formFactorId"                   TEXT NOT NULL,
    "productCapabilityDeclarationId" TEXT NOT NULL,
    -- Physical or technical reason for the exclusion.
    "exclusionReason"                TEXT,
    -- Auth system identifier of the person who confirmed this exclusion.
    "confirmedBy"                    TEXT,
    "confirmedAt"                    TIMESTAMP(3),
    "createdAt"                      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_factor_capability_exclusions_pkey" PRIMARY KEY ("id")
);

-- A form factor can only have one exclusion record per capability.
CREATE UNIQUE INDEX "form_factor_capability_exclusions_ffId_pcdId_key"
    ON "form_factor_capability_exclusions"("formFactorId", "productCapabilityDeclarationId");

ALTER TABLE "form_factor_capability_exclusions"
    ADD CONSTRAINT "form_factor_capability_exclusions_formFactorId_fkey"
    FOREIGN KEY ("formFactorId") REFERENCES "form_factors"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- RESTRICT: mirrors the same rule as declarations — deleting a product-level
-- declaration that has a form factor exclusion attached requires explicit cleanup.
ALTER TABLE "form_factor_capability_exclusions"
    ADD CONSTRAINT "form_factor_capability_exclusions_pcdId_fkey"
    FOREIGN KEY ("productCapabilityDeclarationId") REFERENCES "product_capability_declarations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- form_factor_images
--
-- Images are downloaded at ingestion and stored locally.
-- sourceUrl is retained for audit only. All serving uses localUrl or variants.
-- Source domain is validated against manufacturer.approvedDomains before download.
-- ---------------------------------------------------------------------------

CREATE TABLE "form_factor_images" (
    "id"               TEXT         NOT NULL,
    "formFactorId"     TEXT         NOT NULL,
    "type"             "ImageType"  NOT NULL,
    -- Original source URL — for audit trail only. Never used for serving.
    "sourceUrl"        TEXT         NOT NULL,
    -- Path/URL in local/CDN storage after download.
    "localUrl"         TEXT         NOT NULL,
    -- Processed variants (null until image processing has run).
    "variantHeroWide"  TEXT,
    "variantSquare"    TEXT,
    "variantThumbnail" TEXT,
    -- Focal point for smart cropping (0.0–1.0).
    "focalPointX"      DOUBLE PRECISION,
    "focalPointY"      DOUBLE PRECISION,
    -- Ordering within gallery; hero should be 0.
    "sortOrder"        INTEGER      NOT NULL DEFAULT 0,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_factor_images_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "form_factor_images"
    ADD CONSTRAINT "form_factor_images_formFactorId_fkey"
    FOREIGN KEY ("formFactorId") REFERENCES "form_factors"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- content_variants
-- ---------------------------------------------------------------------------

CREATE TABLE "content_variants" (
    "id"            TEXT            NOT NULL,
    "productId"     TEXT            NOT NULL,
    "text"          TEXT            NOT NULL,
    "status"        "PublishStatus" NOT NULL DEFAULT 'draft',
    "scope"         "VariantScope"  NOT NULL,
    -- NULL for global scope; set to a sites.id for site_specific scope.
    "siteId"        TEXT,
    -- True if AI-generated; requires explicit approval before publishing.
    "aiGenerated"   BOOLEAN         NOT NULL DEFAULT false,
    "modelName"     TEXT,
    "promptVersion" TEXT,
    "createdAt"     TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3)    NOT NULL,

    CONSTRAINT "content_variants_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "content_variants"
    ADD CONSTRAINT "content_variants_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- sites
-- ---------------------------------------------------------------------------

CREATE TABLE "sites" (
    "id"         TEXT    NOT NULL,
    "name"       TEXT    NOT NULL,
    "domain"     TEXT    NOT NULL,
    "webhookUrl" TEXT,
    -- Required on all delivery API requests. Generated at site creation.
    "apiKey"     TEXT    NOT NULL,
    "active"     BOOLEAN NOT NULL DEFAULT true,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sites_domain_key" ON "sites"("domain");
CREATE UNIQUE INDEX "sites_apiKey_key" ON "sites"("apiKey");

-- ---------------------------------------------------------------------------
-- site_manufacturers  (join table)
-- ---------------------------------------------------------------------------

CREATE TABLE "site_manufacturers" (
    "siteId"         TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,

    CONSTRAINT "site_manufacturers_pkey" PRIMARY KEY ("siteId", "manufacturerId")
);

ALTER TABLE "site_manufacturers"
    ADD CONSTRAINT "site_manufacturers_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "sites"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "site_manufacturers"
    ADD CONSTRAINT "site_manufacturers_manufacturerId_fkey"
    FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- site_publications
--
-- The gate between a product existing in the CMS and it being served to a
-- site. Product status = published does NOT imply the product is served —
-- a site_publications row with status = published must exist.
-- ---------------------------------------------------------------------------

CREATE TABLE "site_publications" (
    "id"                TEXT                    NOT NULL,
    "productId"         TEXT                    NOT NULL,
    "siteId"            TEXT                    NOT NULL,
    "status"            "SitePublicationStatus" NOT NULL DEFAULT 'pending',
    -- NULL = canonical fallback (requires product.allowCanonicalFallback = true).
    "variantId"         TEXT,
    "canonicalFallback" BOOLEAN                 NOT NULL DEFAULT false,
    "lastSyncedAt"      TIMESTAMP(3),
    -- Non-null when status = failed.
    "error"             TEXT,
    "createdAt"         TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3)            NOT NULL,

    CONSTRAINT "site_publications_pkey" PRIMARY KEY ("id")
);

-- One publication record per product per site.
CREATE UNIQUE INDEX "site_publications_siteId_productId_key"
    ON "site_publications"("siteId", "productId");

ALTER TABLE "site_publications"
    ADD CONSTRAINT "site_publications_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "site_publications"
    ADD CONSTRAINT "site_publications_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "sites"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- SetNull: if the pinned variant is deleted, the publication falls back to
-- canonical rather than blocking on a constraint violation.
ALTER TABLE "site_publications"
    ADD CONSTRAINT "site_publications_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "content_variants"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
