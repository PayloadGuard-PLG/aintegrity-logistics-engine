/**
 * Local Database Schema
 * Defines the structure for Squads, Players, and Optimization History.
 */

export const Schema = {
  name: 'SquadOptimiserDB',
  version: 1,
  tables: {
    players: {
      primaryKey: 'id',
      columns: ['name', 'position', 'efficiencyRating', 'compatibilityScore']
    },
    squads: {
      primaryKey: 'id',
      columns: ['squadName', 'creationDate', 'totalSynergy']
    }
  }
};
