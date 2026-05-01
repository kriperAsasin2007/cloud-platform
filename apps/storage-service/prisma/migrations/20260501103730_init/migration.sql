-- CreateTable
CREATE TABLE "buckets" (
    "id" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buckets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "object_metadata" (
    "id" UUID NOT NULL,
    "bucketId" UUID NOT NULL,
    "objectKey" TEXT NOT NULL,
    "userMeta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "object_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "buckets_userId_idx" ON "buckets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "buckets_userId_displayName_key" ON "buckets"("userId", "displayName");

-- CreateIndex
CREATE INDEX "object_metadata_bucketId_idx" ON "object_metadata"("bucketId");

-- CreateIndex
CREATE UNIQUE INDEX "object_metadata_bucketId_objectKey_key" ON "object_metadata"("bucketId", "objectKey");

-- AddForeignKey
ALTER TABLE "object_metadata" ADD CONSTRAINT "object_metadata_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "buckets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
