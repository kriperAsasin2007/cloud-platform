import { Module } from '@nestjs/common';
import { LeaderElectionService } from './leader-election.service';
import { NodeHealthMonitor } from '../scheduler/node-health.monitor';
import { WorkerNodeRegistry } from '../scheduler/worker-node.registry';
import { SchedulingAlgorithm } from '../scheduler/scheduling.algorithm';

@Module({
  providers: [
    WorkerNodeRegistry,
    SchedulingAlgorithm,
    NodeHealthMonitor,
    LeaderElectionService,
  ],
  exports: [
    WorkerNodeRegistry,
    SchedulingAlgorithm,
    LeaderElectionService,
  ],
})
export class LeaderElectionModule {}
