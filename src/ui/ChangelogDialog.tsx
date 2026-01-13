import { useEffect, useMemo, useState } from 'react';
import { APP_VERSION } from '../app/version';
import { CHANGELOG, type ChangelogEntry } from '../app/changelog';

const STORAGE_KEY_LAST_SEEN = 'grc:v1:lastSeenVersion';

function safeGetLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function computeRecentEntries(all: ChangelogEntry[], lastSeenVersion: string | null) {
  if (!lastSeenVersion) return [];
  const idx = all.findIndex(e => e.version === lastSeenVersion);
  if (idx <= 0) return [];
  return all.slice(0, idx);
}

export function ChangelogDialog() {
  const storage = safeGetLocalStorage();
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(() => storage?.getItem(STORAGE_KEY_LAST_SEEN) ?? null);

  const recentEntries = useMemo(() => computeRecentEntries(CHANGELOG, lastSeen), [lastSeen]);

  const contentEntries = useMemo(() => {
    // If we have lastSeen and can compute the delta, show only the delta.
    if (recentEntries.length > 0) return recentEntries;
    // Otherwise show the latest few entries as a friendly baseline.
    return CHANGELOG.slice(0, 5);
  }, [recentEntries]);

  useEffect(() => {
    // First visit: store current version, don't show dialog automatically.
    if (!storage) return;
    if (!lastSeen) {
      storage.setItem(STORAGE_KEY_LAST_SEEN, APP_VERSION);
      setLastSeen(APP_VERSION);
      return;
    }

    // Only auto-open when version changed.
    if (lastSeen !== APP_VERSION) {
      setOpen(true);
    }
  }, [storage, lastSeen]);

  const acknowledge = () => {
    if (storage) storage.setItem(STORAGE_KEY_LAST_SEEN, APP_VERSION);
    setLastSeen(APP_VERSION);
    setOpen(false);
  };

  return (
    <>
      {/* Always present footer affordance */}
      <footer className="mt-12 pt-6 border-t border-slate-800 text-center text-sm text-slate-500">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hover:text-slate-300 underline underline-offset-4"
        >
          Changelog (v{APP_VERSION})
        </button>
      </footer>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close changelog"
            className="absolute inset-0 bg-black/70"
            onClick={acknowledge}
          />

          <div className="relative w-full max-w-2xl glass-panel p-6 md:p-8 max-h-[80vh] overflow-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">What’s new</h2>
                <p className="text-slate-400 mt-1">
                  You’re on <span className="font-mono text-slate-200">v{APP_VERSION}</span>.
                </p>
              </div>
              <button type="button" onClick={acknowledge} className="btn-primary whitespace-nowrap">
                Got it
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {contentEntries.map(entry => (
                <section key={entry.version} className="border border-slate-800/80 rounded-xl p-4 bg-slate-900/30">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-bold text-white">
                      v{entry.version}
                    </h3>
                    {entry.date && <span className="text-xs text-slate-500">{entry.date}</span>}
                  </div>
                  <ul className="mt-3 space-y-2 text-slate-300">
                    {entry.changes.map((c, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-brand-400 mt-0.5">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

