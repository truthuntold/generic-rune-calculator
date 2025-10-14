import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GenericRunePanel } from './GenericRunePanel';
import { GameConfig, RuneRecord } from '../types';

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

  it('matches snapshot', () => {
    const { asFragment } = render(<GenericRunePanel runes={runes} scales={scales} config={rawConfig} />);
    expect(asFragment()).toMatchSnapshot();
  });
});
