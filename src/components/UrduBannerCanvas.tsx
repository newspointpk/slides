import { useRef, useEffect, useCallback, useState } from "react";
import {
  fillTextWithWordSpacing,
  strokeTextWithWordSpacing,
  measureTextWithWordSpacing,
  detectTextDirection,
  getWordSpacing,
} from "../lib/canvasText";
import type { TextStyleOptions } from "./TextStyleControls";
import { type TemplateConfig, getTemplateTextArea } from "@/types/templates";

// Font settings
const URDU_FONT_FAMILY = "'Jameel Noori Nastaleeq', serif";
const LINE_HEIGHT_RATIO = 1; // Line height multiplier for multi-line

const getFontFamily = (template: TemplateConfig): string => {
  return template.fontFamily ? `'${template.fontFamily}', sans-serif` : URDU_FONT_FAMILY;
};

interface UrduBannerCanvasProps {
  text: string;
  fontLoaded: boolean;
  textStyle: TextStyleOptions;
  template: TemplateConfig;
}

const UrduBannerCanvas = ({ text, fontLoaded, textStyle, template }: UrduBannerCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [computedFontSize, setComputedFontSize] = useState(54);

  const CANVAS_WIDTH = template.canvasWidth;
  const CANVAS_HEIGHT = template.canvasHeight;

  /**
   * Get stroke width for faux bold effect (Nastaleeq font has no weight variants)
   */
  const getFauxBoldWidth = (fontSize: number) => {
    if (textStyle.fontWeight === "extrabold") {
      return fontSize * 0.03; // Thicker stroke for extrabold
    }
    return fontSize * 0.02; // Thinner stroke for bold
  };

  /**
   * Get colors based on textStyle
   */
  const getTextColor = (forExport: boolean) => {
    if (forExport) {
      return textStyle.textColor === "white" ? "#ffffff" : "#000000";
    }
    // For preview, invert for visibility on light bg
    return textStyle.textColor === "white" ? "#1a1a1a" : "#1a1a1a";
  };

  const getShadowColor = (forExport: boolean) => {
    const alpha = textStyle.shadowStrength / 100;
    if (textStyle.textColor === "white") {
      return `rgba(0, 0, 0, ${alpha})`;
    }
    return `rgba(255, 255, 255, ${alpha * 0.5})`;
  };

  const getOutlineColor = () => {
    return textStyle.textColor === "white" ? "#000000" : "#ffffff";
  };

  /**
   * Draw the canvas with text area visualization (for preview only)
   */
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get fresh text area values from template
    const currentTextArea = getTemplateTextArea(template);

    // Word spacing fixed at 0 (no extra spacing to preserve Urdu ligatures)
    const wordSpacingEm = 0;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw light background for preview
    ctx.fillStyle = "#f0f4f8";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw text area indicator (dashed rectangle)
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(currentTextArea.x, currentTextArea.y, currentTextArea.width, currentTextArea.height);
    ctx.setLineDash([]);

    // Draw text if exists
    if (text.trim() && fontLoaded) {
      const lines = template.multiLine ? text.split("\n").filter((l) => l.trim()) : [text];
      const lineCount = lines.length || 1;
      const lineSpacing = template.lineSpacing ?? 0;

      // Calculate font size with fresh template values
      const maxFont = template.maxFontSize ?? currentTextArea.height / (lineCount * LINE_HEIGHT_RATIO);
      let fontSize = maxFont;
      const minFontSize = 16;
      const fontFamily = getFontFamily(template);

      ctx.font = `${fontSize}px ${fontFamily}`;
      while (fontSize > minFontSize) {
        ctx.font = `${fontSize}px ${fontFamily}`;
        // Check if all lines fit
        let allFit = true;
        for (const line of lines) {
          const lineDirection = detectTextDirection(line);
          const wordSpacing = getWordSpacing(fontSize, wordSpacingEm, lineDirection);
          const width = measureTextWithWordSpacing(ctx, line, wordSpacing);
          if (width > currentTextArea.width) {
            allFit = false;
            break;
          }
        }
        // Also check total height fits (include line spacing between lines)
        const totalHeight = fontSize * lineCount * LINE_HEIGHT_RATIO + lineSpacing * (lineCount - 1);
        if (allFit && totalHeight <= currentTextArea.height) {
          break;
        }
        fontSize -= 2;
      }

      setComputedFontSize(fontSize);

      // Set text properties
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.letterSpacing = `${textStyle.letterSpacing}px`;

      // Calculate vertical centering for all lines (include line spacing)
      const totalTextHeight = fontSize * lineCount * LINE_HEIGHT_RATIO + lineSpacing * (lineCount - 1);
      const startY = currentTextArea.y + (currentTextArea.height - totalTextHeight) / 2 + fontSize / 2;

      // Draw each line
      lines.forEach((line, index) => {
        const textDirection = detectTextDirection(line);
        const wordSpacing = getWordSpacing(fontSize, wordSpacingEm, textDirection);
        const textX = currentTextArea.x + currentTextArea.width / 2;
      // Adjust vertical offset: Nastaleeq font needs upward shift to account for descenders
      const isNastaleeq = !template.fontFamily;
      const verticalOffset = isNastaleeq ? fontSize * 0.12 : fontSize * 0.15;
      const textY = startY + index * (fontSize * LINE_HEIGHT_RATIO + lineSpacing) + verticalOffset;

        ctx.direction = textDirection;

        // Draw outline first (if enabled)
        if (textStyle.outlineEnabled) {
          ctx.strokeStyle = getOutlineColor();
          ctx.lineWidth = textStyle.outlineWidth;
          ctx.lineJoin = "round";
          strokeTextWithWordSpacing(ctx, line, textX, textY, wordSpacing, textDirection);
        }

        // Add text shadow
        const shadowAlpha = textStyle.shadowStrength / 100;
        ctx.shadowColor = `rgba(0, 0, 0, ${shadowAlpha * 0.5})`;
        ctx.shadowBlur = 3 + shadowAlpha * 3;
        ctx.shadowOffsetX = 1 + shadowAlpha;
        ctx.shadowOffsetY = 1 + shadowAlpha;

        // Fill text
        ctx.fillStyle = getTextColor(false);
        fillTextWithWordSpacing(ctx, line, textX, textY, wordSpacing, textDirection);

        // Apply faux bold via stroke
        const fauxBoldWidth = getFauxBoldWidth(fontSize);
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.strokeStyle = getTextColor(false);
        ctx.lineWidth = fauxBoldWidth;
        ctx.lineJoin = "round";
        strokeTextWithWordSpacing(ctx, line, textX, textY, wordSpacing, textDirection);

        // Reset shadow
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      });
    }
  }, [text, fontLoaded, textStyle, template, CANVAS_WIDTH, CANVAS_HEIGHT]);

  // Redraw on text or font change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  /**
   * Download full 1920x1080 PNG with transparent background and text positioned exactly as preview
   */
  const downloadImage = useCallback(() => {
    if (!text.trim() || !fontLoaded) return;

    // Get fresh text area values from template
    const currentTextArea = getTemplateTextArea(template);

    // Word spacing fixed at 0 (no extra spacing to preserve Urdu ligatures)
    const wordSpacingEm = 0;

    // Create full-size canvas for download
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = CANVAS_WIDTH;
    tempCanvas.height = CANVAS_HEIGHT;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    const lines = template.multiLine ? text.split("\n").filter((l) => l.trim()) : [text];
    const lineCount = lines.length || 1;
    const lineSpacing = template.lineSpacing ?? 0;

    // Calculate font size with fresh template values
    const maxFont = template.maxFontSize ?? currentTextArea.height / (lineCount * LINE_HEIGHT_RATIO);
    let fontSize = maxFont;
    const minFontSize = 16;
    const fontFamily = getFontFamily(template);

    tempCtx.font = `${fontSize}px ${fontFamily}`;
    while (fontSize > minFontSize) {
      tempCtx.font = `${fontSize}px ${fontFamily}`;
      // Check if all lines fit
      let allFit = true;
      for (const line of lines) {
        const lineDirection = detectTextDirection(line);
        const wordSpacing = getWordSpacing(fontSize, wordSpacingEm, lineDirection);
        const width = measureTextWithWordSpacing(tempCtx, line, wordSpacing);
        if (width > currentTextArea.width) {
          allFit = false;
          break;
        }
      }
      // Also check total height fits (include line spacing between lines)
      const totalHeight = fontSize * lineCount * LINE_HEIGHT_RATIO + lineSpacing * (lineCount - 1);
      if (allFit && totalHeight <= currentTextArea.height) {
        break;
      }
      fontSize -= 2;
    }

    // Keep transparent background (don't fill anything)

    // Set text properties - same as preview
    tempCtx.font = `${fontSize}px ${fontFamily}`;
    tempCtx.textAlign = "center";
    tempCtx.textBaseline = "middle";
    tempCtx.letterSpacing = `${textStyle.letterSpacing}px`;

    // Calculate vertical centering for all lines (include line spacing)
    const totalTextHeight = fontSize * lineCount * LINE_HEIGHT_RATIO + lineSpacing * (lineCount - 1);
    const startY = currentTextArea.y + (currentTextArea.height - totalTextHeight) / 2 + fontSize / 2;

    // Draw each line
    lines.forEach((line, index) => {
      const textDirection = detectTextDirection(line);
      const wordSpacing = getWordSpacing(fontSize, wordSpacingEm, textDirection);
      const textX = currentTextArea.x + currentTextArea.width / 2;
      // Adjust vertical offset: Nastaleeq font needs upward shift to account for descenders
      const isNastaleeq = !template.fontFamily;
      const verticalOffset = isNastaleeq ? fontSize * 0.12 : fontSize * 0.15;
      const textY = startY + index * (fontSize * LINE_HEIGHT_RATIO + lineSpacing) + verticalOffset;

      tempCtx.direction = textDirection;

      // Draw outline first (if enabled)
      if (textStyle.outlineEnabled) {
        tempCtx.strokeStyle = getOutlineColor();
        tempCtx.lineWidth = textStyle.outlineWidth;
        tempCtx.lineJoin = "round";
        strokeTextWithWordSpacing(tempCtx, line, textX, textY, wordSpacing, textDirection);
      }

      // Add text shadow
      tempCtx.shadowColor = getShadowColor(true);
      tempCtx.shadowBlur = 4 + (textStyle.shadowStrength / 100) * 4;
      tempCtx.shadowOffsetX = 2;
      tempCtx.shadowOffsetY = 2;

      // Fill text with user-selected color
      tempCtx.fillStyle = getTextColor(true);
      fillTextWithWordSpacing(tempCtx, line, textX, textY, wordSpacing, textDirection);

      // Apply faux bold via stroke
      const fauxBoldWidth = getFauxBoldWidth(fontSize);
      tempCtx.shadowColor = "transparent";
      tempCtx.shadowBlur = 0;
      tempCtx.strokeStyle = getTextColor(true);
      tempCtx.lineWidth = fauxBoldWidth;
      tempCtx.lineJoin = "round";
      strokeTextWithWordSpacing(tempCtx, line, textX, textY, wordSpacing, textDirection);
    });

    // Use text as filename for specific templates
    const useTextAsFilename = ["dateBand", "addressBar", "addressBarEnglish", "nameBand", "reporterName"].includes(template.id);
    const safeFilename = useTextAsFilename
      ? text.trim().replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, "").replace(/\s+/g, "_").substring(0, 50) || "slide"
      : "urdu-text";

    // Download
    const link = document.createElement("a");
    link.download = `${safeFilename}.png`;
    link.href = tempCanvas.toDataURL("image/png", 1.0);
    link.click();
  }, [text, fontLoaded, textStyle, template, CANVAS_WIDTH, CANVAS_HEIGHT]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Canvas Preview Container */}
      <div className="relative w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-card shadow-lg">
        <div className="aspect-[1920/1080] w-full">
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="h-full w-full" />
        </div>

        {/* Font size indicator */}
        {text.trim() && (
          <div className="absolute bottom-2 left-2 rounded-md bg-foreground/80 px-2 py-1 text-xs text-card">
            font: {computedFontSize}px
          </div>
        )}
      </div>

      {/* Download Button */}
      <button
        onClick={downloadImage}
        disabled={!fontLoaded || !text.trim()}
        className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-lg font-medium text-primary-foreground shadow-md transition-all hover:bg-accent hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
        Download PNG Slide
      </button>
    </div>
  );
};

export default UrduBannerCanvas;
