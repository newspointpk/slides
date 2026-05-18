// Some environments don't yet include `letterSpacing` on CanvasRenderingContext2D.
// We don't rely on it for layout (we use word-spacing helpers), but this keeps
// TS from failing if any previous code attempts to set it.

export {};

declare global {
  interface CanvasRenderingContext2D {
    letterSpacing?: string;
  }
}
