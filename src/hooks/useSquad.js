import { useState } from 'react';
import { getOptimizedSquad } from '../services/squadService';

export const useSquad = () => {
  const [squad, setSquad] = useState([]);
  const [loading, setLoading] = useState(false);

  const updateSquad = async (players, settings) => {
    setLoading(true);
    const optimized = await getOptimizedSquad(players, settings);
    setSquad(optimized);
    setLoading(false);
  };

  return { squad, loading, updateSquad };
};
