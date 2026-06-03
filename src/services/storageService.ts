import fs from 'fs/promises';
import path from 'path';
import { Player } from '../database/playerSchema';

const STORAGE_PATH = path.join(process.cwd(), 'players.json');

export async function savePlayers(players: Player[]): Promise<void> {
    const data = JSON.stringify(players, null, 2);
    await fs.writeFile(STORAGE_PATH, data, 'utf8');
}

export async function loadPlayers(): Promise<Player[]> {
    try {
        const data = await fs.readFile(STORAGE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Returns empty list if no file exists yet
        return [];
    }
}
