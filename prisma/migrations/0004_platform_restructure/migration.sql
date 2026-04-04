-- AlterEnum: add slimRIC to FormFactorStyle
ALTER TYPE "FormFactorStyle" ADD VALUE 'slimRIC';

-- AlterTable: add isLegacy to platforms
ALTER TABLE "platforms" ADD COLUMN "isLegacy" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: fitting_options
CREATE TABLE "fitting_options" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "styles" "FormFactorStyle"[],
    "autoFilled" BOOLEAN NOT NULL DEFAULT false,
    "confidenceLevel" "ConfidenceLevel",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fitting_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique platformId + name
CREATE UNIQUE INDEX "fitting_options_platformId_name_key" ON "fitting_options"("platformId", "name");

-- AddForeignKey: fitting_options -> platforms
ALTER TABLE "fitting_options" ADD CONSTRAINT "fitting_options_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
