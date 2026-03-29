import { Color } from 'three';

/** Ring gradient endpoints — shared by hero petals and glass pollen instances. */
export const HERO_RING_COLOR_PAIRS: [Color, Color][] = [
  [new Color('#7ee8b4'), new Color('#45cd85')],
  [new Color('#45cd85'), new Color('#2db17a')],
  [new Color('#2db17a'), new Color('#40b8d0')],
  [new Color('#40b8d0'), new Color('#60a5fa')],
  [new Color('#60a5fa'), new Color('#4589e6')],
];

export const HERO_RING_COUNT = HERO_RING_COLOR_PAIRS.length;
