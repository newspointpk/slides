import { useState, useRef, useEffect } from "react";
import { 
  Upload, 
  FileText, 
  Sparkles, 
  History, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  ClipboardList
} from "lucide-react";
import mammoth from "mammoth";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useWorkflowStore } from "@/hooks/useWorkflowStore";
import { CMSEditor } from "./CMSEditor";
import { parseNewsBlocks, smartSplitUrduText, suggestMetadata } from "@/lib/newsroomEngine";
import { 
  addSlidesBatch, 
  finalizeIndexing, 
  clearHistoricalDatabase,
  findSimilarSlides,
  findSimilarBlockPatterns,
  reindexHistoricalData
} from "@/lib/similarityEngine";
import { generateSlidesWithAI } from "@/lib/geminiEngine";


import type { TextStyleOptions } from "./TextStyleControls";

interface NewsroomWorkflowProps {
  textStyle: TextStyleOptions;
}

export const NewsroomWorkflow = ({ textStyle }: NewsroomWorkflowProps) => {
  const { 
    setBlocks, 
    appendBlocks,
    isIndexing, 
    indexingProgress, 
    setIndexingStatus, 
    setLastIndexedAt, 
    lastIndexedAt 
  } = useWorkflowStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-index historical data via local server on mount
  useEffect(() => {
    const autoIndex = async () => {
      if (lastIndexedAt) return;
      
      setIndexingStatus(true, 10);
      try {
        const response = await fetch("/api/index-historical", { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
          setLastIndexedAt(new Date().toISOString());
          setIndexingStatus(false, 100);
        } else {
          throw new Error(data.error);
        }
      } catch (err) {
        console.error("Auto-indexing failed", err);
        setIndexingStatus(false, 0);
      }
    };
    
    autoIndex();
  }, [lastIndexedAt]);



  const processBlocks = async (parsedBlocks: any[]) => {
    const blocksWithSlides = [];
    for (const block of parsedBlocks) {
      const patterns = await findSimilarBlockPatterns(block.originalText);
      
      let slideTexts: string[] = [];
      try {
        const examples = patterns.length > 0 ? [{
          originalText: patterns[0].originalText,
          slides: patterns.map(p => p.slideText)
        }] : [];

        slideTexts = await generateSlidesWithAI(block.originalText, examples);
      } catch (err) {
        console.warn("AI Generation failed, falling back to rule-based splitter", err);
        if (patterns.length > 0) {
          const targetCount = patterns.length;
          const totalChars = block.originalText.length;
          const charPerSlide = Math.ceil(totalChars / targetCount);
          slideTexts = smartSplitUrduText(block.originalText, charPerSlide);
        } else {
          slideTexts = smartSplitUrduText(block.originalText);
        }
      }

      const slides = [];
      for (let index = 0; index < slideTexts.length; index++) {
        const text = slideTexts[index];
        const metadata = suggestMetadata(text, block.id, index, slideTexts.length);
        
        slides.push({
          id: Math.random().toString(36).substr(2, 9),
          text: text, // Use the raw text to avoid overwriting user edits in DocumentView
          templateId: metadata.templateId,
          exportName: metadata.exportName,
          originalIndex: index
        });
      }

      blocksWithSlides.push({
        ...block,
        slides
      });
    }
    return blocksWithSlides;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/parse-news', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse news file');
      }
      
      const parsedBlocks = await response.json();
      if (parsedBlocks.length === 0) {
        alert("No news blocks found in this file. Please check the format.");
        return;
      }

      const blocksWithSlides = await processBlocks(parsedBlocks);
      appendBlocks(blocksWithSlides);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePasteProcess = async () => {
    if (!pastedText.trim()) return;
    
    setIsProcessing(true);
    setIsDialogOpen(false);
    try {
      const parsedBlocks = parseNewsBlocks(pastedText);
      if (parsedBlocks.length === 0) {
        alert("No news blocks found in the pasted text. Ensure blocks start with BF.xxx");
        return;
      }

      const blocksWithSlides = await processBlocks(parsedBlocks);
      appendBlocks(blocksWithSlides);
      setPastedText("");
    } catch (err) {
      console.error("Paste processing failed", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full">
      {/* Historical Status Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 px-6 py-4">
        <div className="flex items-center gap-3">
          <History className="h-5 w-5 text-primary" />
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-primary/70">Local AI Status</span>
            <span className="text-sm font-medium">
              {isIndexing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> 
                  Learning historical news patterns ({indexingProgress}%)
                </span>
              ) : lastIndexedAt ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Historical Knowledge Active
                </span>
              ) : (
                <span className="text-muted-foreground">Indexing historical data...</span>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={isProcessing} className="h-10">
                <ClipboardList className="mr-2 h-4 w-4" />
                Paste News Text
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Paste News Content</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Textarea
                  placeholder="Paste text here (starting with BF.xxx codes)..."
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="min-h-[300px] font-urdu leading-loose text-lg"
                  dir="rtl"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handlePasteProcess} disabled={!pastedText.trim() || isProcessing}>
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Slides
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

           <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="bg-primary hover:bg-primary/90"
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload News DOCX
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Editor Content */}
      <CMSEditor textStyle={textStyle} />
    </div>
  );
};
