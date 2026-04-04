-- CreateTable: platform_images
CREATE TABLE "platform_images" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "type" "ImageType" NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "localUrl" TEXT NOT NULL,
    "variantHeroWide" TEXT,
    "variantSquare" TEXT,
    "variantThumbnail" TEXT,
    "focalPointX" DOUBLE PRECISION,
    "focalPointY" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_images_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: platform_images -> platforms
ALTER TABLE "platform_images" ADD CONSTRAINT "platform_images_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
