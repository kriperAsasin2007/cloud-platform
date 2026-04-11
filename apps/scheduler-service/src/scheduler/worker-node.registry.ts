import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkerNode, WorkerNodeStatus } from '@prisma/client/scheduler';

export interface WorkerHeartbeat {
  nodeId: string;
  freeCpu: number;
  freeMemory: number;
  totalCpu: number;
  totalMemory: number;
  runningContainers: string[];
}

@Injectable()
export class WorkerNodeRegistry implements OnModuleInit {
  private readonly logger = new Logger(WorkerNodeRegistry.name);
  private readonly nodes = new Map<string, WorkerNode>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.loadFromDatabase();
  }

  private async loadFromDatabase(): Promise<void> {
    const nodes = await this.prisma.workerNode.findMany();
    for (const node of nodes) {
      this.nodes.set(node.id, node);
    }
    this.logger.log(`Loaded ${nodes.length} worker nodes from DB`);
  }

  async upsertNode(heartbeat: WorkerHeartbeat): Promise<void> {
    const data = {
      status: WorkerNodeStatus.HEALTHY,
      totalCpu: heartbeat.totalCpu,
      totalMemory: heartbeat.totalMemory,
      freeCpu: heartbeat.freeCpu,
      freeMemory: heartbeat.freeMemory,
      lastSeenAt: new Date(),
    };

    const node = await this.prisma.workerNode.upsert({
      where: { id: heartbeat.nodeId },
      create: { id: heartbeat.nodeId, ...data },
      update: data,
    });

    this.nodes.set(node.id, node);
  }

  getEligibleNodes(cpu: number, memory: number): WorkerNode[] {
    return Array.from(this.nodes.values()).filter(
      (n) =>
        n.status === WorkerNodeStatus.HEALTHY &&
        n.freeCpu >= cpu &&
        n.freeMemory >= memory,
    );
  }

  async reserveResources(
    nodeId: string,
    instanceId: string,
    cpu: number,
    memory: number,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.workerNode.update({
        where: { id: nodeId },
        data: {
          freeCpu: { decrement: cpu },
          freeMemory: { decrement: memory },
        },
      }),
      this.prisma.resourceReservation.create({
        data: { instanceId, nodeId, cpu, memory },
      }),
    ]);

    const node = this.nodes.get(nodeId);
    if (node) {
      node.freeCpu -= cpu;
      node.freeMemory -= memory;
    }
  }

  async confirmReservation(instanceId: string): Promise<void> {
    await this.prisma.resourceReservation.update({
      where: { instanceId },
      data: { state: 'COMMITTED' },
    });
  }

  async releaseResources(instanceId: string): Promise<void> {
    const reservation = await this.prisma.resourceReservation.findUnique({
      where: { instanceId },
    });

    if (!reservation) return;

    await this.prisma.$transaction([
      this.prisma.workerNode.update({
        where: { id: reservation.nodeId },
        data: {
          freeCpu: { increment: reservation.cpu },
          freeMemory: { increment: reservation.memory },
        },
      }),
      this.prisma.resourceReservation.delete({ where: { instanceId } }),
    ]);

    const node = this.nodes.get(reservation.nodeId);
    if (node) {
      node.freeCpu += reservation.cpu;
      node.freeMemory += reservation.memory;
    }
  }

  async markNodeUnhealthy(nodeId: string): Promise<void> {
    await this.prisma.workerNode.update({
      where: { id: nodeId },
      data: { status: WorkerNodeStatus.UNHEALTHY },
    });

    const node = this.nodes.get(nodeId);
    if (node) {
      node.status = WorkerNodeStatus.UNHEALTHY;
    }

    this.logger.warn(`Worker node ${nodeId} marked UNHEALTHY`);
  }

  getAll(): WorkerNode[] {
    return Array.from(this.nodes.values());
  }
}
