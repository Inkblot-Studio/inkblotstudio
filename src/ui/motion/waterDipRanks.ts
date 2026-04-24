/**
 * Stagger key per character for “water dip”: last letter of each word leads (rank 0
 * within the word, then the letter to its left, etc.), then the next word. Spaces get
 * a key between neighboring letters so the wave still reads in order. Lines stack
 * sequentially in time.
 */
export function buildWaterDipRanks(lines: string[]): { line: number; ch: string; key: string; rank: number }[] {
  const parts: { line: number; ch: string; key: string; rank: number }[] = [];
  let i = 0;
  let lineOffset = 0;

  for (let li = 0; li < lines.length; li++) {
    const s = lines[li]!;
    const localRanks = wordAwareRanksForLine(s);
    for (let c = 0; c < s.length; c++) {
      const ch = s[c]!;
      const rank = lineOffset + localRanks[c]!;
      parts.push({ line: li, ch, key: `wd-${i++}-${c}-${ch}`, rank });
    }
    const maxR = localRanks.length ? Math.max(...localRanks) : 0;
    lineOffset += maxR + 1;
  }
  return parts;
}

function wordAwareRanksForLine(s: string): number[] {
  const n = s.length;
  if (n === 0) return [];
  const ranks: number[] = new Array(n);

  const wordMatches: { start: number; end: number }[] = [];
  const re = /[^\s]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) != null) {
    wordMatches.push({ start: m.index, end: m.index + m[0]!.length });
  }

  if (wordMatches.length === 0) {
    return Array.from({ length: n }, (_, i) => i * 0.01);
  }

  let base = 0;
  for (const w of wordMatches) {
    const len = w.end - w.start;
    for (let c = 0; c < len; c++) {
      const i = w.start + c;
      ranks[i] = base + (len - 1 - c);
    }
    base += len;
  }

  for (let i = 0; i < n; i++) {
    if (s[i] !== ' ') continue;
    const leftR = i > 0 && s[i - 1] !== ' ' ? ranks[i - 1]! : -0.1;
    let j = i + 1;
    while (j < n && s[j] === ' ') j++;
    const rightR = j < n && s[j] !== ' ' ? ranks[j]! : leftR + 0.2;
    let spaceRank = (leftR + rightR) / 2;
    if (spaceRank <= leftR) spaceRank = leftR + 0.05;
    if (j < n && spaceRank >= rightR) spaceRank = (leftR + rightR) / 2;
    ranks[i] = spaceRank;
  }

  return ranks;
}

export function maxWaterDipRank(segments: { rank: number }[]): number {
  if (segments.length === 0) return 0;
  return Math.max(...segments.map((s) => s.rank));
}
