-- CreateEnum
CREATE TYPE "InstanceStatus" AS ENUM ('PENDING', 'SCHEDULING', 'PROVISIONING', 'RUNNING', 'TERMINATING', 'TERMINATED', 'FAILED');

-- CreateTable
CREATE TABLE "instances" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "InstanceStatus" NOT NULL DEFAULT 'PENDING',
    "cpuMillicores" INTEGER NOT NULL,
    "memoryMb" INTEGER NOT NULL,
    "imageType" TEXT NOT NULL,
    "workerNodeId" TEXT,
    "containerId" TEXT,
    "sshPort" INTEGER,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "terminatedAt" TIMESTAMP(3),

    CONSTRAINT "instances_pkey" PRIMARY KEY ("id")
);
