// --- Constant provenance (Phase B Problem 5) ---

export type ConstantSource     = 'game' | 'literature-seeded' | 'field-fit';
export type ConstantConfidence = 'high' | 'provisional' | 'assumed';

export interface ConstantMeta<T> {
  readonly value:      T;
  readonly source:     ConstantSource;
  readonly n:          number;
  readonly cv?:        number;
  readonly confidence: ConstantConfidence;
  readonly citation?:  string;
  readonly variance?:  number;
}

// --- Domain asset types ---

export type AssetClass      = string;  // e.g. 'vehicle' | 'equipment' | 'personnel'
export type EfficiencyClass = string;  // replaces TalentTier: e.g. 'Class-A' | 'Standard' | 'Degraded'
export type StageName       = 'Stage0' | 'Stage1' | 'Stage2' | 'Stage3' | 'Stage4';
export type SupportLevel    = 0 | 1 | 2 | 3 | 4;
export type MetricName      = string;  // domain-defined metric label

export interface Asset {
  id:                   string;
  name:                 string;
  assetClass:           AssetClass;
  efficiencyClass:      EfficiencyClass;
  maturityLevel:        number;               // replaces age; lifecycle age index
  primaryMetrics:       MetricName[];         // replaces roles — determines primary (white) metrics
  lifecycleStage:       StageName;            // replaces tier
  metrics:              Record<MetricName, number>;
  operationalReadiness: number;               // 0–100, replaces condition
  supportLevel:         SupportLevel;         // replaces fanLevel
}

// --- Ceiling rules (Phase B Problem 3) ---

export type CeilingOperator = '>=' | '<=' | '>' | '<';

export interface CeilingRule {
  readonly parameter:  MetricName | '__base_cci__';
  readonly operator:   CeilingOperator;
  readonly threshold:  number;
  readonly source:     string;   // citation: e.g. "EN 13231-1 §6.2" or "logistics_v1.json maxBaseOvr"
  readonly polarity:   'lock-when-good' | 'lock-when-bad';
}

export interface RuleSetEvaluation {
  readonly locked:         boolean;
  readonly triggeredRules: CeilingRule[];
}

// --- Intervention types (Phase B Problem 2) ---

export type InterventionType = 'partial-reset' | 'full-reset' | 'restore-to-fraction';

export interface InterventionParams {
  readonly targetPct:       number;          // 0–1; full reset=1.0, partial preservation=0.70–0.80
  readonly affectedMetrics: MetricName[];
}

export interface InterventionConfig {
  readonly type:             InterventionType;
  readonly name:             string;
  readonly paramConstraints: { minTargetPct: number; maxTargetPct: number };
}

// --- Uncertainty propagation (Phase B Problem 4) ---

export interface ProjectionBand {
  readonly estimate:  number;
  readonly variance:  number;
  readonly ci95Lo:    number;   // estimate - 1.96 * sqrt(variance)
  readonly ci95Hi:    number;   // estimate + 1.96 * sqrt(variance)
  readonly provenanceFlags: {
    lowestConfidence:    ConstantConfidence;
    anyLiteratureSeeded: boolean;
    anyAssumed:          boolean;
  };
}

// --- Engine profile (loaded from profiles/logistics_v1.json) ---

export interface XpCostEntry {
  statMin:    number;
  statMax:    number;
  xpPer1Pct:  number; // -1 means Infinity (ceiling-rule)
}

export interface GameProfile {
  version: string;
  xpCostTable: XpCostEntry[];
  xpCostBase?: number;
  xpCostDecayK?: number;
  seasonDecayPerLevel?: number;
  ageTable: Record<string, number>;
  talentMultipliers: Record<string, number>;
  drillLevelMultipliers: Record<string, number>;
  tierAttrAdditions: Record<string, number>;
  tierIncrements: Record<string, number>;
  tierPointsRequired: Record<string, number>;
  fanClubCondReduction: number[];
  condLevelMultipliers: Record<string, number>;
  baseLossPerDrill: number;
  zeroDrainThreshold: number;
  greyWeightMultiplier: number;
  statCap: number;
  maxBaseOvr: number;
  baseXpPerSession: number;
  drillXpFactor?: number;
  sessionBudgetDecay?: number;
  twoxAdMultiplier: number;
  starDecayPerSession: number;
  starOvrThreshold: number;
  qualityOvrDivisor: number;
  totalAttributeCount: number;
  teamPlayDecayPerDay: number;
  matchAdvisorMultiplier: number;
  teamPlayFreeDrillsPerDay: number;
  conditionPerRestorer: number;
  maxTrainingLevel: number;
}

// --- Legacy coach types (kept for DB backward compatibility) ---

export type CoachType    = 'Attacking' | 'Defending' | 'Physical' | 'Mixed' | 'Focused';
export type SessionType  = 'Training' | 'Seminar';

export interface CoachCost {
  currency: 'tokens' | 'cash' | 'free';
  amount:   number;
}

export interface Coach {
  id:           string;
  type:         CoachType;
  sessionType:  SessionType;
  multiplier:   number;
  attributes:   string[];
  durationDays: number;
  source:       'Academy' | 'PremiumChest' | 'Store' | 'Other';
  cost:         CoachCost;
}

// --- Domain profile (extends engine profile with logistics-specific schema) ---

export interface DomainProfile extends GameProfile {
  domain:             string;
  metricVocabulary:   MetricName[];                    // all valid metric names for this domain
  ceilingRules?:      CeilingRule[];                   // Phase B Problem 3
  interventionTypes?: Record<string, InterventionConfig>; // Phase B Problem 2
}

// --- Legacy type aliases (UI components use these until full migration) ---

export type TalentTier = EfficiencyClass;   // alias: 'Class-A' | 'Standard' | 'Degraded' + legacy values
export type DrillLevel = 'Very Easy' | 'Easy' | 'Medium' | 'Hard' | 'Very Hard'
                       | 'Minimal' | 'Moderate' | 'Heavy' | 'Intensive' | 'Maximum';

// ManagerStyle / TeamPlayPillar retained for plan.tsx until UI is migrated
export type ManagerStyle   = 'FTP' | 'Hybrid' | 'PTW';
export type TeamPlayPillar = 'attack' | 'defence' | 'possession' | 'condition';

export interface ManagerProfile {
  style:               ManagerStyle;
  tierPoints:          Partial<Record<TierName, number>>;
  restorers:           number;
  isPremiumSponsor:    boolean;
  storeBudget?:        number;
  twoxAdActive:        boolean;
  talentTier:          TalentTier;
  drillLevel:          DrillLevel;
  matchAdvisorActive:  boolean;
  teamPlayPillars?:    Partial<Record<TeamPlayPillar, number>>;
}

export interface TeamPlayPlan {
  pillars:                    Partial<Record<TeamPlayPillar, number>>;
  decayPerDay:                number;
  freeDrillsNeeded:           number;
  matchAdvisorCoversDecay:    boolean;
  recommendation:             string;
}

export interface FixtureWindow {
  cycles:        number;
  totalSessions: number;
}

export interface GreensBridgeSuggestion {
  restorersNeeded:     number;
  additionalCycles:    number;
  worthwhile:          boolean;
  note:                string;
}

// --- Investment plan ---

export type InvestmentStepAction = 'intervention' | 'lifecycle-upgrade' | 'readiness-restore'
                                 | 'drill' | 'tier' | 'condition';  // legacy UI values

export interface InvestmentStep {
  action:        InvestmentStepAction;
  description:   string;
  cciBefore?:    number;
  cciAfter?:     number;
  ovrBefore:     number;
  ovrAfter:      number;
  resourcesUsed: string;
}

export interface InvestmentPlan {
  asset?:             { name: string; currentCci: number };
  player?:            { name: string; currentOvr: number };
  steps:              InvestmentStep[];
  finalCci?:          number;
  finalOvr?:          number;
  totalCciGain?:      number;
  totalOvrGain?:      number;  // backward-compat alias
  totalResourceCost:  string;
  recommendation:     string;
  warnings:           string[];
}

// --- Multi-asset scenario comparison ---

export interface ScenarioResult {
  assetName?:    string;
  playerName?:   string;
  currentCci?:   number;
  currentOvr?:   number;
  projectedCci?: number;
  projectedOvr?: number;
  cciGain?:      number;
  ovrGain?:      number;
  plan:          InvestmentPlan;
  rank:          number;
}

export interface ScenarioComparison {
  results:              ScenarioResult[];
  recommendedAsset?:    string;
  recommendedPlayer?:   string;
  reasoning:            string;
}

// --- Drill / conditioning session ---

export interface DrillSession {
  drillName:     string;
  sessionCount:  number;
  drillLevel:    DrillLevel;
}

// --- Legacy support level (SupportLevel is the canonical type above) ---

export type FanLevel = SupportLevel;

// --- Stage / Tier naming (broad union for backward compatibility with UI) ---

export type TierName = StageName | 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6';
