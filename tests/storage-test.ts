import { savePlayers, loadPlayers } from '../src/services/storageService';
import { Player } from '../src/database/playerSchema';

async function runTest() {
    console.log("--- AIntegrity Storage Test ---");
    
    const testSquad: Player[] = [{
        id: '1',
        name: 'Alpha Striker',
        role: ['ST'],
        age: 19,
        overall: 45,
        tier: 'T0',
        talent: 'Normal',
        stats: { FINISHING: 115, SPEED: 105 },
        isMutantCandidate: true
    }];

    await savePlayers(testSquad);
    console.log("✔ Squad saved to players.json");

    const loaded = await loadPlayers();
    console.log(`✔ Squad loaded. First player: ${loaded[0]?.name}`);
    console.log("--- Test Complete ---");
}

runTest();
