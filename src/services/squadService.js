import { optimizeSquad } from '../logic/engine';
import { Schema } from '../database/schema';

/**
 * SquadService
 * Orchestrates data flow between the Optimization Engine and DB.
 */

export const getOptimizedSquad = async (allPlayers, settings) => {
  try {
    const result = optimizeSquad(allPlayers, settings);
    // Logic to eventually persist this to the database defined in Schema
    return result;
  } catch (error) {
    console.error("Squad Optimization Service Error:", error);
    return [];
  }
};
