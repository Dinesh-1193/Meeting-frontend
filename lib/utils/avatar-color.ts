// A fixed palette in the spirit of Google Meet/Material avatar colors —
// picked deterministically per identity so the same person always gets the same color.
const PALETTE = [
  "#1a73e8", // blue
  "#d93025", // red
  "#f9ab00", // amber
  "#188038", // green
  "#a142f4", // purple
  "#12b5cb", // teal
  "#e8710a", // orange
  "#3949ab", // indigo
  "#d01884", // pink
  "#00897b", // deep teal
];

export function avatarColorForIdentity(identity: string): string {
  let hash = 0;
  for (let i = 0; i < identity.length; i++) {
    hash = (hash << 5) - hash + identity.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
