import { db } from '../db';
import { squadPlanRuns } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid/non-secure';
import { TierName } from '../types/resources';

export type StatGain = { stat: string; from: number; gain: number; isWhite: boolean };

export interface SquadPlanRun {
  id: string;
  playerId: string;
  label: string | null;
  sessions: number;
  selectedStats: string[];
  ovrBefore: number;
  ovrAfter: number;
  gains: StatGain[];
  tier: TierName | null;
  createdAt: number;
}

export interface SaveRunInput {
  sessions: number;
  selectedStats: string[];
  ovrBefore: number;
  ovrAfter: number;
  gains: StatGain[];
  tier?: TierName | null;
  label?: string | null;
}

type RunRow = typeof squadPlanRuns.$inferSelect;

function fromRow(row: RunRow): SquadPlanRun {
  return {
    id: row.id,
    playerId: row.playerId,
    label: row.label ?? null,
    sessions: row.sessions,
    selectedStats: JSON.parse(row.selectedStats) as string[],
    ovrBefore: row.ovrBefore,
    ovrAfter: row.ovrAfter,
    gains: JSON.parse(row.gains) as StatGain[],
    tier: (row.tier as TierName | null) ?? null,
    createdAt: row.createdAt,
  };
}

export const squadPlanService = {
  saveRun(playerId: string, data: SaveRunInput): string {
    const id = nanoid();
    db.insert(squadPlanRuns).values({
      id,
      playerId,
      label: data.label ?? null,
      sessions: data.sessions,
      selectedStats: JSON.stringify(data.selectedStats),
      ovrBefore: data.ovrBefore,
      ovrAfter: data.ovrAfter,
      gains: JSON.stringify(data.gains),
      tier: data.tier ?? null,
      createdAt: Date.now(),
    }).run();
    return id;
  },

  getRunsForPlayer(playerId: string): SquadPlanRun[] {
    return db.select().from(squadPlanRuns)
      .where(eq(squadPlanRuns.playerId, playerId))
      .orderBy(desc(squadPlanRuns.createdAt))
      .all()
      .map(fromRow);
  },

  getAllRuns(): SquadPlanRun[] {
    return db.select().from(squadPlanRuns)
      .orderBy(desc(squadPlanRuns.createdAt))
      .all()
      .map(fromRow);
  },

  deleteRun(id: string): void {
    db.delete(squadPlanRuns).where(eq(squadPlanRuns.id, id)).run();
  },
};
