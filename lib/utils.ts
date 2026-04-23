export const POS_GAP = 65536;

/**
 * Fractional position hesapla.
 * siblings: mevcut sıralı elemanlar (position alanına göre)
 * dropIndex: yeni elemanın gireceği index
 */
export function calcPosition(
  siblings: { position: number }[],
  dropIndex: number
): number {
  if (siblings.length === 0) return POS_GAP;
  if (dropIndex <= 0) return siblings[0].position / 2;
  if (dropIndex >= siblings.length)
    return siblings[siblings.length - 1].position + POS_GAP;

  const before = siblings[dropIndex - 1].position;
  const after = siblings[dropIndex].position;
  return (before + after) / 2;
}

export function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
