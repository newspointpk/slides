/**
 * Gemini Engine Utility
 * Communicates with the backend to generate slides using AI.
 */

export interface HistoricalExample {
  originalText: string;
  slides: string[];
}

export const generateSlidesWithAI = async (text: string, examples: HistoricalExample[]): Promise<string[]> => {
  try {
    const response = await fetch('/api/generate-slides-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, examples }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'AI Generation failed');
    }

    return await response.json();
  } catch (err) {
    console.error("AI Generation failed, falling back to rule-based engine", err);
    throw err;
  }
};
