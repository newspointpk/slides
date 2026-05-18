/**
 * Helpers for canvas text layout where we want extra spacing without breaking
 * Arabic/Urdu shaping. We increase spacing *between words* (split by whitespace)
 * rather than between characters.
 */

/**
 * Detect if text is primarily Arabic/Urdu script (RTL) or Latin/Roman (LTR)
 * Returns "rtl" if more than 30% of characters are Arabic/Urdu
 */
export function detectTextDirection(text: string): "rtl" | "ltr" {
  const arabicUrduPattern = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g;
  const matches = text.match(arabicUrduPattern) || [];
  const alphaChars = text.replace(/[\s\d\-\/\.\,\:\(\)]/g, "").length;
  if (alphaChars === 0) return "ltr"; // Pure numbers/symbols → LTR
  return matches.length / alphaChars > 0.3 ? "rtl" : "ltr";
}

export function measureTextWithWordSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  wordSpacing: number
): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  const words = trimmed.split(/\s+/);
  if (words.length <= 1) return ctx.measureText(trimmed).width;

  let width = 0;
  for (let i = 0; i < words.length; i++) {
    width += ctx.measureText(words[i]).width;
    if (i < words.length - 1) width += wordSpacing;
  }
  return width;
}

/**
 * Get word spacing - 4px for LTR (English), dynamic for RTL (Urdu)
 */
export function getWordSpacing(fontSize: number, wordSpacingEm: number, direction: "rtl" | "ltr"): number {
  if (direction === "ltr") {
    return 4; // Fixed 4px for English
  }
  return Math.round(fontSize * wordSpacingEm);
}

export function fillTextWithWordSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  wordSpacing: number,
  direction: "rtl" | "ltr" = "rtl"
) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const words = trimmed.split(/\s+/);
  if (words.length <= 1) {
    ctx.fillText(trimmed, centerX, y);
    return;
  }

  const prevAlign = ctx.textAlign;
  const prevDirection = ctx.direction;

  const widths = words.map((w) => ctx.measureText(w).width);
  const totalWidth =
    widths.reduce((sum, w) => sum + w, 0) + wordSpacing * (words.length - 1);

  if (direction === "rtl") {
    ctx.direction = "rtl";
    ctx.textAlign = "right";

    // First word in logical string order is the right-most word visually.
    let x = centerX + totalWidth / 2;
    for (let i = 0; i < words.length; i++) {
      ctx.fillText(words[i], x, y);
      x -= widths[i] + wordSpacing;
    }
  } else {
    ctx.direction = "ltr";
    ctx.textAlign = "left";

    let x = centerX - totalWidth / 2;
    for (let i = 0; i < words.length; i++) {
      ctx.fillText(words[i], x, y);
      x += widths[i] + wordSpacing;
    }
  }

  ctx.textAlign = prevAlign;
  ctx.direction = prevDirection;
}

export function strokeTextWithWordSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  wordSpacing: number,
  direction: "rtl" | "ltr" = "rtl"
) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const words = trimmed.split(/\s+/);
  if (words.length <= 1) {
    ctx.strokeText(trimmed, centerX, y);
    return;
  }

  const prevAlign = ctx.textAlign;
  const prevDirection = ctx.direction;

  const widths = words.map((w) => ctx.measureText(w).width);
  const totalWidth =
    widths.reduce((sum, w) => sum + w, 0) + wordSpacing * (words.length - 1);

  if (direction === "rtl") {
    ctx.direction = "rtl";
    ctx.textAlign = "right";

    let x = centerX + totalWidth / 2;
    for (let i = 0; i < words.length; i++) {
      ctx.strokeText(words[i], x, y);
      x -= widths[i] + wordSpacing;
    }
  } else {
    ctx.direction = "ltr";
    ctx.textAlign = "left";

    let x = centerX - totalWidth / 2;
    for (let i = 0; i < words.length; i++) {
      ctx.strokeText(words[i], x, y);
      x += widths[i] + wordSpacing;
    }
  }

  ctx.textAlign = prevAlign;
  ctx.direction = prevDirection;
}
