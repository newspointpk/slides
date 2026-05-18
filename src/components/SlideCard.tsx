import { useEffect, useRef, useState } from "react";
import { 
  GripVertical, 
  Trash2, 
  Split, 
  Merge, 
  Edit3, 
  Check, 
  X,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { TEMPLATES } from "@/types/templates";
import { generatePNG } from "@/lib/canvasExport";
import type { NewsSlide } from "@/hooks/useWorkflowStore";
import type { TextStyleOptions } from "@/components/TextStyleControls";

interface SlideCardProps {
  slide: NewsSlide;
  blockId: string;
  onUpdate: (updates: Partial<NewsSlide>) => void;
  onDelete: () => void;
  onSplit: () => void;
  onMerge: () => void;
  textStyle: TextStyleOptions;
}

export const SlideCard = ({
  slide,
  blockId,
  onUpdate,
  onDelete,
  onSplit,
  onMerge,
  textStyle
}: SlideCardProps) => {
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(slide.text);

  useEffect(() => {
    const updatePreview = async () => {
      setIsPreviewLoading(true);
      try {
        const template = TEMPLATES[slide.templateId] || TEMPLATES.default;
        const blob = await generatePNG({ text: slide.text, templateId: slide.templateId }, textStyle, template);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } catch (err) {
        console.error("Preview failed", err);
      } finally {
        setIsPreviewLoading(false);
      }
    };

    const timer = setTimeout(updatePreview, 300);
    return () => {
      clearTimeout(timer);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [slide.text, slide.templateId, textStyle]);

  const handleSaveText = () => {
    onUpdate({ text: editText });
    setIsEditing(false);
  };

  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 cursor-grab items-center justify-center rounded bg-muted text-muted-foreground active:cursor-grabbing">
            <GripVertical className="h-4 w-4" />
          </div>
          <span className="font-mono text-[10px] font-bold text-primary/70 uppercase">
            {slide.exportName.split('.').slice(0, -1).join('.')}
          </span>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onSplit} title="Split Slide">
            <Split className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted/30 border border-border/50">
        {previewUrl ? (
          <img 
            src={previewUrl} 
            alt="Preview" 
            className={`h-full w-full object-contain transition-opacity duration-300 ${isPreviewLoading ? 'opacity-50' : 'opacity-100'}`} 
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {/* Text Area */}
      <div className="flex flex-col gap-2">
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              dir="rtl"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => { setEditText(slide.text); setIsEditing(false); }}>
                <X className="mr-1 h-3 w-3" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSaveText}>
                <Check className="mr-1 h-3 w-3" /> Save
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="cursor-text rounded-md border border-transparent px-2 py-1 text-right text-sm hover:border-border hover:bg-accent/30"
            dir="rtl"
            onClick={() => setIsEditing(true)}
            style={{ fontFamily: "'Jameel Noori Nastaleeq', serif" }}
          >
            {slide.text}
          </div>
        )}
      </div>

      {/* Metadata / Actions */}
      <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
        <Select 
          value={slide.templateId} 
          onValueChange={(val) => onUpdate({ templateId: val })}
        >
          <SelectTrigger className="h-7 w-[130px] text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TEMPLATES).map(([key, t]) => (
              <SelectItem key={key} value={key} className="text-[11px]">
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
           <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMerge} title="Merge with previous">
            <Merge className="h-3.5 w-3.5 rotate-180" />
          </Button>
        </div>
      </div>
    </div>
  );
};
