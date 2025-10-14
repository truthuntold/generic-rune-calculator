import { useState, useEffect } from 'react';
import { loadConfig, loadRunes, loadScales } from './app/loaders';
import { GenericRunePanel } from './ui/GenericRunePanel';

export type RpsMode = 'raw' | 'derived';

export interface GameConfig {
  displayName?: string;
  rpsMode: RpsMode;
  labels?: Partial<Record<'rps' | 'speed' | 'bulk' | 'luck', string>>;
  defaults?: Partial<Record<'rps' | 'speed' | 'bulk' | 'luck', string>>;
  luckRules?: { applyTo?: 'known' | 'all' | 'none' }; // default 'known'
}

export interface ProbabilityOneInN {
  type: 'oneInN';
  n: string | number; // supports huge values, possibly suffixed (e.g., "1Qd")
}

export interface RuneRecord {
  id: string;
  name: string;
  chance: ProbabilityOneInN;
  source?: string;     // where to get it
  tags?: string[];     // e.g., ["secret"], ["noluck"]
}

function App() {
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [runes, setRunes] = useState<RuneRecord[] | null>(null);
  const [scales, setScales] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadConfig(), loadRunes(), loadScales()])
      .then(([config, runes, scales]) => {
        setConfig(config);
        setRunes(runes);
        setScales(scales);
      })
      .catch(err => {
        setError(err.message);
      });
  }, []);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!config || !runes || !scales) {
    return <div>Loading...</div>;
  }

  return <GenericRunePanel config={config} runes={runes} scales={scales} />;
}

export default App;