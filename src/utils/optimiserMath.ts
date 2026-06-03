/**
 * optimiserMath.ts: Core Calculation Logic
 * Handles the distribution of training points based on role efficiency.
 */

export function calculateEfficiency(currentStat: number, isWhiteSkill: boolean): number {
    // White skills (essential) gain faster than grey skills
    const baseGain = isWhiteSkill ? 1.0 : 0.5;
    
    // Diminishing returns as stats approach 180%
    if (currentStat > 140) return baseGain * 0.4;
    if (currentStat > 100) return baseGain * 0.7;
    return baseGain;
}

export function projectOvrGain(sessions: number, intensity: number): number {
    return (sessions * intensity) / 100;
}
