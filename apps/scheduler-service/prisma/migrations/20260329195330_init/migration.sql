-- CreateEnum
CREATE TYPE "WorkerNodeStatus" AS ENUM ('HEALTHY', 'UNHEALTHY');

-- CreateEnum
CREATE TYPE "ReservationState" AS ENUM ('RESERVED', 'COMMITTED');

-- CreateTable
CREATE TABLE "worker_nodes" (
    "id" TEXT NOT NULL,
    "status" "WorkerNodeStatus" NOT NULL DEFAULT 'HEALTHY',
    "totalCpu" INTEGER NOT NULL,
    "totalMemory" INTEGER NOT NULL,
    "freeCpu" INTEGER NOT NULL,
    "freeMemory" INTEGER NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_reservations" (
    "instanceId" UUID NOT NULL,
    "nodeId" TEXT NOT NULL,
    "cpu" INTEGER NOT NULL,
    "memory" INTEGER NOT NULL,
    "state" "ReservationState" NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_reservations_pkey" PRIMARY KEY ("instanceId")
);

-- AddForeignKey
ALTER TABLE "resource_reservations" ADD CONSTRAINT "resource_reservations_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "worker_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
