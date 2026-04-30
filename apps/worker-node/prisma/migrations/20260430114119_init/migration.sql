-- CreateEnum
CREATE TYPE "ContainerStatus" AS ENUM ('RUNNING', 'STOPPED', 'REMOVED');

-- CreateTable
CREATE TABLE "containers" (
    "instanceId" UUID NOT NULL,
    "containerId" TEXT NOT NULL,
    "sshPort" INTEGER NOT NULL,
    "cpuMillicores" INTEGER NOT NULL,
    "memoryMb" INTEGER NOT NULL,
    "status" "ContainerStatus" NOT NULL DEFAULT 'RUNNING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "containers_pkey" PRIMARY KEY ("instanceId")
);

-- CreateTable
CREATE TABLE "allocated_ports" (
    "port" INTEGER NOT NULL,
    "instanceId" UUID NOT NULL,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allocated_ports_pkey" PRIMARY KEY ("port")
);
