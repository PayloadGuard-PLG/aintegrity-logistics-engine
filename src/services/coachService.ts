import { db } from '../db';
import { coaches } from '../db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid/non-secure';
import { Coach, CoachCost } from '../types/resources';

type CoachRow = typeof coaches.$inferSelect;

function toRow(c: Coach): CoachRow {
  return {
    id: c.id || nanoid(),
    type: c.type,
    sessionType: c.sessionType,
    multiplier: c.multiplier,
    attributes: JSON.stringify(c.attributes),
    source: c.source,
    costCurrency: c.cost.currency,
    costAmount: c.cost.amount,
    durationDays: c.durationDays,
    createdAt: Date.now(),
  };
}

function fromRow(row: CoachRow): Coach {
  try {
    return {
      id: row.id,
      type: row.type as Coach['type'],
      sessionType: row.sessionType as Coach['sessionType'],
      multiplier: row.multiplier,
      attributes: JSON.parse(row.attributes) as string[],
      source: row.source as Coach['source'],
      cost: { currency: row.costCurrency as CoachCost['currency'], amount: row.costAmount },
      durationDays: row.durationDays,
    };
  } catch {
    return {
      id: row.id,
      type: row.type as Coach['type'],
      sessionType: row.sessionType as Coach['sessionType'],
      multiplier: row.multiplier,
      attributes: [],
      source: row.source as Coach['source'],
      cost: { currency: 'free', amount: 0 },
      durationDays: row.durationDays,
    };
  }
}

export const coachService = {
  getAll(): Coach[] {
    return db.select().from(coaches).all().map(fromRow);
  },

  getById(id: string): Coach | null {
    const row = db.select().from(coaches).where(eq(coaches.id, id)).get();
    return row ? fromRow(row) : null;
  },

  create(c: Omit<Coach, 'id'>): string {
    const row = toRow({ ...c, id: nanoid() });
    db.insert(coaches).values(row).run();
    return row.id;
  },

  update(c: Coach): void {
    const { id, ...rest } = toRow(c);
    db.update(coaches).set(rest).where(eq(coaches.id, id)).run();
  },

  delete(id: string): void {
    db.delete(coaches).where(eq(coaches.id, id)).run();
  },
};
