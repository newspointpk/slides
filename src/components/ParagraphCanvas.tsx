import { useRef, useEffect, useCallback, useState } from "react";
import { type TemplateConfig, getTemplateTextArea } from "@/types/templates";
import { getWordSpacing, fillTextWithWordSpacing, measureTextWithWordSpacing } from "@/lib/canvasText";

const URDU_FONT_FAMILY = "'Jameel Noori Nastaleeq', serif";

interface StyledSpan {
  text: string;
  bold: boolean;
  color: string;
  fontSize: number;
}

interface StyledLine {
  spans: StyledSpan[];
}

interface ParagraphCanvasProps {
  htmlContent: string;
  jsonContent: any;
  fontLoaded: boolean;
  template: TemplateConfig;
  wordSpacing?: number; // 0-50 percentage
  charSpacing?: number; // 0-20 pixels
}
 
 // Parse TipTap JSON content into styled lines
 const parseContent = (json: any): StyledLine[] => {
   if (!json?.content) return [];
 
   const lines: StyledLine[] = [];
 
   json.content.forEach((block: any) => {
     if (block.type === "paragraph") {
       const spans: StyledSpan[] = [];
 
       if (block.content) {
         block.content.forEach((node: any) => {
           if (node.type === "text") {
             const text = node.text || "";
             const marks = node.marks || [];
 
             let bold = false;
             let color = "#ffffff"; // default white for export
             let fontSize = 48; // default size
 
             marks.forEach((mark: any) => {
               if (mark.type === "bold") bold = true;
               if (mark.type === "textStyle") {
                 if (mark.attrs?.color) color = mark.attrs.color;
                 if (mark.attrs?.fontSize) fontSize = parseInt(mark.attrs.fontSize);
               }
             });
 
             spans.push({ text, bold, color, fontSize });
           }
         });
       }
 
       if (spans.length === 0) {
         spans.push({ text: "", bold: false, color: "#ffffff", fontSize: 48 });
       }
 
       lines.push({ spans });
     }
   });
 
   return lines;
 };
 
 // Get display color (for preview, invert white to dark)
 const getDisplayColor = (color: string, forExport: boolean): string => {
   if (forExport) return color;
   // For preview, convert white to dark for visibility
   if (color === "#ffffff" || color === "white" || color === "#fff") {
     return "#1a1a1a";
   }
   return color;
 };
 
const ParagraphCanvas = ({ htmlContent, jsonContent, fontLoaded, template, wordSpacing = 0, charSpacing = 0 }: ParagraphCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
   const [lines, setLines] = useState<StyledLine[]>([]);
 
   const CANVAS_WIDTH = template.canvasWidth;
   const CANVAS_HEIGHT = template.canvasHeight;
 
   // Parse content when JSON changes
   useEffect(() => {
     if (jsonContent) {
       setLines(parseContent(jsonContent));
     }
   }, [jsonContent]);
 
   // Draw canvas
   const drawCanvas = useCallback(
     (forExport = false) => {
       const canvas = forExport ? document.createElement("canvas") : canvasRef.current;
       if (!canvas) return null;
 
       if (forExport) {
         canvas.width = CANVAS_WIDTH;
         canvas.height = CANVAS_HEIGHT;
       }
 
       const ctx = canvas.getContext("2d");
       if (!ctx) return null;
 
       const textArea = getTemplateTextArea(template);
 
       // Clear canvas
       ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
 
       if (!forExport) {
         // Draw light background for preview
         ctx.fillStyle = "#f0f4f8";
         ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
 
         // Draw text area indicator
         ctx.strokeStyle = "#3b82f6";
         ctx.lineWidth = 2;
         ctx.setLineDash([8, 4]);
         ctx.strokeRect(textArea.x, textArea.y, textArea.width, textArea.height);
         ctx.setLineDash([]);
       }
 
       if (!fontLoaded || lines.length === 0) return canvas;
 
       // Calculate line heights and total height
       const lineHeights = lines.map((line) => {
         const maxFontSize = Math.max(...line.spans.map((s) => s.fontSize), 48);
         return maxFontSize * 1.5; // line height multiplier
       });
 
       const totalHeight = lineHeights.reduce((sum, h) => sum + h, 0);
       let currentY = textArea.y + (textArea.height - totalHeight) / 2;
 
        // Calculate word spacing in pixels (percentage of average font size)
        const avgFontSize = lines.reduce((sum, line) => {
          const lineMax = Math.max(...line.spans.map((s) => s.fontSize), 48);
          return sum + lineMax;
        }, 0) / Math.max(lines.length, 1);
        const wordSpacingPx = getWordSpacing(avgFontSize, wordSpacing / 100, "rtl");

        // Apply character spacing if supported
        if (charSpacing > 0 && ctx.letterSpacing !== undefined) {
          ctx.letterSpacing = `${charSpacing}px`;
        }

        // Draw each line
        lines.forEach((line, lineIndex) => {
          const lineHeight = lineHeights[lineIndex];
          const maxFontSize = Math.max(...line.spans.map((s) => s.fontSize), 48);
          const textY = currentY + lineHeight / 2 + maxFontSize * 0.15;

          // Measure total line width with word spacing
          let totalWidth = 0;
          line.spans.forEach((span) => {
            ctx.font = `${span.bold ? "bold " : ""}${span.fontSize}px ${URDU_FONT_FAMILY}`;
            totalWidth += measureTextWithWordSpacing(ctx, span.text, wordSpacingPx);
          });

          // Center horizontally
          const centerX = textArea.x + textArea.width / 2;

          ctx.textBaseline = "middle";

          // For multi-span lines, we need to position each span
          let textX = centerX + totalWidth / 2;

          line.spans.forEach((span) => {
            if (!span.text) return;

            ctx.font = `${span.bold ? "bold " : ""}${span.fontSize}px ${URDU_FONT_FAMILY}`;
            const spanWidth = measureTextWithWordSpacing(ctx, span.text, wordSpacingPx);

            // Shadow
            ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            // Fill text with word spacing
            ctx.fillStyle = getDisplayColor(span.color, forExport);
            fillTextWithWordSpacing(ctx, span.text, textX - spanWidth / 2, textY, wordSpacingPx, "rtl");

            // Faux bold stroke
            if (span.bold) {
              ctx.shadowColor = "transparent";
              ctx.strokeStyle = getDisplayColor(span.color, forExport);
              ctx.lineWidth = span.fontSize * 0.02;
              ctx.lineJoin = "round";
              // Note: strokeTextWithWordSpacing would be needed for perfect bold outline
            }

            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;

            textX -= spanWidth;
          });

          currentY += lineHeight;
        });

        // Reset letter spacing
        if (ctx.letterSpacing !== undefined) {
          ctx.letterSpacing = "0px";
        }
 
       return canvas;
     },
     [lines, fontLoaded, template, CANVAS_WIDTH, CANVAS_HEIGHT, wordSpacing, charSpacing]
   );
 
   // Redraw on changes
   useEffect(() => {
     drawCanvas(false);
   }, [drawCanvas]);
 
   // Download PNG
   const downloadImage = useCallback(() => {
     const canvas = drawCanvas(true);
     if (!canvas) return;
 
     const link = document.createElement("a");
     link.download = "paragraph-slide.png";
     link.href = canvas.toDataURL("image/png", 1.0);
     link.click();
   }, [drawCanvas]);
 
   const hasContent = lines.some((line) => line.spans.some((span) => span.text.trim()));
 
   return (
     <div className="flex flex-col items-center gap-6">
       {/* Canvas Preview */}
       <div className="relative w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-card shadow-lg">
         <div className="aspect-[1920/1080] w-full">
           <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="h-full w-full" />
         </div>
       </div>
 
       {/* Download Button */}
       <button
         onClick={downloadImage}
         disabled={!fontLoaded || !hasContent}
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
 
 export default ParagraphCanvas;