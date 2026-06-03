import { useState } from 'react';
import { scanPlayerCard } from '../logic/assetProfileScanner';

export type ScanResult = {
  stats: Record<string, number>;
  name?: string;
  age?: number;
  overall?: number;
  roles?: string[];
  tier?: string;
  talent?: string;
  newRole?: string;
  newRolePoints?: number;
};

export const useScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanPlayerScreenshot = async (imageUri: string): Promise<ScanResult | null> => {
    setIsScanning(true);
    setError(null);
    try {
      return await scanPlayerCard(imageUri) as unknown as ScanResult;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed');
      return null;
    } finally {
      setIsScanning(false);
    }
  };

  return { scanPlayerScreenshot, isScanning, scanError: error };
};
