import { useState } from "react";
import { effectiveBaseRps, etaSeconds, oneInNToNumber, shouldApplyLuck } from "../core/engine";
import { formatTimeHuman, parseScaled } from "../core/scales";

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

interface GenericRunePanelProps {
  runes: RuneRecord[];
  scales: Record<string, number>;
  config: GameConfig;
}

export function GenericRunePanel({ runes, scales, config }: GenericRunePanelProps) {
  const [rps, setRps] = useState(config.defaults?.rps || '');
  const [speed, setSpeed] = useState(config.defaults?.speed || '');
  const [bulk, setBulk] = useState(config.defaults?.bulk || '');
  const [luck, setLuck] = useState(config.defaults?.luck || '1');
  const [filter, setFilter] = useState('');
  const [showUnder1Hour, setShowUnder1Hour] = useState(false);
  const [hideInstant, setHideInstant] = useState(false);
  const [showSecretsOnly, setShowSecretsOnly] = useState(false);

  const baseRps = effectiveBaseRps({ rps, speed, bulk }, config.rpsMode, scales);
  const luckValue = parseScaled(luck, scales).value;

  const filteredRunes = runes
    .filter(rune => rune.name.toLowerCase().includes(filter.toLowerCase()))
    .map(rune => {
      const chanceN = oneInNToNumber(rune.chance.n, scales);
      const appliesLuck = shouldApplyLuck(rune, config.luckRules);
      const eta = etaSeconds(chanceN, baseRps, luckValue, appliesLuck);
      return { ...rune, eta };
    })
    .filter(rune => !showUnder1Hour || rune.eta < 3600)
    .filter(rune => !hideInstant || rune.eta >= 1)
    .filter(rune => !showSecretsOnly || rune.tags?.includes('secret'));

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{config.displayName}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          {config.rpsMode === 'raw' ? (
            <div>
              <label htmlFor="rps" className="block text-sm font-medium text-gray-700">{config.labels?.rps || 'RPS'}</label>
              <input type="text" id="rps" value={rps} onChange={e => setRps(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="speed" className="block text-sm font-medium text-gray-700">{config.labels?.speed || 'Speed'}</label>
                <input type="text" id="speed" value={speed} onChange={e => setSpeed(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="bulk" className="block text-sm font-medium text-gray-700">{config.labels?.bulk || 'Bulk'}</label>
                <input type="text" id="bulk" value={bulk} onChange={e => setBulk(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
            </div>
          )}
        </div>
        <div>
          <label htmlFor="luck" className="block text-sm font-medium text-gray-700">{config.labels?.luck || 'Luck'}</label>
          <input type="text" id="luck" value={luck} onChange={e => setLuck(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>
        <div>
          <p>Effective RPS: {baseRps.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-4">
        <input type="text" placeholder="Filter by name" value={filter} onChange={e => setFilter(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        <div className="flex items-center">
          <input type="checkbox" checked={showUnder1Hour} onChange={e => setShowUnder1Hour(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          <label className="ml-2 block text-sm text-gray-900">Only under 1 hour</label>
        </div>
        <div className="flex items-center">
          <input type="checkbox" checked={hideInstant} onChange={e => setHideInstant(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          <label className="ml-2 block text-sm text-gray-900">Hide Instant</label>
        </div>
        <div className="flex items-center">
          <input type="checkbox" checked={showSecretsOnly} onChange={e => setShowSecretsOnly(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          <label className="ml-2 block text-sm text-gray-900">Secrets only</label>
        </div>
      </div>

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chance</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ETA</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredRunes.map(rune => (
            <tr key={rune.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rune.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">1 in {rune.chance.n.toString()}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTimeHuman(rune.eta)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rune.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
