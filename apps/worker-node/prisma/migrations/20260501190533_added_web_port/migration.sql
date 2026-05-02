-- AlterTable
ALTER TABLE "allocated_ports" ALTER COLUMN "instanceId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "containers" ADD COLUMN     "webPort" INTEGER;
