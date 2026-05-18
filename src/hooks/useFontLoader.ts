import { useState, useEffect } from "react";

/**
 * Hook to detect when Jameel Noori Nastaleeq Kasheeda font is loaded
 */
const useFontLoader = () => {
  const [fontLoaded, setFontLoaded] = useState(false);

  useEffect(() => {
    const checkFont = async () => {
      try {
        // Check if Font Loading API is available
        if ("fonts" in document) {
          await document.fonts.load("bold 48px 'Jameel Noori Nastaleeq'");
          await document.fonts.ready;
          setFontLoaded(true);
        } else {
          // Fallback for older browsers
          setTimeout(() => setFontLoaded(true), 1500);
        }
      } catch (error) {
        console.error("Font loading error:", error);
        // Still set as loaded to not block the UI
        setFontLoaded(true);
      }
    };

    checkFont();
  }, []);

  return fontLoaded;
};

export default useFontLoader;
