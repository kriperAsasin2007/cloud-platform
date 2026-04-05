import { Injectable } from '@nestjs/common';
import { WorkerNode } from '@prisma/client/scheduler';

@Injectable()
export class SchedulingAlgorithm {
  /**
   * LeastLoaded strategy: sort nodes by CPU utilisation ratio ascending,
   * return the node with the most available CPU headroom.
   */
  pickNode(candidates: WorkerNode[]): WorkerNode {
    if (candidates.length === 0) {
      throw new Error('No eligible nodes provided');
    }

    return candidates.slice().sort((a, b) => {
      const loadA = (a.totalCpu - a.freeCpu) / a.totalCpu;
      const loadB = (b.totalCpu - b.freeCpu) / b.totalCpu;
      return loadA - loadB;
    })[0];
  }
}
