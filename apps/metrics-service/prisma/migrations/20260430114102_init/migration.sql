-- CreateTable
CREATE TABLE "instance_ownership" (
    "instanceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instance_ownership_pkey" PRIMARY KEY ("instanceId")
);

-- CreateTable
CREATE TABLE "instance_metrics" (
    "id" BIGSERIAL NOT NULL,
    "instanceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "cpuPercent" DECIMAL(5,2) NOT NULL,
    "memoryMb" INTEGER NOT NULL,
    "networkInKb" INTEGER NOT NULL,
    "networkOutKb" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "instance_metrics_instanceId_recordedAt_idx" ON "instance_metrics"("instanceId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "instance_metrics_userId_recordedAt_idx" ON "instance_metrics"("userId", "recordedAt" DESC);
