import { getBestDrillSelections } from '../src/logic/controller.js';

// Mocking a Monster DC/DMC build
const monsterPlayer = {
    name: "Alpha Defender",
    role: ['DC', 'DMC'],
    stats: { 
        TACKLING: 100, 
        PASSING: 90, 
        MARKING: 110, 
        POSITIONING: 80,
        FITNESS: 100,
        STRENGTH: 95
    }
};

console.log("--- AIntegrity 2026: Drill Logic Test ---");
console.log("Scenario: Fan Club Level 4 (-50% Condition Drain)\n");

try {
    const recommendations = getBestDrillSelections(monsterPlayer as any, 4);
    console.table(recommendations);
    console.log("\n✔ Logic execution successful.");
} catch (error: any) {
    console.error("❌ Test Failed:", error.message);
}
