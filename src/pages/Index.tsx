import { useState, useEffect } from "react";
import { toast } from "sonner";
import UrduBannerCanvas from "@/components/UrduBannerCanvas";
import UrduTextInput from "@/components/UrduTextInput";
import TextStyleControls, { TextStyleOptions } from "@/components/TextStyleControls";
import TemplateSelector from "@/components/TemplateSelector";
import BulkTextUpload from "@/components/BulkTextUpload";
import RichTextEditor from "@/components/RichTextEditor";
import ParagraphCanvas from "@/components/ParagraphCanvas";
import useFontLoader from "@/hooks/useFontLoader";
import { NewsroomWorkflow } from "@/components/NewsroomWorkflow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TEMPLATES } from "@/types/templates";
import { Sparkles, Image as ImageIcon, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";

import { useWorkflowStore } from "@/hooks/useWorkflowStore";

const getDefaultTextStyle = (templateId: string): TextStyleOptions => {
  const template = TEMPLATES[templateId];
  return {
    textColor: template?.defaultStyle?.textColor ?? "black",
    fontWeight: template?.defaultStyle?.fontWeight ?? "extrabold",
    shadowStrength: 25, // Fixed at 25% for all templates
    outlineEnabled: template?.defaultStyle?.outlineEnabled ?? false,
    outlineWidth: 2,
    letterSpacing: 0,
  };
};

const Index = () => {
  const { classicState, setClassicState, lastSaved, isSaving, triggerSave, setSaving } = useWorkflowStore();
  const {
    urduText,
    selectedTemplateId,
    textStyle,
    richTextHtml,
    richTextJson,
    paragraphWordSpacing,
    paragraphCharSpacing
  } = classicState;
  
  const fontLoaded = useFontLoader();

  // Handle Ctrl+S for manual save feedback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        setSaving(true);
        triggerSave();
        toast.success("Changes saved", { duration: 2000 });
        setTimeout(() => setSaving(false), 1000);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize textStyle if it's missing (first run)
  useEffect(() => {
    if (!textStyle) {
      setClassicState({ textStyle: getDefaultTextStyle("default") });
    }
  }, []);

  const currentTemplate = TEMPLATES[selectedTemplateId];
  const isParagraphTemplate = selectedTemplateId === "paragraphText";

  // Update style defaults when template changes
  const handleTemplateChange = (templateId: string) => {
    setClassicState({ 
      selectedTemplateId: templateId,
      textStyle: getDefaultTextStyle(templateId)
    });
  };

  const handleRichTextChange = (html: string, json: any) => {
    setClassicState({
      richTextHtml: html,
      richTextJson: json
    });
  };

  const setTextStyle = (options: TextStyleOptions) => {
    setClassicState({ textStyle: options });
  };


  return (
    <div className="min-h-screen bg-background px-4 py-8 md:py-12">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-10 text-center">
          <h1
            className="mb-1 text-4xl font-normal text-foreground md:text-5xl"
            dir="rtl"
            style={{ fontFamily: "'Jameel Noori Nastaleeq Kasheeda', serif" }}
          >
            Urdu Slides Maker
          </h1>
          {lastSaved && (
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
               {isSaving ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              ) : (
                <Check className="h-2.5 w-2.5 text-green-500" />
              )}
              Auto-saved {format(new Date(lastSaved), 'HH:mm:ss')}
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="flex flex-col items-center gap-10">
          <Tabs defaultValue="smart" className="w-full">
            <TabsList className="mx-auto mb-8 grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="smart" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Smart Newsroom
              </TabsTrigger>
              <TabsTrigger value="classic" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Classic Creator
              </TabsTrigger>
            </TabsList>

            <TabsContent value="smart" className="w-full">
               <NewsroomWorkflow textStyle={textStyle} />
            </TabsContent>

            <TabsContent value="classic" className="flex flex-col items-center gap-10">
              {/* Template Selector & Style Controls - Side by Side */}
              <div className="flex w-full max-w-3xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-center">
                <TemplateSelector
                  selectedTemplate={selectedTemplateId}
                  onSelect={handleTemplateChange}
                />
                {isParagraphTemplate ? (
                  <div className="w-full max-w-md sm:w-auto sm:min-w-[280px]">
                    <details className="group">
                      <summary className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-accent">
                        <span className="text-sm font-medium text-foreground">Text Style</span>
                        <svg
                          className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="mt-2 space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
                        {/* Word Spacing */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm text-muted-foreground">Word Spacing</label>
                            <span className="text-xs text-muted-foreground">{paragraphWordSpacing}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={50}
                            step={2}
                            value={paragraphWordSpacing}
                            onChange={(e) => setClassicState({ paragraphWordSpacing: Number(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                        {/* Character Spacing */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm text-muted-foreground">Character Spacing</label>
                            <span className="text-xs text-muted-foreground">{paragraphCharSpacing}px</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={20}
                            step={1}
                            value={paragraphCharSpacing}
                            onChange={(e) => setClassicState({ paragraphCharSpacing: Number(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </details>
                  </div>
                ) : (
                  <TextStyleControls options={textStyle} onChange={setTextStyle} />
                )}
              </div>

              {/* Text Input - Conditional based on template */}
              {isParagraphTemplate ? (
                <RichTextEditor onContentChange={handleRichTextChange} content={""} />
              ) : (
                <UrduTextInput
                  value={urduText}
                  onChange={(val) => setClassicState({ urduText: val })}
                  multiLine={currentTemplate.multiLine}
                  useEnglishFont={!!currentTemplate.fontFamily}
                />
              )}

              {/* Canvas Preview - Conditional based on template */}
              {isParagraphTemplate ? (
                <ParagraphCanvas
                  htmlContent={richTextHtml}
                  jsonContent={richTextJson}
                  fontLoaded={fontLoaded}
                  template={currentTemplate}
                  wordSpacing={paragraphWordSpacing}
                  charSpacing={paragraphCharSpacing}
                />
              ) : (
                <UrduBannerCanvas
                  text={urduText}
                  fontLoaded={fontLoaded}
                  textStyle={textStyle}
                  template={currentTemplate}
                />
              )}

              {/* Bulk Text Upload - Only for non-paragraph templates */}
              {!isParagraphTemplate && (
                <BulkTextUpload
                  fontLoaded={fontLoaded}
                  textStyle={textStyle}
                  template={currentTemplate}
                />
              )}
            </TabsContent>
          </Tabs>
        </main>

        {/* Footer */}
        <footer className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            Font: Jameel Noori Nastaleeq 
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
