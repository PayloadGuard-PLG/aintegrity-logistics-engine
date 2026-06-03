import { db } from '../db';
import { drillPresets } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid/non-secure';

export interface DrillPreset {
  id: string;
  name: string;
  drillNames: string[];
  createdAt: number;
}

type PresetRow = typeof drillPresets.$inferSelect;

function fromRow(row: PresetRow): DrillPreset {
  return {
    id: row.id,
    name: row.name,
    drillNames: JSON.parse(row.drillNames) as string[],
    createdAt: row.createdAt,
  };
}

export const drillPresetService = {
  save(name: string, drillNames: string[]): string {
    const id = nanoid();
    db.insert(drillPresets).values({
      id,
      name,
      drillNames: JSON.stringify(drillNames),
      createdAt: Date.now(),
    }).run();
    return id;
  },

  getAll(): DrillPreset[] {
    return db.select().from(drillPresets)
      .orderBy(desc(drillPresets.createdAt))
      .all()
      .map(fromRow);
  },

  delete(id: string): void {
    db.delete(drillPresets).where(eq(drillPresets.id, id)).run();
  },
};
