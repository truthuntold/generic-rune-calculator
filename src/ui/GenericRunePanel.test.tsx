import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GenericRunePanel } from './GenericRunePanel';

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

const scales = {
  M: 1e6,
};

const runes: RuneRecord[] = [
  { id: '1', name: 'Rune 1', chance: { type: 'oneInN', n: 100 }, source: 'A' },
  { id: '2', name: 'Rune 2', chance: { type: 'oneInN', n: 1000 }, source: 'B' },
  { id: '3', name: 'Secret Rune', chance: { type: 'oneInN', n: 10000 }, source: 'C', tags: ['secret'] },
];

const rawConfig: GameConfig = {
  rpsMode: 'raw',
  displayName: 'Raw Test',
  defaults: { rps: '10' },
};

const derivedConfig: GameConfig = {
  rpsMode: 'derived',
  displayName: 'Derived Test',
  defaults: { speed: '2', bulk: '5' },
};

describe('GenericRunePanel', () => {
  it('renders raw inputs correctly', () => {
    render(<GenericRunePanel runes={runes} scales={scales} config={rawConfig} />);
    expect(screen.getByLabelText('RPS')).toBeInTheDocument();
  });

  it('renders derived inputs correctly', () => {
    render(<GenericRunePanel runes={runes} scales={scales} config={derivedConfig} />);
    expect(screen.getByLabelText('Speed')).toBeInTheDocument();
    expect(screen.getByLabelText('Bulk')).toBeInTheDocument();
  });

  it('calculates ETA correctly', () => {
    render(<GenericRunePanel runes={runes} scales={scales} config={rawConfig} />);
    const rpsInput = screen.getByLabelText('RPS');
    fireEvent.change(rpsInput, { target: { value: '10' } });
    expect(screen.getByText('10s')).toBeInTheDocument(); // 100 / 10
  });

  it('filters runes by name', () => {
    render(<GenericRunePanel runes={runes} scales={scales} config={rawConfig} />);
    const filterInput = screen.getByPlaceholderText('Filter by name');
    fireEvent.change(filterInput, { target: { value: 'Rune 1' } });
    expect(screen.getByText('Rune 1')).toBeInTheDocument();
    expect(screen.queryByText('Rune 2')).not.toBeInTheDocument();
  });

  it('filters secret runes', () => {
    render(<GenericRunePanel runes={runes} scales={scales} config={rawConfig} />);
    const secretsOnlyCheckbox = screen.getByLabelText('Secrets only');
    fireEvent.click(secretsOnlyCheckbox);
    expect(screen.getByText('Secret Rune')).toBeInTheDocument();
    expect(screen.queryByText('Rune 1')).not.toBeInTheDocument();
  });

  it('applies luck correctly', () => {
    render(<GenericRunePanel runes={runes} scales={scales} config={rawConfig} />);
    const luckInput = screen.getByLabelText('Luck');
    fireEvent.change(luckInput, { target: { value: '2' } });
    expect(screen.getByText('5s')).toBeInTheDocument(); // 100 / (10 * 2)
  });

  it('calculates derived RPS correctly', () => {
    render(<GenericRunePanel runes={runes} scales={scales} config={derivedConfig} />);
    const speedInput = screen.getByLabelText('Speed');
    const bulkInput = screen.getByLabelText('Bulk');
    fireEvent.change(speedInput, { target: { value: '3' } });
    fireEvent.change(bulkInput, { target: { value: '5' } });
    expect(screen.getByText('7s')).toBeInTheDocument(); // 100 / (3 * 5)
  });

  it('matches snapshot', () => {
    const { asFragment } = render(<GenericRunePanel runes={runes} scales={scales} config={rawConfig} />);
    expect(asFragment()).toMatchSnapshot();
  });
});
