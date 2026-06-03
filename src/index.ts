import readline from 'readline';
import { loadPlayers, savePlayers } from './services/storageService';
import { getBestDrillSelections } from './logic/controller';
import { planPlayerInvestment } from './logic/investmentEngine';
import { compareInvestmentScenarios } from './logic/scenarioComparator';
import { ROLE_CONSTRAINTS, validateRoleAdjacency } from './utils/metricWeights';
import { DRILL_LIST } from './database/drillDatabase';
import { Player } from './database/playerSchema';
import { DrillSession, DrillLevel, TalentTier, ManagerProfile, ManagerStyle, TierName } from './types/resources';
import gameProfile from '../profiles/logistics_v1.json';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>(res => rl.question(q, res));

function buildDefaultStats(roles: string[]): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const role of roles.slice(0, 3)) {
    const roleData = ROLE_CONSTRAINTS[role.toUpperCase()];
    if (!roleData) continue;
    for (const s of roleData.essential) stats[s] = stats[s] ?? 100;
    for (const s of roleData.secondary) stats[s] = stats[s] ?? 80;
  }
  return stats;
}

async function collectDrillSessions(): Promise<DrillSession[]> {
  const sessions: DrillSession[] = [];
  console.log("\nAvailable drills:");
  DRILL_LIST.forEach((d, i) => console.log(`  ${i + 1}. ${d.name} [${d.type}] — ${d.stats.join(', ')}`));
  console.log("\nEnter drill sessions (blank drill # to finish):");

  while (true) {
    const drillIdxStr = await ask("  Drill # (or blank to finish): ");
    if (!drillIdxStr.trim()) break;
    const drillIdx = parseInt(drillIdxStr, 10) - 1;
    const drill = DRILL_LIST[drillIdx];
    if (!drill) { console.log("  Invalid drill number."); continue; }

    const countStr = await ask("  Sessions count [10]: ");
    const levelStr = await ask("  Level (Very Easy/Easy/Medium/Hard/Very Hard) [Very Easy]: ");
    const count = parseInt(countStr, 10) || 10;
    const level = (['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'].includes(levelStr.trim())
      ? levelStr.trim() : 'Very Easy') as DrillLevel;

    sessions.push({ drillName: drill.name, sessionCount: count, drillLevel: level });
  }
  return sessions;
}

async function startApp() {
  const players = await loadPlayers();
  console.log("\n--- AIntegrity Squad Optimiser ---");

  const choice = await ask("1. View Squad\n2. Drill Optimiser\n3. Add Player\n4. Plan Investment\n5. Compare Players\n6. Exit\nSelection: ");

  if (choice === '1') {
    if (players.length === 0) {
      console.log("No players yet. Add one first.");
    } else {
      console.table(players.map(p => ({
        Name: p.name,
        Roles: p.role.join('/'),
        Age: p.age,
        OVR: p.overall,
        Tier: p.tier ?? 'None',
        Mutant: p.isMutantCandidate ? 'Yes' : 'No',
      })));
    }
    startApp();

  } else if (choice === '2') {
    const name = await ask("Enter Player Name: ");
    const p = players.find(pl => pl.name.toLowerCase() === name.toLowerCase());
    if (p) {
      console.log(`\nDrill Recommendations for ${p.name} (Fan Club Lvl 4):\n`);
      console.table(getBestDrillSelections(p, 4));
    } else {
      console.log(`Player "${name}" not found.`);
    }
    startApp();

  } else if (choice === '3') {
    const name = await ask("Player Name: ");
    const rolesInput = await ask("Role(s) [e.g. ST  or  DC,DMC]: ");
    const roles = rolesInput.split(',').map(r => r.trim().toUpperCase());
    if (!validateRoleAdjacency(roles)) {
      console.log(`Invalid role combo: ${roles.join('+')} — roles must be adjacent.`);
      startApp();
      return;
    }
    const ageStr = await ask("Age: ");
    const ovrStr = await ask("Overall Rating: ");
    const tierInput = await ask("Tier (None/Rare/Elite/Stellar/Master/Epic/Legendary) [None]: ");
    const mutStr = await ask("Mutant Candidate? (y/n): ");

    const newPlayer: Player = {
      id: Date.now().toString(),
      name,
      role: roles,
      age: parseInt(ageStr, 10),
      overall: parseFloat(ovrStr),
      tier: (tierInput.trim() || 'None') as TierName,
      talent: 'Normal',
      stats: buildDefaultStats(roles),
      isMutantCandidate: mutStr.toLowerCase() === 'y',
    };
    await savePlayers([...players, newPlayer]);
    console.log(`✔ ${name} added to squad (${roles.join('/')}, ${newPlayer.tier} tier).`);
    startApp();

  } else if (choice === '4') {
    if (players.length === 0) { console.log("Add a player first."); startApp(); return; }
    console.table(players.map((p, i) => ({ '#': i + 1, Name: p.name, OVR: p.overall, Age: p.age })));
    const idxStr = await ask("Select player # to plan: ");
    const player = players[parseInt(idxStr, 10) - 1];
    if (!player) { console.log("Invalid selection."); startApp(); return; }

    const drillSessions = await collectDrillSessions();
    const tierInput = await ask("Target tier (None/Rare/Elite/Stellar/Master/Epic/Legendary) or blank to skip: ");
    const tierPointsStr = await ask("Available tier points: ");
    const restorersStr = await ask("Available restorers: ");
    const styleInput = await ask("Manager style (FTP/Hybrid/PTW) [PTW]: ");
    const talentInput = await ask("Player talent (Fastest/Fast/Average/Normal/Slow) [Normal]: ");
    const levelInput = await ask("Drill level (Very Easy/Easy/Medium/Hard/Very Hard) [Very Easy]: ");
    const adInput = await ask("2× Ad active this session? (y/n) [n]: ");
    const sponsorInput = await ask("Premium sponsor? (y/n) [n]: ");

    const targetTier = tierInput.trim() ? (tierInput.trim() as TierName) : null;
    const profile: ManagerProfile = {
      style: ((styleInput.trim() || 'PTW') as ManagerStyle),
      tierPoints: targetTier ? { [targetTier]: parseInt(tierPointsStr, 10) || 0 } : {},
      restorers: parseInt(restorersStr, 10) || 0,
      isPremiumSponsor: sponsorInput.toLowerCase() === 'y',
      twoxAdActive: adInput.toLowerCase() === 'y',
      talentTier: (['Fastest', 'Fast', 'Average', 'Normal', 'Slow', 'FT1', 'FT2', 'FT3'].includes(talentInput.trim())
        ? talentInput.trim() : 'Normal') as TalentTier,
      drillLevel: (['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'].includes(levelInput.trim())
        ? levelInput.trim() : 'Very Easy') as DrillLevel,
      matchAdvisorActive: false,
    };

    const plan = planPlayerInvestment(player, profile, drillSessions, gameProfile, targetTier);
    console.log(`\n=== Investment Plan: ${plan.player?.name ?? plan.asset?.name ?? 'unknown'} ===`);
    console.table(plan.steps.map(s => ({
      Action: s.action,
      Description: s.description.substring(0, 55),
      'OVR Before': s.ovrBefore,
      'OVR After': s.ovrAfter,
      Resources: s.resourcesUsed,
    })));
    console.log(`\nFinal OVR: ${plan.finalOvr ?? plan.finalCci ?? 0}  (+${plan.totalOvrGain ?? plan.totalCciGain ?? 0})`);
    console.log(`\n${plan.recommendation}`);
    if (plan.warnings.length) plan.warnings.forEach(w => console.log(`⚠  ${w}`));
    startApp();

  } else if (choice === '5') {
    if (players.length < 2) { console.log("Need at least 2 players to compare."); startApp(); return; }
    console.table(players.map((p, i) => ({ '#': i + 1, Name: p.name, OVR: p.overall, Age: p.age })));
    const indicesStr = await ask("Enter player numbers to compare (comma-separated, e.g. 1,2): ");
    const selectedPlayers = indicesStr.split(',')
      .map(s => players[parseInt(s.trim(), 10) - 1])
      .filter(Boolean);
    if (selectedPlayers.length < 2) { console.log("Invalid selection."); startApp(); return; }

    const drillSessions = await collectDrillSessions();
    const tierInput = await ask("Target tier (or blank): ");
    const tierPointsStr = await ask("Tier points: ");
    const restorersStr = await ask("Restorers: ");
    const styleInput = await ask("Manager style (FTP/Hybrid/PTW) [PTW]: ");
    const talentInput = await ask("Player talent (Fastest/Fast/Average/Normal/Slow) [Normal]: ");
    const levelInput = await ask("Drill level (Very Easy/Easy/Medium/Hard/Very Hard) [Very Easy]: ");
    const sponsorInput = await ask("Premium sponsor? (y/n) [n]: ");

    const targetTier = tierInput.trim() ? (tierInput.trim() as TierName) : null;
    const profile: ManagerProfile = {
      style: ((styleInput.trim() || 'PTW') as ManagerStyle),
      tierPoints: targetTier ? { [targetTier]: parseInt(tierPointsStr, 10) || 0 } : {},
      restorers: parseInt(restorersStr, 10) || 0,
      isPremiumSponsor: sponsorInput.toLowerCase() === 'y',
      twoxAdActive: false,
      talentTier: (['Fastest', 'Fast', 'Average', 'Normal', 'Slow', 'FT1', 'FT2', 'FT3'].includes(talentInput.trim())
        ? talentInput.trim() : 'Normal') as TalentTier,
      drillLevel: (['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'].includes(levelInput.trim())
        ? levelInput.trim() : 'Very Easy') as DrillLevel,
      matchAdvisorActive: false,
    };

    const comparison = compareInvestmentScenarios(selectedPlayers, profile, drillSessions, gameProfile, targetTier);
    console.log('\n=== Scenario Comparison ===');
    console.table(comparison.results.map(r => ({
      Rank: r.rank,
      Player: r.playerName,
      'Current OVR': r.currentOvr,
      'Projected OVR': r.projectedOvr,
      'OVR Gain': r.ovrGain,
    })));
    console.log(`\n✔ Recommended: ${comparison.recommendedPlayer}`);
    console.log(`   ${comparison.reasoning}`);
    startApp();

  } else {
    rl.close();
    process.exit();
  }
}

startApp();
