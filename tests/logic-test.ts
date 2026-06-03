import { getRecommendedDrills } from '../src/logic/controller';
import { validateRoleAdjacency } from '../src/utils/metricWeights';

console.log("--- AIntegrity Squad Optimiser: System Integration Test ---");

const multiRolePlayer = {
    role: ['DC', 'DMC'],
    stats: { TACKLING: 110, PASSING: 105, CROSSING: 40 }
};

console.log("\n[Test 1] Testing DC + DMC Combination:");
try {
    const recs = getRecommendedDrills(multiRolePlayer as any);
    console.log("Recommendations for DC+DMC:", JSON.stringify(recs, null, 2));
} catch (e: any) {
    console.error("Error:", e.message);
}

console.log("\n[Test 2] Testing Adjacency Logic:");
console.log("Is DC + DMC Legal? ", validateRoleAdjacency(['DC', 'DMC']));
console.log("Is GK + ST Legal? ", validateRoleAdjacency(['GK', 'ST']));

console.log("\n--- Test Complete ---");
