import { db } from '../db';
import { players } from '../db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid/non-secure';
import { Player, PlayerSnapshot } from '../database/playerSchema';
import { TierName, TalentTier } from '../types/resources';

type PlayerRow = typeof players.$inferSelect;

function toRow(p: Player): PlayerRow {
  return {
    id: p.id || nanoid(),
    name: p.name,
    roles: JSON.stringify(p.role),
    age: p.age,
    overall: p.overall,
    tier: p.tier,
    talent: p.talent ?? 'Normal',
    stats: JSON.stringify(p.stats),
    isMutantCandidate: p.isMutantCandidate,
    snapshot: p.snapshot ? JSON.stringify(p.snapshot) : null,
    newRole: p.newRole ?? null,
    newRolePoints: p.newRolePoints ?? 0,
    createdAt: Date.now(),
  };
}

const LEGACY_TIER_MAP: Record<string, TierName> = {
  None: 'Stage0', Rare: 'Stage1', Elite: 'Stage2', Stellar: 'Stage3', Master: 'Stage4',
  T0: 'Stage0', T1: 'Stage1', T2: 'Stage2', T3: 'Stage3', T4: 'Stage4',
};

const LEGACY_TALENT_MAP: Record<string, TalentTier> = {
  Fastest: 'Class-A', Fast: 'Class-A', Average: 'Standard', Normal: 'Standard', Slow: 'Degraded',
};

function normaliseTier(t: string): TierName {
  return (LEGACY_TIER_MAP[t] ?? t) as TierName;
}

function normaliseTalent(t: string): TalentTier {
  return (LEGACY_TALENT_MAP[t] ?? t) as TalentTier;
}

function fromRow(row: PlayerRow): Player {
  let snapshot: PlayerSnapshot | null = null;
  try {
    const raw = row.snapshot ? JSON.parse(row.snapshot) as PlayerSnapshot : null;
    if (raw) snapshot = { ...raw, tier: normaliseTier(raw.tier as string) };
  } catch { /* ignore corrupt snapshot */ }

  try {
    return {
      id: row.id,
      name: row.name,
      role: JSON.parse(row.roles) as string[],
      age: row.age,
      overall: row.overall,
      tier: normaliseTier(row.tier),
      talent: normaliseTalent(row.talent ?? 'Normal'),
      stats: JSON.parse(row.stats) as Record<string, number>,
      isMutantCandidate: Boolean(row.isMutantCandidate),
      snapshot,
      newRole: row.newRole ?? null,
      newRolePoints: row.newRolePoints ?? 0,
    };
  } catch {
    return {
      id: row.id,
      name: row.name,
      role: [],
      age: row.age,
      overall: row.overall,
      tier: normaliseTier(row.tier),
      talent: 'Normal',
      stats: {},
      isMutantCandidate: false,
      snapshot,
      newRole: null,
      newRolePoints: 0,
    };
  }
}

export const assetService = {
  getAll(): Player[] {
    return db.select().from(players).all().map(fromRow);
  },

  getById(id: string): Player | null {
    const row = db.select().from(players).where(eq(players.id, id)).get();
    return row ? fromRow(row) : null;
  },

  create(p: Omit<Player, 'id'>): string {
    const row = toRow({ ...p, id: nanoid() });
    db.insert(players).values(row).run();
    return row.id;
  },

  update(p: Player): void {
    const { id, ...rest } = toRow(p);
    db.update(players).set(rest).where(eq(players.id, id)).run();
  },

  // Saves current stats/overall/tier as a snapshot, then applies new values.
  // Replaces any existing snapshot (only one level of undo).
  applyAndSnapshot(player: Player, updates: { stats: Record<string, number>; overall: number; tier: TierName }): void {
    const snap: PlayerSnapshot = { stats: player.stats, overall: player.overall, tier: player.tier };
    const updated: Player = { ...player, ...updates, snapshot: snap };
    const { id, ...rest } = toRow(updated);
    db.update(players).set(rest).where(eq(players.id, id)).run();
  },

  // Restores the player to the saved snapshot and clears it.
  revertToSnapshot(id: string): void {
    const player = assetService.getById(id);
    if (!player?.snapshot) return;
    const { stats, overall, tier } = player.snapshot;
    const reverted: Player = { ...player, stats, overall, tier, snapshot: null };
    const { id: pid, ...rest } = toRow(reverted);
    db.update(players).set(rest).where(eq(players.id, pid)).run();
  },

  delete(id: string): void {
    db.delete(players).where(eq(players.id, id)).run();
  },
};

// Backward-compat alias used by UI components until full migration
export const playerService = assetService;
