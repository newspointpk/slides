import type { TextStyleOptions } from "@/components/TextStyleControls";
import {
  type TemplateConfig,
  getTemplateTextArea,
  TEMPLATES,
} from "@/types/templates";
import {
  fillTextWithWordSpacing,
  strokeTextWithWordSpacing,
  measureTextWithWordSpacing,
  detectTextDirection,
  getWordSpacing,
} from "@/lib/canvasText";

const URDU_FONT_FAMILY = "'Jameel Noori Nastaleeq', serif";
const LINE_HEIGHT_RATIO = 1;

export const getFontFamily = (template: TemplateConfig): string => {
  return template.fontFamily ? `'${template.fontFamily}', sans-serif` : URDU_FONT_FAMILY;
};

export interface SlideData {
  text: string;
  templateId: string;
  exportName: string;
}

/**
 * Generate a single PNG for a text line
 */
export const generatePNG = async (
  line: { text: string; templateId: string },
  textStyle: TextStyleOptions,
  baseTemplate: TemplateConfig
): Promise<Blob> => {
  return new Promise((resolve) => {
    const lineTemplate = TEMPLATES[line.templateId] ?? baseTemplate;
    const currentTextArea = getTemplateTextArea(lineTemplate);
    const wordSpacingEm = 0; // Fixed at 0 to preserve Urdu ligatures

    const canvas = document.createElement("canvas");
    canvas.width = lineTemplate.canvasWidth;
    canvas.height = lineTemplate.canvasHeight;
    const ctx = canvas.getContext("2d")!;

    // Process lines (for multiLine templates)
    const textLines = lineTemplate.multiLine
      ? line.text.split("\n").filter((l) => l.trim())
      : [line.text];
    const lineCount = textLines.length || 1;
    const lineSpacing = lineTemplate.lineSpacing ?? 0;

    // Calculate font size
    const maxFont =
      lineTemplate.maxFontSize ?? currentTextArea.height / (lineCount * LINE_HEIGHT_RATIO);
    let fontSize = maxFont;
    const minFontSize = 16;
    const fontFamily = getFontFamily(lineTemplate);

    ctx.font = `${fontSize}px ${fontFamily}`;
    while (fontSize > minFontSize) {
      ctx.font = `${fontSize}px ${fontFamily}`;
      let allFit = true;
      for (const l of textLines) {
        const lineDirection = detectTextDirection(l);
        const wordSpacing = getWordSpacing(fontSize, wordSpacingEm, lineDirection);
        const width = measureTextWithWordSpacing(ctx, l, wordSpacing);
        if (width > currentTextArea.width) {
          allFit = false;
          break;
        }
      }
      const totalHeight = fontSize * lineCount * LINE_HEIGHT_RATIO + lineSpacing * (lineCount - 1);
      if (allFit && totalHeight <= currentTextArea.height) break;
      fontSize -= 2;
    }

    // Set text properties
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = `${textStyle.letterSpacing}px`;

    // Calculate vertical centering (include line spacing)
    const totalTextHeight = fontSize * lineCount * LINE_HEIGHT_RATIO + lineSpacing * (lineCount - 1);
    const startY =
      currentTextArea.y + (currentTextArea.height - totalTextHeight) / 2 + fontSize / 2;

    // Helper functions
    const getTextColor = () =>
      textStyle.textColor === "white" ? "#ffffff" : "#000000";

    const getShadowColor = () => {
      const alpha = textStyle.shadowStrength / 100;
      return textStyle.textColor === "white"
        ? `rgba(0, 0, 0, ${alpha})`
        : `rgba(255, 255, 255, ${alpha * 0.5})`;
    };

    const getOutlineColor = () =>
      textStyle.textColor === "white" ? "#000000" : "#ffffff";

    const getFauxBoldWidth = () => {
      if (textStyle.fontWeight === "extrabold") return fontSize * 0.03;
      return fontSize * 0.02;
    };

    // Draw each line
    textLines.forEach((l, index) => {
      const textDirection = detectTextDirection(l);
      const wordSpacing = getWordSpacing(fontSize, wordSpacingEm, textDirection);
      const textX = currentTextArea.x + currentTextArea.width / 2;
      const textY = startY + index * (fontSize * LINE_HEIGHT_RATIO + lineSpacing) + fontSize * 0.15;

      ctx.direction = textDirection;

      // Draw outline (if enabled)
      if (textStyle.outlineEnabled) {
        ctx.strokeStyle = getOutlineColor();
        ctx.lineWidth = textStyle.outlineWidth;
        ctx.lineJoin = "round";
        strokeTextWithWordSpacing(ctx, l, textX, textY, wordSpacing, textDirection);
      }

      // Add shadow
      ctx.shadowColor = getShadowColor();
      ctx.shadowBlur = 4 + (textStyle.shadowStrength / 100) * 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Fill text
      ctx.fillStyle = getTextColor();
      fillTextWithWordSpacing(ctx, l, textX, textY, wordSpacing, textDirection);

      // Faux bold stroke
      const fauxBoldWidth = getFauxBoldWidth();
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.strokeStyle = getTextColor();
      ctx.lineWidth = fauxBoldWidth;
      ctx.lineJoin = "round";
      strokeTextWithWordSpacing(ctx, l, textX, textY, wordSpacing, textDirection);
    });

    canvas.toBlob((blob) => resolve(blob!), "image/png", 1.0);
  });
};
