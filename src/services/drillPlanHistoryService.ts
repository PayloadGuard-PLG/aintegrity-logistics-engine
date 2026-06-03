import { expoDb } from '../db';

export type DrillPlanEntry = {
  id: string;
  playerId: string;
  timestamp: number;
  presetName: string;
  drillNames: string[];
  cycles: number;
  fanLevel: number;
  label: string;
};

export const drillPlanHistoryService = {
  save(entry: Omit<DrillPlanEntry, 'label'>): void {
    const label = `${entry.presetName} ×${entry.cycles} — ${entry.drillNames.length} DRILLS`;
    try {
      expoDb.runSync(
        `INSERT OR REPLACE INTO drill_plan_history
           (id, player_id, timestamp, preset_name, drill_names, cycles, fan_level, label)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [entry.id, entry.playerId, entry.timestamp, entry.presetName,
         JSON.stringify(entry.drillNames), entry.cycles, entry.fanLevel, label]
      );
    } catch {}
  },

  getForPlayer(playerId: string, limit = 10): DrillPlanEntry[] {
    try {
      const rows = expoDb.getAllSync<Record<string, unknown>>(
        `SELECT * FROM drill_plan_history WHERE player_id = ? ORDER BY timestamp DESC LIMIT ?`,
        [playerId, limit]
      );
      return rows.map(r => ({
        id: String(r.id),
        playerId: String(r.player_id),
        timestamp: Number(r.timestamp),
        presetName: String(r.preset_name ?? ''),
        drillNames: JSON.parse(String(r.drill_names ?? '[]')) as string[],
        cycles: Number(r.cycles ?? 1),
        fanLevel: Number(r.fan_level ?? 0),
        label: String(r.label ?? ''),
      }));
    } catch {
      return [];
    }
  },
};
