import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Clock,
  Sparkles,
  Zap,
  ShieldAlert,
  LayoutGrid,
  List,
  Info
} from "lucide-react";
import { effectiveBaseRps, etaSeconds, oneInNToNumber, shouldApplyLuck } from "../core/engine";
import { formatScaled, formatTimeHuman, parseScaled } from "../core/scales";
import { useLocalStorageBooleanState, useLocalStorageStringState } from "./useLocalStorageStringState";
import { ChangelogDialog } from "./ChangelogDialog";

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
  n: string | number;
}

export interface RuneRecord {
  id: string;
  name: string;
  chance: ProbabilityOneInN;
  source?: string;
  tags?: string[];
}

interface GenericRunePanelProps {
  runes: RuneRecord[];
  scales: Record<string, number>;
  config: GameConfig;
}

export function GenericRunePanel({ runes, scales, config }: GenericRunePanelProps) {
  const [rps, setRps] = useState(config.defaults?.rps || '');

  const storageScope = `grc:v1:${config.displayName ?? 'default'}:${config.rpsMode}`;

  const [speed, setSpeed] = useLocalStorageStringState(`${storageScope}:speed`, config.defaults?.speed || '');
  const [bulk, setBulk] = useLocalStorageStringState(`${storageScope}:bulk`, config.defaults?.bulk || '');
  const [luck, setLuck] = useLocalStorageStringState(`${storageScope}:luck`, config.defaults?.luck || '1');
  const [filter, setFilter] = useState('');
  const [showUnder1Hour, setShowUnder1Hour] = useLocalStorageBooleanState(`${storageScope}:showUnder1Hour`, false);
  const [hideInstant, setHideInstant] = useLocalStorageBooleanState(`${storageScope}:hideInstant`, false);
  const [showSecretsOnly, setShowSecretsOnly] = useLocalStorageBooleanState(`${storageScope}:showSecretsOnly`, false);
  const [sortField, setSortField] = useState<string>('chance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [customChance, setCustomChance] = useLocalStorageStringState(`${storageScope}:customChance`, '');

  const baseRps = effectiveBaseRps({ rps, speed, bulk }, config.rpsMode, scales, config.speedInput);
  const luckValue = parseScaled(luck, scales).value;

  const customChanceData = useMemo(() => {
    if (!customChance) return null;
    return parseScaled(customChance, scales);
  }, [customChance, scales]);

  const customEta = useMemo(() => {
    if (!customChanceData || customChanceData.value <= 0) return null;
    return etaSeconds(customChanceData.value, baseRps, luckValue, true);
  }, [customChanceData, baseRps, luckValue]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const processedRunes = useMemo(() => {
    return runes
      .map(rune => {
        const chanceN = oneInNToNumber(rune.chance.n, scales);
        const appliesLuck = shouldApplyLuck(rune, config.luckRules);
        const eta = etaSeconds(chanceN, baseRps, luckValue, appliesLuck);
        return { ...rune, eta, chanceN };
      })
      .filter(rune => {
        const matchesFilter = rune.name.toLowerCase().includes(filter.toLowerCase()) ||
          rune.source?.toLowerCase().includes(filter.toLowerCase());
        const matchesUnder1Hour = !showUnder1Hour || rune.eta < 3600;
        const matchesInstant = !hideInstant || rune.eta >= 1;
        const matchesSecrets = !showSecretsOnly || rune.tags?.includes('secret');

        return matchesFilter && matchesUnder1Hour && matchesInstant && matchesSecrets;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortField === 'name') {
          comparison = a.name.localeCompare(b.name);
        } else if (sortField === 'chance') {
          comparison = a.chanceN - b.chanceN;
        } else if (sortField === 'eta') {
          comparison = a.eta - b.eta;
        } else if (sortField === 'source') {
          comparison = (a.source || '').localeCompare(b.source || '');
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [runes, scales, config, rps, speed, bulk, luck, filter, showUnder1Hour, hideInstant, showSecretsOnly, sortField, sortOrder]);

  const getEtaColor = (eta: number) => {
    if (eta < 1) return 'text-emerald-400';
    if (eta < 60) return 'text-emerald-300';
    if (eta < 3600) return 'text-sky-300';
    if (eta < 86400) return 'text-amber-300';
    return 'text-rose-400';
  };

  const formatEtaDisplay = (eta: number) => {
    if (eta > 604800) { // > 7 days
      return "Don't even try > 7d";
    }
    return formatTimeHuman(eta);
  };

  return (
    <div className="min-h-screen pb-12">
      <header className="py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-indigo-400"
              >
                {config.displayName || 'Rune Calculator'}
              </motion.h1>
              <p className="mt-2 text-slate-400 text-lg">Calculate your luck and discovery rates</p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel p-6 flex items-center gap-6"
            >
              <div className="bg-brand-500/10 p-3 rounded-xl">
                <Zap className="w-8 h-8 text-brand-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Effective RPS</p>
                <p className="text-3xl font-mono font-bold text-white">
                  {formatScaled(baseRps, scales)}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Controls */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="glass-panel p-6 space-y-6 sticky top-8">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Filter className="w-5 h-5 text-brand-400" />
                Configuration
              </h2>

              <div className="space-y-4">
                {config.rpsMode === 'raw' ? (
                  <div className="space-y-1.5">
                    <label htmlFor="rps" className="text-sm font-semibold text-slate-400">{config.labels?.rps || 'RPS'}</label>
                    <div className="relative">
                      <input
                        type="text"
                        id="rps"
                        value={rps}
                        onChange={e => setRps(e.target.value)}
                        className="input-field w-full pl-3 pr-10 py-2"
                        placeholder="0.0"
                      />
                      <Zap className="absolute right-3 top-2.5 w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label htmlFor="speed" className="text-sm font-semibold text-slate-400">
                        {config.labels?.speed || (config.speedInput === 'secondsPerOpen' ? 'Sec / Open' : 'Speed')}
                      </label>
                      <input
                        type="text"
                        id="speed"
                        value={speed}
                        onChange={e => setSpeed(e.target.value)}
                        className="input-field w-full px-3 py-2"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="bulk" className="text-sm font-semibold text-slate-400">{config.labels?.bulk || 'Bulk'}</label>
                      <input
                        type="text"
                        id="bulk"
                        value={bulk}
                        onChange={e => setBulk(e.target.value)}
                        className="input-field w-full px-3 py-2"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="luck" className="text-sm font-semibold text-slate-400">{config.labels?.luck || 'Luck'}</label>
                  <div className="relative">
                    <input
                      type="text"
                      id="luck"
                      value={luck}
                      onChange={e => setLuck(e.target.value)}
                      className="input-field w-full pl-3 pr-10 py-2"
                    />
                    <Sparkles className="absolute right-3 top-2.5 w-4 h-4 text-brand-400" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  Custom Calc
                </h2>
                <div className="space-y-1.5">
                  <label htmlFor="customChance" className="text-sm font-semibold text-slate-400">1 in X (e.g. 25Qd, 1e10)</label>
                  <input
                    type="text"
                    id="customChance"
                    value={customChance}
                    onChange={e => setCustomChance(e.target.value)}
                    className="input-field w-full px-3 py-2"
                    placeholder="Enter value..."
                  />
                </div>
                {customEta !== null && customChanceData !== null && customChanceData.value > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 bg-brand-500/10 rounded-lg border border-brand-500/20"
                  >
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Estimated Time</p>
                    <p className={`font-mono font-bold text-xl ${getEtaColor(customEta)}`}>
                      {formatEtaDisplay(customEta)}
                    </p>
                    {customChanceData.warning && (
                      <p className="text-[10px] text-rose-400 mt-1 italic">{customChanceData.warning}</p>
                    )}
                  </motion.div>
                )}
              </div>

              <div className="pt-6 border-t border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Filters</h3>

                <div className="space-y-3">
                  <label htmlFor="showUnder1Hour" className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        id="showUnder1Hour"
                        checked={showUnder1Hour}
                        onChange={e => setShowUnder1Hour(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="w-10 h-6 bg-slate-700 rounded-full peer peer-checked:bg-brand-600 transition-colors"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
                    </div>
                    <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Under 1 hour</span>
                  </label>

                  <label htmlFor="hideInstant" className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        id="hideInstant"
                        checked={hideInstant}
                        onChange={e => setHideInstant(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="w-10 h-6 bg-slate-700 rounded-full peer peer-checked:bg-brand-600 transition-colors"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
                    </div>
                    <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Hide Instant</span>
                  </label>

                  <label htmlFor="showSecretsOnly" className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        id="showSecretsOnly"
                        checked={showSecretsOnly}
                        onChange={e => setShowSecretsOnly(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="w-10 h-6 bg-slate-700 rounded-full peer peer-checked:bg-brand-600 transition-colors"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
                    </div>
                    <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Secrets only</span>
                  </label>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <section className="lg:col-span-3 space-y-6">
            {/* Toolbar */}
            <div className="glass-panel p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-96">
                <input
                  type="text"
                  placeholder="Search runes or sources..."
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  className="input-field w-full pl-10 pr-4 py-2"
                />
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <span className="text-sm font-medium text-slate-500 whitespace-nowrap">
                  {processedRunes.length} {processedRunes.length === 1 ? 'result' : 'results'}
                </span>

                <div className="h-6 w-px bg-slate-700 mx-1" />

                <div className="flex items-center bg-slate-800 p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>

                <div className="h-6 w-px bg-slate-700 mx-2" />

                <button
                  onClick={() => handleSort('chance')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${sortField === 'chance' ? 'bg-brand-500/10 text-brand-400' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  Chance
                  {sortField === 'chance' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                </button>

                <button
                  onClick={() => handleSort('eta')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${sortField === 'eta' ? 'bg-brand-500/10 text-brand-400' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  ETA
                  {sortField === 'eta' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                </button>
              </div>
            </div>

            {/* Grid/List View */}
            <motion.div
              layout
              className={viewMode === 'grid'
                ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                : "space-y-4"
              }
            >
              <AnimatePresence mode="popLayout">
                {processedRunes.map(rune => (
                  <motion.div
                    key={rune.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ y: -4 }}
                    className={`glass-panel group overflow-hidden ${viewMode === 'list' ? 'flex items-center p-4' : 'flex flex-col'}`}
                  >
                    <div className={viewMode === 'list' ? 'flex-1 grid grid-cols-12 items-center gap-6' : 'p-6 flex-1'}>
                      {/* Name & Source */}
                      <div className={viewMode === 'list' ? 'col-span-4' : 'mb-4'}>
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-white group-hover:text-brand-400 transition-colors">
                            {rune.name}
                          </h3>
                          {rune.tags?.includes('secret') && (
                            <ShieldAlert className="w-4 h-4 text-rose-500" />
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5" />
                          {rune.source || 'Unknown Source'}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className={viewMode === 'list' ? 'col-span-3' : 'grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-slate-800'}>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Chance</p>
                          <p className="font-mono font-medium text-slate-200 whitespace-nowrap">1 in {rune.chance.n}</p>
                        </div>
                        <div className={viewMode === 'list' ? 'hidden' : ''}>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">ETA</p>
                          <p className={`font-mono font-bold ${getEtaColor(rune.eta)}`}>
                            {formatEtaDisplay(rune.eta)}
                          </p>
                        </div>
                      </div>

                      {/* List View ETA */}
                      {viewMode === 'list' && (
                        <div className="col-span-2">
                          <p className={`font-mono font-bold text-lg ${getEtaColor(rune.eta)}`}>
                            {formatEtaDisplay(rune.eta)}
                          </p>
                        </div>
                      )}

                      {/* Tags */}
                      <div className={viewMode === 'list' ? 'col-span-3 flex flex-col gap-1.5 items-end' : 'mt-auto flex flex-wrap gap-2 pt-4'}>
                        {rune.tags?.map(tag => (
                          <span
                            key={tag}
                            className={`
                              ${viewMode === 'list'
                                ? 'px-3 py-1.5 bg-slate-800/40 border-slate-700/30 text-slate-300 w-full max-w-[220px] text-right shadow-sm hover:bg-slate-700/40'
                                : 'px-2 py-1 bg-slate-900/50 border-slate-800 text-slate-400'}
                              rounded-md border text-[10px] font-bold uppercase tracking-wider transition-all cursor-default
                            `}
                          >
                            {tag}
                          </span>
                        ))}
                        {(!rune.tags || rune.tags.length === 0) && viewMode !== 'list' && (
                          <span className="text-xs text-slate-600 italic">Modifiers not added yet</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {processedRunes.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-panel py-20 px-8 text-center"
              >
                <div className="inline-flex items-center justify-center p-4 bg-slate-800 rounded-full mb-6">
                  <Search className="w-12 h-12 text-slate-600" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">No runes found</h3>
                <p className="text-slate-400 max-w-md mx-auto">
                  We couldn't find any runes matching your current search or filters. Try adjusting your criteria.
                </p>
                <button
                  onClick={() => {
                    setFilter('');
                    setShowUnder1Hour(false);
                    setHideInstant(false);
                    setShowSecretsOnly(false);
                  }}
                  className="mt-8 btn-primary"
                >
                  Clear all filters
                </button>
              </motion.div>
            )}
          </section>
        </div>
      </main>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ChangelogDialog />
      </div>
    </div>
  );
}
