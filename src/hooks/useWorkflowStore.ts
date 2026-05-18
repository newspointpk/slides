import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface NewsSlide {
  id: string;
  text: string;
  templateId: string;
  exportName: string;
  originalIndex: number;
}

export interface NewsBlock {
  id: string; // BF code
  originalText: string;
  slides: NewsSlide[];
}

export interface ClassicState {
  urduText: string;
  selectedTemplateId: string;
  textStyle: any;
  richTextHtml: string;
  richTextJson: any;
  paragraphWordSpacing: number;
  paragraphCharSpacing: number;
}

interface WorkflowState {
  blocks: NewsBlock[];
  isIndexing: boolean;
  indexingProgress: number;
  lastIndexedAt: string | null;
  lastSaved: string | null;
  isSaving: boolean;
  classicState: ClassicState;
  
  setBlocks: (blocks: NewsBlock[]) => void;
  appendBlocks: (blocks: NewsBlock[]) => void;
  updateSlide: (blockId: string, slideId: string, updates: Partial<NewsSlide>) => void;
  deleteSlide: (blockId: string, slideId: string) => void;
  addSlide: (blockId: string, slide: NewsSlide, afterSlideId?: string) => void;
  reorderSlides: (blockId: string, slides: NewsSlide[]) => void;
  setIndexingStatus: (isIndexing: boolean, progress: number) => void;
  setLastIndexedAt: (date: string) => void;
  setClassicState: (updates: Partial<ClassicState>) => void;
  setSaving: (isSaving: boolean) => void;
  triggerSave: () => void;
  clearAll: () => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
      blocks: [],
      isIndexing: false,
      indexingProgress: 0,
      lastIndexedAt: null,
      lastSaved: null,
      isSaving: false,
      classicState: {
        urduText: "",
        selectedTemplateId: "default",
        textStyle: null,
        richTextHtml: "",
        richTextJson: null,
        paragraphWordSpacing: 0,
        paragraphCharSpacing: 0,
      },

      setBlocks: (blocks) => set({ blocks, lastSaved: new Date().toISOString() }),
      
      appendBlocks: (newBlocks) => set((state) => ({ 
        blocks: [...state.blocks, ...newBlocks],
        lastSaved: new Date().toISOString() 
      })),
      
      updateSlide: (blockId, slideId, updates) => 
        set((state) => ({
          lastSaved: new Date().toISOString(),
          blocks: state.blocks.map((block) => 
            block.id === blockId 
              ? { 
                  ...block, 
                  slides: block.slides.map((s) => s.id === slideId ? { ...s, ...updates } : s) 
                } 
              : block
          )
        })),

      deleteSlide: (blockId, slideId) =>
        set((state) => ({
          lastSaved: new Date().toISOString(),
          blocks: state.blocks.map((block) =>
            block.id === blockId
              ? { ...block, slides: block.slides.filter((s) => s.id !== slideId) }
              : block
          )
        })),

      addSlide: (blockId, slide, afterSlideId) =>
        set((state) => ({
          lastSaved: new Date().toISOString(),
          blocks: state.blocks.map((block) => {
            if (block.id !== blockId) return block;
            const newSlides = [...block.slides];
            const index = afterSlideId 
              ? newSlides.findIndex((s) => s.id === afterSlideId) + 1 
              : newSlides.length;
            newSlides.splice(index, 0, slide);
            return { ...block, slides: newSlides };
          })
        })),

      reorderSlides: (blockId, slides) =>
        set((state) => ({
          lastSaved: new Date().toISOString(),
          blocks: state.blocks.map((block) =>
            block.id === blockId ? { ...block, slides } : block
          )
        })),

      setIndexingStatus: (isIndexing, progress) => set({ isIndexing, indexingProgress: progress }),
      setLastIndexedAt: (lastIndexedAt) => set({ lastIndexedAt }),
      
      setClassicState: (updates) => 
        set((state) => ({ 
          lastSaved: new Date().toISOString(),
          classicState: { ...state.classicState, ...updates } 
        })),

      setSaving: (isSaving) => set({ isSaving }),
      triggerSave: () => set({ lastSaved: new Date().toISOString() }),
      
      clearAll: () => set({ blocks: [], lastSaved: new Date().toISOString() }),
    }),
    {
      name: "newsroom-workflow-storage",
    }
  )
);

