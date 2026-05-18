import mammoth from "mammoth";
import MiniSearch from "minisearch";

// Simple worker to handle large file parsing without blocking the main thread
self.onmessage = async (e) => {
  const { arrayBuffer } = e.data;

  try {
    // 1. Extract Text in Worker
    let result: any = await mammoth.extractRawText({ arrayBuffer });
    let text: string | null = result.value;
    result = null; // Free mammoth result object
    
    // 2. Process in Chunks
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    text = null; // Free the massive raw text string
    
    const slides = [];
    let currentNewsId = "Unknown";

    // Limit to last 50,000 items to prevent massive memory usage if file is truly giant
    const MAX_ITEMS = 50000;
    const itemsToProcess = Math.min(lines.length, MAX_ITEMS);

    for (let i = 0; i < itemsToProcess; i++) {
      const line = lines[i];
      const bfMatch = line.match(/^BF\.(\d+)/i);
      if (bfMatch) {
        currentNewsId = `BF.${bfMatch[1]}`;
      } else if (line.length > 5) { // Skip very short noise lines
        slides.push({
          // id will be assigned by IndexedDB (auto-increment)
          newsId: currentNewsId,
          originalText: line,
          slideText: line,
          type: "normal"
        });
      }
      
      if (i % 1000 === 0) {
        self.postMessage({ type: "progress", progress: Math.round((i / itemsToProcess) * 50) });
      }
    }
    
    // Clear lines array early
    lines.length = 0;


    // 3. MiniSearch Indexing in Worker
    // We can't easily transfer the MiniSearch instance back, 
    // so we'll just send the processed slides back in chunks for IndexedDB
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < slides.length; i += CHUNK_SIZE) {
      const chunk = slides.slice(i, i + CHUNK_SIZE);
      self.postMessage({ 
        type: "chunk", 
        chunk, 
        isLast: i + CHUNK_SIZE >= slides.length 
      });
      self.postMessage({ 
        type: "progress", 
        progress: 50 + Math.round((i / slides.length) * 50) 
      });
    }

    self.postMessage({ type: "done" });
  } catch (error) {
    self.postMessage({ type: "error", error: error.message });
  }
};
