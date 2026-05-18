import { db, type HistoricalSlide } from "./db";

/**
 * Finds similar historical slides for a given text.
 */
export const findSimilarSlides = async (text: string, limit: number = 5) => {
  const results = await fetch(`/api/search?q=${encodeURIComponent(text)}&limit=${limit}`);
  if (!results.ok) return [];
  return await results.json();
};

/**
 * Finds the most similar historical News Block and returns all its slides.
 * This is the "Pattern Learning" part of the local AI.
 */
export const findSimilarBlockPatterns = async (text: string): Promise<HistoricalSlide[]> => {
  try {
    // Search for the most similar slide first
    const similar = await findSimilarSlides(text, 3);
    if (similar.length === 0) return [];

    // Take the best match's newsId
    const bestMatch = similar[0];
    if (!bestMatch.newsId || bestMatch.newsId === 'Unknown') return [];

    // Fetch all slides belonging to this specific news block
    const response = await fetch(`/api/search-by-block?newsId=${encodeURIComponent(bestMatch.newsId)}`);
    if (!response.ok) return [];
    return await response.json();
  } catch (err) {
    console.error("Pattern search failed", err);
    return [];
  }
};


/**
 * Re-indexing is now handled by the server.
 */
export const reindexHistoricalData = async () => {
  // No-op in browser, handled by server/index-historical
};

export const addSlidesBatch = async (slides: any[]) => {};
export const finalizeIndexing = async () => {};
export const clearHistoricalDatabase = async () => {};
