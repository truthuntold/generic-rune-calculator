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

export function formatScaled(n: number): string {
  return n.toLocaleString();
}

export function formatTimeHuman(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}
