// Web implementation of useSquad using localStorage + window events.
// Metro resolves this file instead of useSquad.ts when bundling for web.

import { useState, useEffect } from 'react';
import { Player } from '../database/playerSchema';
import { playerService } from '../services/assetService';

const UPDATE_EVENT = 'aintegrity_squad_updated';

export function useSquad(): { squad: Player[]; error: Error | undefined } {
  const [squad, setSquad] = useState<Player[]>(() => {
    try { return playerService.getAll(); } catch { return []; }
  });

  useEffect(() => {
    const refresh = () => {
      try { setSquad(playerService.getAll()); } catch {}
    };
    window.addEventListener(UPDATE_EVENT, refresh);
    return () => window.removeEventListener(UPDATE_EVENT, refresh);
  }, []);

  return { squad, error: undefined };
}
