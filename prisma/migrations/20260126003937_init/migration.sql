-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'gift_officer', 'viewer');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('queued', 'processing', 'completed', 'failed', 'completed_with_errors');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('active', 'dismissed', 'acted_on');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('queued', 'generating', 'completed', 'failed', 'scheduled');

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "features" JSONB NOT NULL DEFAULT '{}',
    "plan" VARCHAR(50) NOT NULL DEFAULT 'trial',
    "planExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255),
    "emailVerified" TIMESTAMP(3),
    "name" VARCHAR(255),
    "role" "UserRole" NOT NULL DEFAULT 'viewer',
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" VARCHAR(255) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "fileSize" INTEGER,
    "fileHash" VARCHAR(64),
    "storagePath" VARCHAR(500),
    "status" "UploadStatus" NOT NULL DEFAULT 'queued',
    "rowCount" INTEGER,
    "processedCount" INTEGER,
    "errorCount" INTEGER,
    "errors" JSONB,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "fieldMapping" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Constituent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "externalId" VARCHAR(100) NOT NULL,
    "externalSource" VARCHAR(50),
    "prefix" VARCHAR(20),
    "firstName" VARCHAR(100),
    "middleName" VARCHAR(100),
    "lastName" VARCHAR(100) NOT NULL,
    "suffix" VARCHAR(20),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "addressLine1" VARCHAR(255),
    "addressLine2" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(50),
    "postalCode" VARCHAR(20),
    "country" VARCHAR(100),
    "constituentType" VARCHAR(50),
    "classYear" INTEGER,
    "schoolCollege" VARCHAR(100),
    "estimatedCapacity" DECIMAL(15,2),
    "capacitySource" VARCHAR(100),
    "capacityUpdatedAt" TIMESTAMP(3),
    "assignedOfficerId" UUID,
    "portfolioTier" VARCHAR(50),
    "lapseRiskScore" DECIMAL(5,4),
    "lapseRiskFactors" JSONB,
    "priorityScore" DECIMAL(5,4),
    "priorityFactors" JSONB,
    "engagementScore" DECIMAL(5,4),
    "dataQualityScore" DECIMAL(5,4),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Constituent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gift" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "constituentId" UUID NOT NULL,
    "externalId" VARCHAR(100),
    "amount" DECIMAL(15,2) NOT NULL,
    "giftDate" DATE NOT NULL,
    "giftType" VARCHAR(50),
    "fundName" VARCHAR(255),
    "fundCode" VARCHAR(50),
    "campaign" VARCHAR(255),
    "appeal" VARCHAR(100),
    "recognitionAmount" DECIMAL(15,2),
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "constituentId" UUID NOT NULL,
    "userId" UUID,
    "contactType" VARCHAR(50) NOT NULL,
    "contactDate" DATE NOT NULL,
    "subject" VARCHAR(255),
    "notes" TEXT,
    "outcome" VARCHAR(50),
    "nextAction" VARCHAR(255),
    "nextActionDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "constituentId" UUID NOT NULL,
    "predictionType" VARCHAR(50) NOT NULL,
    "score" DECIMAL(5,4) NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "factors" JSONB NOT NULL,
    "modelVersion" VARCHAR(50),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "constituentId" UUID NOT NULL,
    "alertType" VARCHAR(50) NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "factors" JSONB,
    "status" "AlertStatus" NOT NULL DEFAULT 'active',
    "actedOnAt" TIMESTAMP(3),
    "actedOnBy" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brief" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "constituentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "content" JSONB NOT NULL,
    "citations" JSONB NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "modelUsed" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Brief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NaturalLanguageQuery" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "queryText" TEXT NOT NULL,
    "interpretedQuery" JSONB,
    "resultCount" INTEGER,
    "resultIds" TEXT[],
    "savedName" VARCHAR(255),
    "wasHelpful" BOOLEAN,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NaturalLanguageQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID,
    "reportType" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "parameters" JSONB,
    "content" JSONB,
    "storagePath" VARCHAR(500),
    "status" "ReportStatus" NOT NULL DEFAULT 'queued',
    "scheduleCron" VARCHAR(50),
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" BIGSERIAL NOT NULL,
    "organizationId" UUID,
    "userId" UUID,
    "action" VARCHAR(100) NOT NULL,
    "resourceType" VARCHAR(50),
    "resourceId" VARCHAR(100),
    "details" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");

-- CreateIndex
CREATE INDEX "Upload_organizationId_idx" ON "Upload"("organizationId");

-- CreateIndex
CREATE INDEX "Upload_status_idx" ON "Upload"("status");

-- CreateIndex
CREATE INDEX "Constituent_organizationId_idx" ON "Constituent"("organizationId");

-- CreateIndex
CREATE INDEX "Constituent_organizationId_priorityScore_idx" ON "Constituent"("organizationId", "priorityScore" DESC);

-- CreateIndex
CREATE INDEX "Constituent_organizationId_lapseRiskScore_idx" ON "Constituent"("organizationId", "lapseRiskScore" DESC);

-- CreateIndex
CREATE INDEX "Constituent_assignedOfficerId_idx" ON "Constituent"("assignedOfficerId");

-- CreateIndex
CREATE UNIQUE INDEX "Constituent_organizationId_externalId_externalSource_key" ON "Constituent"("organizationId", "externalId", "externalSource");

-- CreateIndex
CREATE INDEX "Gift_organizationId_idx" ON "Gift"("organizationId");

-- CreateIndex
CREATE INDEX "Gift_constituentId_idx" ON "Gift"("constituentId");

-- CreateIndex
CREATE INDEX "Gift_giftDate_idx" ON "Gift"("giftDate" DESC);

-- CreateIndex
CREATE INDEX "Contact_organizationId_idx" ON "Contact"("organizationId");

-- CreateIndex
CREATE INDEX "Contact_constituentId_idx" ON "Contact"("constituentId");

-- CreateIndex
CREATE INDEX "Contact_contactDate_idx" ON "Contact"("contactDate" DESC);

-- CreateIndex
CREATE INDEX "Prediction_organizationId_idx" ON "Prediction"("organizationId");

-- CreateIndex
CREATE INDEX "Prediction_constituentId_idx" ON "Prediction"("constituentId");

-- CreateIndex
CREATE INDEX "Prediction_organizationId_predictionType_isCurrent_idx" ON "Prediction"("organizationId", "predictionType", "isCurrent");

-- CreateIndex
CREATE INDEX "Alert_organizationId_idx" ON "Alert"("organizationId");

-- CreateIndex
CREATE INDEX "Alert_organizationId_status_idx" ON "Alert"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Brief_organizationId_idx" ON "Brief"("organizationId");

-- CreateIndex
CREATE INDEX "Brief_constituentId_idx" ON "Brief"("constituentId");

-- CreateIndex
CREATE INDEX "NaturalLanguageQuery_organizationId_idx" ON "NaturalLanguageQuery"("organizationId");

-- CreateIndex
CREATE INDEX "Report_organizationId_idx" ON "Report"("organizationId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Constituent" ADD CONSTRAINT "Constituent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Constituent" ADD CONSTRAINT "Constituent_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gift" ADD CONSTRAINT "Gift_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gift" ADD CONSTRAINT "Gift_constituentId_fkey" FOREIGN KEY ("constituentId") REFERENCES "Constituent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_constituentId_fkey" FOREIGN KEY ("constituentId") REFERENCES "Constituent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_constituentId_fkey" FOREIGN KEY ("constituentId") REFERENCES "Constituent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_constituentId_fkey" FOREIGN KEY ("constituentId") REFERENCES "Constituent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brief" ADD CONSTRAINT "Brief_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brief" ADD CONSTRAINT "Brief_constituentId_fkey" FOREIGN KEY ("constituentId") REFERENCES "Constituent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brief" ADD CONSTRAINT "Brief_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NaturalLanguageQuery" ADD CONSTRAINT "NaturalLanguageQuery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NaturalLanguageQuery" ADD CONSTRAINT "NaturalLanguageQuery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
