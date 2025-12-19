export function buildScaleUtils(scales: Record<string, number>) {
  // Later, this could pre-process scales for efficiency
  return { scales };
}

export function parseScaled(text: string, scales: Record<string, number>): { value: number; warning?: string } {
  const cleanedText = text.trim().toUpperCase();
  if (!cleanedText) {
    return { value: 0 };
  }

  // Prefer the longest non-empty matching suffix to avoid ambiguity (e.g., "QnVt" over "Vt").
  const candidateSuffixes = Object.keys(scales)
    .filter(s => s && cleanedText.endsWith(s.toUpperCase()))
    .sort((a, b) => b.length - a.length);

  const suffix = candidateSuffixes[0];

  if (suffix) {
    const numPart = cleanedText.slice(0, -suffix.length);
    let value = parseFloat(numPart);
    if (isNaN(value)) {
      return { value: 0, warning: "Invalid number" };
    }
    value = value * scales[suffix];
    return { value };
  }

  const value = parseFloat(cleanedText);
  if (isNaN(value)) {
    return { value: 0, warning: "Invalid number" };
  }
  return { value };
}

export function formatScaled(n: number, scales: Record<string, number>): string {
  if (n === 0) return "0";
  if (!isFinite(n)) return "Infinity";

  const absN = Math.abs(n);
  
  // Find the largest scale that is less than or equal to absN
  const candidateSuffixes = Object.entries(scales)
    .filter(([suffix, value]) => suffix && value <= absN)
    .sort((a, b) => b[1] - a[1]);

  if (candidateSuffixes.length > 0) {
    const [suffix, value] = candidateSuffixes[0];
    const scaled = Math.floor(n / value);
    return `${scaled}${suffix}`;
  }

  // If no scale matches (e.g. less than 1000 if that's the smallest scale)
  // or if we want scientific for very large numbers without scales
  if (absN >= 1e21) {
    return n.toExponential(0).replace("+", "");
  }

  return Math.floor(n).toLocaleString();
}

export function formatTimeHuman(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}
