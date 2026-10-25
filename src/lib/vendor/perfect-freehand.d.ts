/** perfect-freehand 1.2.3 (MIT) — faqat ishlatiladigan qismi uchun turlar; manba yonidagi .js da. */
export type StrokeOptions = {
  size?: number;
  thinning?: number;
  smoothing?: number;
  streamline?: number;
  easing?: (pressure: number) => number;
  simulatePressure?: boolean;
  start?: { cap?: boolean; taper?: number | boolean; easing?: (distance: number) => number };
  end?: { cap?: boolean; taper?: number | boolean; easing?: (distance: number) => number };
  last?: boolean;
};
export declare function getStroke(points: number[][], options?: StrokeOptions): [number, number][];
