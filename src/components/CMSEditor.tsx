import { useState, useRef, useMemo } from "react";
import { 
  Download, 
  Plus, 
  Trash2, 
  Save, 
  FileText, 
  Loader2,
  Sparkles,
  ArrowRight,
  ImageIcon,
  Check,
  FileDown
} from "lucide-react";
import JSZip from "jszip";
import { toast } from "sonner";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useWorkflowStore, type NewsSlide } from "@/hooks/useWorkflowStore";
import { SlideCard } from "./SlideCard";
import { DocumentView } from "./DocumentView";
import { generatePNG } from "@/lib/canvasExport";
import { exportSlidesToDocx } from "@/lib/docxExport";
import { TEMPLATES } from "@/types/templates";
import type { TextStyleOptions } from "./TextStyleControls";
import { suggestMetadata } from "@/lib/newsroomEngine";
import { format } from "date-fns";

interface CMSEditorProps {
  textStyle: TextStyleOptions;
}

export const CMSEditor = ({ textStyle }: CMSEditorProps) => {
  const { 
    blocks, 
    updateSlide, 
    deleteSlide, 
    addSlide, 
    clearAll, 
    lastSaved, 
    isSaving, 
    setSaving,
    triggerSave 
  } = useWorkflowStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isDocxExporting, setIsDocxExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'cards' | 'document'>('document');

  // Handle Ctrl+S for manual save feedback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleManualSave = () => {
    setSaving(true);
    triggerSave();
    toast.success("All changes saved to local storage", {
      description: "Auto-save is active, but manual save confirmed.",
      duration: 2000,
    });
    setTimeout(() => setSaving(false), 1000);
  };

  const handleDocxExport = async () => {
    if (totalSlides === 0) return;
    setIsDocxExporting(true);
    try {
      await exportSlidesToDocx(blocks);
      toast.success("Word document generated successfully");
    } catch (err) {
      console.error("Docx export failed", err);
      toast.error("Failed to generate Word document");
    } finally {
      setIsDocxExporting(false);
    }
  };

  const totalSlides = useMemo(() => 
    blocks.reduce((sum, block) => sum + block.slides.length, 0), 
    [blocks]
  );


  const handleExportAll = async () => {
    if (totalSlides === 0) return;
    setIsExporting(true);
    setExportProgress(0);

    try {
      const zip = new JSZip();
      let processed = 0;

      for (const block of blocks) {
        for (const slide of block.slides) {
          const template = TEMPLATES[slide.templateId] || TEMPLATES.default;
          const blob = await generatePNG({ text: slide.text, templateId: slide.templateId }, textStyle, template);
          zip.file(slide.exportName, blob);
          processed++;
          setExportProgress(Math.round((processed / totalSlides) * 100));
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Newsroom_Export_${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleSplitSlide = (blockId: string, slideId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const slide = block.slides.find(s => s.id === slideId);
    if (!slide) return;

    // Split text into two halves by word
    const words = slide.text.split(" ");
    const mid = Math.floor(words.length / 2);
    const text1 = words.slice(0, mid).join(" ");
    const text2 = words.slice(mid).join(" ");

    updateSlide(blockId, slideId, { text: text1 });
    
    const newSlide: NewsSlide = {
      id: Math.random().toString(36).substr(2, 9),
      text: text2,
      templateId: slide.templateId,
      exportName: "", // Will be recalculated or updated manually
      originalIndex: slide.originalIndex + 0.5
    };
    
    // Recalculate export names for the block after split
    // Simple approach: re-trigger metadata suggestion for all slides in block
    addSlide(blockId, newSlide, slideId);
  };

  const handleMergeSlide = (blockId: string, slideId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const index = block.slides.findIndex(s => s.id === slideId);
    if (index <= 0) return;

    const currentSlide = block.slides[index];
    const prevSlide = block.slides[index - 1];

    updateSlide(blockId, prevSlide.id, { text: prevSlide.text + " " + currentSlide.text });
    deleteSlide(blockId, slideId);
  };

  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
        <Sparkles className="mb-4 h-12 w-12 text-primary" />
        <h3 className="text-xl font-medium">Ready for Automation</h3>
        <p className="max-w-xs text-sm">Upload a DOCX file to start the smart newsroom workflow.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-20">
      {/* CMS Toolbar */}
      <div className="sticky top-4 z-10 flex items-center justify-between rounded-2xl border border-border bg-background/80 p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Production Queue</span>
            <span className="text-lg font-bold">{totalSlides} Slides in {blocks.length} Blocks</span>
          </div>
          {lastSaved && (
            <div className="hidden border-l border-border pl-4 md:flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Saved {format(new Date(lastSaved), 'HH:mm:ss')}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="mr-4 flex items-center gap-1 rounded-lg bg-muted p-1">
            <Button 
              variant={viewMode === 'document' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('document')}
              className="h-8 px-3 text-xs font-bold"
            >
              <FileText className="mr-2 h-3.5 w-3.5" /> Word View
            </Button>
            <Button 
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('cards')}
              className="h-8 px-3 text-xs font-bold"
            >
              <ImageIcon className="mr-2 h-3.5 w-3.5" /> Card View
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={handleDocxExport} disabled={isDocxExporting} className="h-10">
            {isDocxExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Download Word
          </Button>

          <Button variant="outline" size="sm" onClick={handleManualSave} className="h-10 border-primary/20 hover:bg-primary/5">
            <Save className="mr-2 h-4 w-4 text-primary" /> Save
          </Button>

          <Button variant="outline" size="sm" onClick={clearAll} className="h-10 text-destructive hover:bg-destructive/5">
            <Trash2 className="mr-2 h-4 w-4" /> Clear All
          </Button>

          <Button 
            onClick={handleExportAll} 
            disabled={isExporting}
            className="h-10 bg-primary px-6 shadow-md hover:shadow-lg transition-all"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting {exportProgress}%
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Export PNGs
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Blocks and Slides */}
      {viewMode === 'document' ? (
        <DocumentView 
          blocks={blocks}
          updateSlide={updateSlide}
          deleteSlide={deleteSlide}
          onSplit={handleSplitSlide}
          onMerge={handleMergeSlide}
          onAdd={(blockId) => {
            const newSlide: NewsSlide = {
              id: Math.random().toString(36).substr(2, 9),
              text: "نئی سطر",
              templateId: "default",
              exportName: `${blockId}.New.png`,
              originalIndex: blocks.find(b => b.id === blockId)?.slides.length || 0
            };
            addSlide(blockId, newSlide);
          }}
        />
      ) : (
        <div className="flex flex-col gap-12">
          {blocks.map((block) => (
            <section key={block.id} className="flex flex-col gap-4">
              <div className="flex items-center gap-3 px-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {block.id.split('.')[1]}
                </div>
                <h2 className="text-lg font-bold tracking-tight">News Block {block.id}</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {block.slides.map((slide, index) => (
                  <SlideCard
                    key={slide.id}
                    slide={slide}
                    blockId={block.id}
                    textStyle={textStyle}
                    onUpdate={(updates) => updateSlide(block.id, slide.id, updates)}
                    onDelete={() => deleteSlide(block.id, slide.id)}
                    onSplit={() => handleSplitSlide(block.id, slide.id)}
                    onMerge={() => handleMergeSlide(block.id, slide.id)}
                  />
                ))}
                
                {/* Add Slide Placeholder */}
                <button 
                  onClick={() => {
                    const newSlide: NewsSlide = {
                      id: Math.random().toString(36).substr(2, 9),
                      text: "نئی سلائیڈ",
                      templateId: "default",
                      exportName: `${block.id}.New.png`,
                      originalIndex: block.slides.length
                    };
                    addSlide(block.id, newSlide);
                  }}
                  className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/5 transition-colors hover:border-primary/40 hover:bg-muted/10"
                >
                  <Plus className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Add Slide</span>
                </button>
              </div>
            </section>
          ))}
        </div>
      )}

    </div>
  );
};
