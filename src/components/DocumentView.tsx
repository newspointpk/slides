import { 
  Plus, 
  Trash2, 
  Merge, 
  Scissors, 
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Type
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { type NewsSlide, type NewsBlock, useWorkflowStore } from "@/hooks/useWorkflowStore";
import { TEMPLATES } from "@/types/templates";
import RichTextEditor from "./RichTextEditor";
import { suggestMetadata } from "@/lib/newsroomEngine";

interface DocumentViewProps {
  blocks: NewsBlock[];
  updateSlide: (blockId: string, slideId: string, updates: Partial<NewsSlide>) => void;
  deleteSlide: (blockId: string, slideId: string) => void;
  onSplit: (blockId: string, slideId: string) => void;
  onMerge: (blockId: string, slideId: string) => void;
  onAdd: (blockId: string) => void;
}

export const DocumentView = ({ 
  blocks, 
  updateSlide, 
  deleteSlide, 
  onSplit, 
  onMerge,
  onAdd 
}: DocumentViewProps) => {
  const { setBlocks } = useWorkflowStore();

  const handleBlockUpdate = (blockId: string, html: string) => {
    // Convert HTML paragraphs back into slides
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const paragraphs = Array.from(doc.querySelectorAll('p, div, h1, h2, h3'))
      .map(p => p.textContent?.trim())
      .filter(t => t && t.length > 0);

    if (paragraphs.length === 0) return;

    // Update the store for this specific block
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    const newSlides = paragraphs.map((text, index) => {
      const existingSlide = block.slides[index];
      const metadata = suggestMetadata(text || "", blockId, index, paragraphs.length);
      
      return {
        id: existingSlide?.id || Math.random().toString(36).substr(2, 9),
        text: text || "", // Preserve exactly what the user typed
        templateId: metadata.templateId,
        exportName: metadata.exportName,
        originalIndex: index
      };
    });

    // Update state
    setBlocks(blocks.map(b => b.id === blockId ? { ...b, slides: newSlides } : b));
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 py-12">
      {blocks.map((block) => (
        <div key={block.id} className="relative overflow-hidden rounded-3xl border border-border bg-white shadow-2xl transition-all dark:bg-slate-900">
          {/* Paper Texture Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" />

          {/* News Block Header (MS Word Style) */}
          <div className="relative z-10 flex items-center justify-between border-b border-border bg-slate-50/80 px-8 py-3 dark:bg-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-lg shadow-primary/20">
                <Type className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">News Block</span>
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">{block.id}</h2>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {block.slides.filter(s => s.templateId !== 'addressBar' && s.templateId !== 'reporterName').length} Slides
                {block.slides.some(s => s.templateId === 'addressBar' || s.templateId === 'reporterName') && (
                  <span className="ml-1 text-primary/60">
                    (+{block.slides.filter(s => s.templateId === 'addressBar' || s.templateId === 'reporterName').length} Address/Reporter)
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Unified Editor for the Block */}
          <div className="relative z-10 p-4">
            <RichTextEditor
              content={block.slides.map(s => `<p>${s.text}</p>`).join('')}
              onContentChange={(html) => handleBlockUpdate(block.id, html)}
              className="!min-h-[300px] !border-none !bg-transparent !p-4 !shadow-none font-urdu leading-loose"
            />
          </div>

          {/* Footer Actions */}
          <div className="relative z-10 border-t border-border/50 bg-slate-50/30 px-8 py-3 dark:bg-slate-800/30">
             <p className="text-[10px] italic text-slate-400">
              Each paragraph above will be exported as a separate slide. Press Enter to create a new slide.
             </p>
          </div>
        </div>
      ))}
    </div>
  );
};


