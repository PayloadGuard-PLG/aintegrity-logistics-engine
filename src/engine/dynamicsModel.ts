import type { MetricName } from '../types/resources';

export type DynamicsModelType = 'exponential' | 'linear' | 'threshold-step';

export interface DynamicsModel {
  readonly type: DynamicsModelType;
  readonly metricLabel: string;
  degradationProjection(metric: number, time: number): number;
  recoveryProjection(metric: number, time: number): number;
}

export interface LinearDynamicsModel extends DynamicsModel {
  readonly type: 'linear';
  readonly degradationRatePerUnit: number;
  readonly recoveryRatePerUnit: number;
}

export interface ExponentialDynamicsModel extends DynamicsModel {
  readonly type: 'exponential';
  readonly degradationConstant: number;
  readonly recoveryConstant: number;
}

export interface ThresholdStepDynamicsModel extends DynamicsModel {
  readonly type: 'threshold-step';
  readonly steps: ReadonlyArray<{ readonly threshold: number; readonly degradationRate: number }>;
}

export interface DomainDynamicsConfig {
  readonly modelType: DynamicsModelType;
  readonly metricLabel: string;
  readonly degradationRatePerUnit?: number;
  readonly recoveryRatePerUnit?: number;
  readonly degradationConstant?: number;
  readonly recoveryConstant?: number;
  readonly steps?: ReadonlyArray<{ readonly threshold: number; readonly degradationRate: number }>;
}

export function makeDynamicsModel(config: DomainDynamicsConfig): DynamicsModel {
  switch (config.modelType) {
    case 'linear': {
      const dr = config.degradationRatePerUnit ?? 0;
      const rr = config.recoveryRatePerUnit ?? 0;
      const model: LinearDynamicsModel = {
        type: 'linear',
        metricLabel: config.metricLabel,
        degradationRatePerUnit: dr,
        recoveryRatePerUnit: rr,
        degradationProjection(metric, time) { return metric - dr * time; },
        recoveryProjection(metric, time) { return metric + rr * time; },
      };
      return model;
    }
    case 'exponential': {
      const dc = config.degradationConstant ?? 0;
      const rc = config.recoveryConstant ?? 0;
      const model: ExponentialDynamicsModel = {
        type: 'exponential',
        metricLabel: config.metricLabel,
        degradationConstant: dc,
        recoveryConstant: rc,
        degradationProjection(metric, time) { return metric * Math.exp(-dc * time); },
        recoveryProjection(metric, time) { return metric * Math.exp(-rc * time); },
      };
      return model;
    }
    case 'threshold-step': {
      const steps = config.steps ?? [];
      const model: ThresholdStepDynamicsModel = {
        type: 'threshold-step',
        metricLabel: config.metricLabel,
        steps,
        degradationProjection(metric, time) {
          const step = [...steps].reverse().find(s => metric <= s.threshold);
          const rate = step?.degradationRate ?? 0;
          return metric - rate * time;
        },
        recoveryProjection(metric, _time) { return metric; },
      };
      return model;
    }
    default: {
      const _exhaustive: never = config.modelType;
      throw new Error(`Unknown DynamicsModel type: ${String(_exhaustive)}`);
    }
  }
}
