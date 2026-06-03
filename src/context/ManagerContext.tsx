import React, { createContext, useContext, useState } from 'react';
import { ManagerProfile, ManagerStyle, TalentTier, DrillLevel } from '../types/resources';

type ManagerCtx = ManagerProfile & {
  setStyle: (s: ManagerStyle) => void;
  setTierPoints: (t: Partial<Record<import('../types/resources').TierName, number>>) => void;
  setRestorers: (n: number) => void;
  setStoreBudget: (n: number | undefined) => void;
  togglePremiumSponsor: () => void;
  toggleTwoxAd: () => void;
  setTalentTier: (t: TalentTier) => void;
  setDrillLevel: (d: DrillLevel) => void;
  toggleMatchAdvisor: () => void;
  selectedPlayerId: string | null;
  setSelectedPlayerId: (id: string | null) => void;
};

const ManagerContext = createContext<ManagerCtx | null>(null);

export function ManagerProvider({ children }: { children: React.ReactNode }) {
  const [style, setStyle] = useState<ManagerStyle>('FTP');
  const [tierPoints, setTierPoints] = useState<Partial<Record<import('../types/resources').TierName, number>>>({});
  const [restorers, setRestorers] = useState(0);
  const [isPremiumSponsor, setIsPremiumSponsor] = useState(false);
  const [storeBudget, setStoreBudget] = useState<number | undefined>(undefined);
  const [twoxAdActive, setTwoxAdActive] = useState(false);
  const [talentTier, setTalentTier] = useState<TalentTier>('Normal');
  const [drillLevel, setDrillLevel] = useState<DrillLevel>('Medium');
  const [matchAdvisorActive, setMatchAdvisorActive] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  return (
    <ManagerContext.Provider value={{
      style, tierPoints, restorers, isPremiumSponsor, storeBudget,
      twoxAdActive, talentTier, drillLevel, matchAdvisorActive,
      selectedPlayerId, setSelectedPlayerId,
      setStyle,
      setTierPoints,
      setRestorers,
      setStoreBudget,
      togglePremiumSponsor: () => setIsPremiumSponsor(v => !v),
      toggleTwoxAd: () => setTwoxAdActive(v => !v),
      setTalentTier,
      setDrillLevel,
      toggleMatchAdvisor: () => setMatchAdvisorActive(v => !v),
    }}>
      {children}
    </ManagerContext.Provider>
  );
}

export function useManager(): ManagerCtx {
  const ctx = useContext(ManagerContext);
  if (!ctx) throw new Error('useManager must be used inside <ManagerProvider>');
  return ctx;
}
