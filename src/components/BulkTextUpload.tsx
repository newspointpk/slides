import { useState, useRef } from "react";
import { Upload, FileText, X, Download, Loader2, Clipboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import JSZip from "jszip";
import mammoth from "mammoth";
import {
  detectTextDirection,
} from "@/lib/canvasText";
import { generatePNG, getFontFamily } from "@/lib/canvasExport";
import type { TextStyleOptions } from "./TextStyleControls";
import {
  type TemplateConfig,
  getTemplateTextArea,
  TEMPLATES,
} from "@/types/templates";
import {
  isReportLine,
  isPersonName,
  transliterateUrdu,
  sanitizeFilename,
  URDU_LOCATION_MAP,
} from "@/lib/transliterate";

const URDU_FONT_FAMILY = "'Jameel Noori Nastaleeq', serif";
const LINE_HEIGHT_RATIO = 1;

const getTranslatedFileName = (line: BulkLine, index: number): string => {
  if (line.templateId === "addressBar") {
    const text = line.text;
    const matches: string[] = [];
    Object.keys(URDU_LOCATION_MAP).forEach(urduKey => {
      if (text.includes(urduKey)) {
        matches.push(URDU_LOCATION_MAP[urduKey]);
      }
    });

    if (matches.length > 0) {
      const bestMatch = matches.find(m => m !== "Pakistan") || matches[0];
      return `${bestMatch}_${index + 1}.png`;
    }
    return `Address_${index + 1}.png`;
  }
  return `slide_${String(index + 1).padStart(3, "0")}.png`;
};



interface BulkLine {
  text: string;
  templateId: string;
  templateName: string;
  isAutoDetected: boolean;
  newsCode?: string;
  exportSuffix?: string;
  exportName?: string;
}

interface BulkTextUploadProps {
  fontLoaded: boolean;
  textStyle: TextStyleOptions;
  template: TemplateConfig;
}

const normalizeLineText = (text: string) =>
  text
    .trim()
    .replace(/[^ - \p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const getLineTemplateId = (text: string) => {
  const trimmed = text.trim();

  if (/پاکستان[\s\p{P}]*$/u.test(trimmed)) {
    return "addressBar";
  }

  if (isReportLine(trimmed)) {
    return "reporterName";
  }

  if (isPersonName(trimmed)) {
    return "nameBand";
  }

  return "default";
};

const processTextToLines = (text: string, autoDetect: boolean): BulkLine[] => {
  const rawLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const processedLines: BulkLine[] = [];
  let currentNewsCode = "News";
  let alphabeticalIndex = 0;
  
  // Track suffix counts per block to avoid duplicates
  const suffixCounts: Record<string, number> = {};

  for (const line of rawLines) {
    const bfMatch = line.match(/^BF\.(\d+)/i);
    if (bfMatch) {
      currentNewsCode = `BF.${bfMatch[1]}`;
      alphabeticalIndex = 0;
      // Reset suffix counts for new block
      Object.keys(suffixCounts).forEach(key => delete suffixCounts[key]);
      
      if (line.length <= 10 && !line.includes(" ")) {
        continue;
      }
    }

    const templateId = autoDetect ? getLineTemplateId(line) : "default";
    let exportSuffix = "";
    let useNewsPrefix = true;

    if (autoDetect) {
      if (templateId === "addressBar") {
        const matches: string[] = [];
        Object.keys(URDU_LOCATION_MAP).forEach(urduKey => {
          if (line.includes(urduKey)) {
            matches.push(URDU_LOCATION_MAP[urduKey]);
          }
        });
        exportSuffix = matches.find(m => m !== "Pakistan") || matches[0] || "Address";
        // For addresses, we'll keep useNewsPrefix=false as per existing style,
        // but we'll add index to avoid overwriting
        useNewsPrefix = false;
      } else if (isReportLine(line)) {
        exportSuffix = "Report";
      } else if (isPersonName(line)) {
        exportSuffix = transliterateUrdu(line);
      } else {
        exportSuffix = String.fromCharCode(65 + alphabeticalIndex);
        alphabeticalIndex++;
      }
    } else {
      exportSuffix = String.fromCharCode(65 + alphabeticalIndex);
      alphabeticalIndex++;
    }

    // Ensure uniqueness within the block or global
    const sanitizedSuffix = sanitizeFilename(exportSuffix);
    const key = useNewsPrefix ? `${currentNewsCode}.${sanitizedSuffix}` : sanitizedSuffix;
    suffixCounts[key] = (suffixCounts[key] || 0) + 1;
    
    const uniqueSuffix = suffixCounts[key] > 1 
      ? `${sanitizedSuffix}_${suffixCounts[key]}` 
      : sanitizedSuffix;

    const exportName = useNewsPrefix 
      ? `${currentNewsCode}.${uniqueSuffix}.png`
      : `${uniqueSuffix}.png`;

    processedLines.push({
      text: line,
      templateId,
      templateName: TEMPLATES[templateId]?.name ?? TEMPLATES.default.name,
      isAutoDetected: autoDetect,
      newsCode: currentNewsCode,
      exportSuffix: uniqueSuffix,
      exportName
    });
  }

  return processedLines;
};

const BulkTextUpload = ({ fontLoaded, textStyle, template }: BulkTextUploadProps) => {
  const [lines, setLines] = useState<BulkLine[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true);
  const [pastedText, setPastedText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePasteProcess = () => {
    if (!pastedText.trim()) return;
    const processedLines = processTextToLines(pastedText, autoDetectEnabled);
    setLines(processedLines);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".docx")) {
      // Parse DOCX file
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const processedLines = processTextToLines(result.value, autoDetectEnabled);
      setLines(processedLines);
    } else {
      // Parse TXT file
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const processedLines = processTextToLines(text, autoDetectEnabled);
        setLines(processedLines);
      };
      reader.readAsText(file, "UTF-8");
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineTemplate = (index: number, templateId: string) => {
    setLines((prev) =>
      prev.map((line, i) =>
        i === index
          ? {
              ...line,
              templateId,
              templateName: TEMPLATES[templateId]?.name ?? TEMPLATES.default.name,
            }
          : line
      )
    );
  };

  const clearAll = () => {
    setLines([]);
  };



  /**
   * Generate all PNGs and download as ZIP
   */
  const generateAllPNGs = async () => {
    if (!fontLoaded || lines.length === 0) return;

    setIsGenerating(true);
    setProgress(0);

    try {
      const zip = new JSZip();

      for (let i = 0; i < lines.length; i++) {
        const blob = await generatePNG(lines[i], textStyle, template);
        const fileName = lines[i].exportName || getTranslatedFileName(lines[i], i);
        zip.file(fileName, blob);
        setProgress(Math.round(((i + 1) / lines.length) * 100));
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${template.name.replace(/\s+/g, "_")}_slides.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PNGs:", error);
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  return (
    <div className="w-full max-w-xl rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-center text-sm font-medium text-muted-foreground">
        Bulk Text Import
      </h3>

      {/* Auto Detect Toggle */}
      <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div className="space-y-0.5">
          <Label htmlFor="auto-detect" className="text-sm font-medium">
            Auto Detect Templates
          </Label>
          <p className="text-xs text-muted-foreground">
            Automatically assign templates based on line content
          </p>
        </div>
        <Switch
          id="auto-detect"
          checked={autoDetectEnabled}
          onCheckedChange={setAutoDetectEnabled}
        />
      </div>

      {/* Input Methods */}
      <Tabs defaultValue="upload" className="mb-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-3.5 w-3.5" /> File Upload
          </TabsTrigger>
          <TabsTrigger value="paste" className="flex items-center gap-2">
            <Clipboard className="h-3.5 w-3.5" /> Paste Text
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="mt-4">
          <label
            htmlFor="text-file-upload"
            className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-4 transition-colors hover:border-primary/50 hover:bg-accent/50"
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Upload .txt or .docx file
            </span>
            <span className="text-xs text-muted-foreground/60">
              Each line/paragraph becomes a separate slide
            </span>
          </label>
          <input
            ref={fileInputRef}
            id="text-file-upload"
            type="file"
            accept=".txt,text/plain,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileUpload}
            className="hidden"
          />
        </TabsContent>
        
        <TabsContent value="paste" className="mt-4 space-y-3">
          <Textarea
            placeholder="Paste your text here. Each line will become a separate slide..."
            className="min-h-[150px] font-urdu text-lg leading-loose"
            dir="rtl"
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
          />
          <Button 
            variant="secondary" 
            className="w-full" 
            disabled={!pastedText.trim()}
            onClick={handlePasteProcess}
          >
            Load Text
          </Button>
        </TabsContent>
      </Tabs>


      {/* Lines List */}
      {lines.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">
              {lines.length} line{lines.length > 1 ? "s" : ""} loaded
            </span>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear All
            </Button>
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
            {lines.map((line, index) => {
              const isEnglish = !!template.fontFamily && detectTextDirection(line.text) === "ltr";
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div
                      className="truncate text-sm"
                      dir={isEnglish ? "ltr" : "rtl"}
                      style={{ fontFamily: isEnglish ? "'Arial', sans-serif" : "'Jameel Noori Nastaleeq', serif" }}
                    >
                      {line.text}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground/80">
                      {!autoDetectEnabled ? (
                        <Select value={line.templateId} onValueChange={(val) => updateLineTemplate(index, val)}>
                          <SelectTrigger className="h-6 w-32 text-xs py-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                              <SelectItem key={key} value={key}>
                                {tmpl.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span>{line.templateName}</span>
                      )}
                      {line.exportName && (
                        <span className="rounded bg-primary/10 px-1 font-mono text-[10px] text-primary">
                          {line.exportName}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeLine(index)}
                    className="shrink-0 rounded p-1 hover:bg-destructive/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Generate Button */}
      {lines.length > 0 && (
        <Button
          onClick={generateAllPNGs}
          disabled={!fontLoaded || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating... {progress}%
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download All as ZIP ({lines.length} slides)
            </>
          )}
        </Button>
      )}
    </div>
  );
};

export default BulkTextUpload;
