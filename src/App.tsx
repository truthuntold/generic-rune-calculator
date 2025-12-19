import { useState, useEffect } from 'react';
import { loadConfig, loadRunes, loadScales } from './app/loaders';
import { GenericRunePanel } from './ui/GenericRunePanel';

export type RpsMode = 'raw' | 'derived';

export interface GameConfig {
  displayName?: string;
  rpsMode: RpsMode;
  speedInput?: 'perSecond' | 'secondsPerOpen';
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
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="glass-panel p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center p-4 bg-rose-500/10 rounded-full mb-6">
            <svg className="w-12 h-12 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Failed to load data</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary w-full"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!config || !runes || !scales) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-400 font-medium animate-pulse">Initializing calculator...</p>
        </div>
      </div>
    );
  }

  return <GenericRunePanel config={config} runes={runes} scales={scales} />;
}

export default App;