import mammoth from "mammoth";
import { 
  isReportLine, 
  isPersonName, 
  transliterateUrdu, 
  sanitizeFilename,
  URDU_LOCATION_MAP 
} from "@/lib/transliterate";

export interface ParsedBlock {
  id: string;
  originalText: string;
}

/**
 * Parses DOCX content into news blocks based on BF codes.
 */
export const parseNewsBlocks = (text: string): ParsedBlock[] => {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const blocks: ParsedBlock[] = [];
  let currentBlock: ParsedBlock | null = null;

  for (const line of lines) {
    const bfMatch = line.match(/^BF\.(\d+)/i);
    if (bfMatch) {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = {
        id: `BF.${bfMatch[1]}`,
        originalText: line
      };
    } else if (currentBlock) {
      currentBlock.originalText += "\n" + line;
    }
  }
  if (currentBlock) blocks.push(currentBlock);
  return blocks;
};

/**
 * Smartly splits Urdu text into slides based on character limits and newsroom rules.
 * Enforces a minimum of 2 and maximum of 7 slides per block.
 */
export const smartSplitUrduText = (text: string, maxChars: number = 75): string[] => {
  const MIN_SLIDES = 2;
  const MAX_SLIDES = 7;
  
  // Remove the BF code from the beginning if present
  const cleanText = text.replace(/^BF\.\d+\s*/i, "").trim();
  
  // Split by common Urdu punctuation or line breaks
  const sentences = cleanText.split(/[\u06D4\u061F!؟\n]/).map(s => s.trim()).filter(s => s.length > 0);
  let slides: string[] = [];
  let currentSlide = "";

  for (const sentence of sentences) {
    if ((currentSlide + " " + sentence).length <= maxChars) {
      currentSlide = currentSlide ? currentSlide + " " + sentence : sentence;
    } else {
      if (currentSlide) slides.push(currentSlide);
      
      // If a single sentence is too long, split it by words/commas
      if (sentence.length > maxChars) {
        const parts = sentence.split(/[\u060C\s]+/).filter(p => p.length > 0);
        let subSlide = "";
        for (const part of parts) {
          if ((subSlide + " " + part).length <= maxChars) {
            subSlide = subSlide ? subSlide + " " + part : part;
          } else {
            if (subSlide) slides.push(subSlide);
            subSlide = part;
          }
        }
        currentSlide = subSlide;
      } else {
        currentSlide = sentence;
      }
    }
  }
  if (currentSlide) slides.push(currentSlide);

  // --- Enforce Min/Max Constraints ---
  
  // If too many slides (>7), merge shortest ones
  while (slides.length > MAX_SLIDES) {
    let minLen = Infinity;
    let minIdx = -1;
    for (let i = 0; i < slides.length - 1; i++) {
      if (slides[i].length + slides[i+1].length < minLen) {
        minLen = slides[i].length + slides[i+1].length;
        minIdx = i;
      }
    }
    if (minIdx !== -1) {
      slides[minIdx] = slides[minIdx] + " " + slides[minIdx+1];
      slides.splice(minIdx + 1, 1);
    } else break;
  }

  // If too few slides (<2) and text is long enough, split the longest one
  if (slides.length < MIN_SLIDES && slides.length > 0) {
    const longest = slides.reduce((a, b, idx) => a.text.length > b.length ? a : {text: b, idx}, {text: "", idx: -1});
    if (longest.text.length > 20) {
      const words = longest.text.split(" ");
      const mid = Math.floor(words.length / 2);
      const s1 = words.slice(0, mid).join(" ");
      const s2 = words.slice(mid).join(" ");
      slides.splice(longest.idx, 1, s1, s2);
    }
  }
  
  return slides;
};


/**
 * Professional Urdu News Phrase Normalizer.
 * Maps common wordy news phrases to concise, "ChatGPT-style" slide points.
 */
const NEWS_THESAURUS: Record<string, string> = {
  "تشریف آوری ہوئی": "آمد",
  "تشریف لائے": "آمد",
  "ملاقات کا سلسلہ رہا": "ملاقات",
  "ملاقات کا سلسلہ ہوا": "ملاقات",
  "ملاقات ہوئی": "ملاقات",
  "آگاہ کیا گیا": "آگاہی",
  "وزٹ کروایا": "وزٹ",
  "وزٹ کیا": "وزٹ",
  "تحفے میں پیش کئے": "تحفہ پیش کیا",
  "پیش کیا گیا": "پیش کیا",
  "شرکت کی": "شرکت",
  "منعقد ہوا": "منعقد",
  "بیان فرمایا": "بیان",
  "گفتگو ہوئی": "گفتگو",
  "بتایا گیا": "تفصیلات",
  "تفصیلات بتائیں": "تفصیلات",
  "تبادلہ خیال کیا": "تبادلہ خیال",
  "دعوت اسلامی کے": "", 
  "محرم الحرام": "محرم شریف",
  "عالمی مدنی مرکز فیضان مدینہ کراچی": "فیضان مدینہ کراچی",
  "علاقہ مکین": "مقامی اسلامی بھائی",
  "اوور سیز": "انٹر نیشنل افئیرز",
  "مجلس بیرون ملک": "انٹر نیشنل افئیرز ڈیپارٹمنٹ",
  "اوورسیز میں دعوت اسلامی کے سینٹرز": "مختلف ممالک میں دعوت اسلامی کے سینٹرز",
  "تین روزہ اجتماع": "تین دن کا سنتوں بھرا اجتماع",
  "روزہ": "دن",
  "سوگوار خاندان": "لواحقین",
  "مشورہ": "مدنی مشورہ",
  "بریفنگ": "کاموں سے متعلق آگاہی",
  "بریفنگ دی گئی": "کاموں کے بارے میں بتایا گیا",
  "اہم تعلیمی سیشن": "ایک سیشن کا اہتما م",
  "دو روزہ سنتوں بھرےاجتماع کے سلسلےمیں": "دو دن کے سنتوں بھرے اجتماع کے سلسلے",
  "مدنی خبروں کے نمائندےسےخصوصی گفتگوبھی کی": "مدنی خبروں سے گفتگو",
};

const FORBIDDEN_WORDS = [
  "مدنی مرکز",
  "میٹ اپ",
  "تربیت",
  "سعودی عرب",
  "عمان",
  "کویت",
  "قطر",
  "بحرین",
  "یواے ای",
  "اِدھر",
  "اُدھر",
  "نیز"
];

/**
 * Normalizes a sentence to make it "Slide-Ready".
 * This mimics an LLM by stripping redundant words and using professional shorthand.
 */
export const normalizeUrduSlide = (text: string): string => {
  let normalized = text.trim();
  
  // Rule 5: Location Appends
  normalized = normalized.replace(/رائیونڈ/g, "رائیونڈ (مصطفی آباد)");
  normalized = normalized.replace(/ملتان/g, "ملتان (مدینۃالاولیاء)");

  // Rule 16: Prophet Honorific
  // Only append if it's not already there
  const prophetRegex = /(نبی کریم|رسول اللہ|محمد صلی اللہ علیہ و آلہ وصحبہ وسلم)/g;
  if (/نبی کریم|رسول اللہ/g.test(normalized) && !/صلی اللہ علیہ و آلہ وصحبہ وسلم/g.test(normalized)) {
    normalized = normalized.replace(/(نبی کریم|رسول اللہ)/g, "$1 صلی اللہ علیہ و آلہ وصحبہ وسلم");
  }

  // Policy 27: Do not write PBUH with Ashiqan-e-Rasool
  normalized = normalized.replace(/عاشقان رسول صلی اللہ علیہ و آلہ وصحبہ وسلم/g, "عاشقان رسول");

  // Apply professional shorthand replacements
  for (const [wordy, concise] of Object.entries(NEWS_THESAURUS)) {
    const regex = new RegExp(wordy, "g");
    normalized = normalized.replace(regex, concise);
  }

  // Filter Forbidden Words
  for (const forbidden of FORBIDDEN_WORDS) {
    const regex = new RegExp(forbidden, "g");
    normalized = normalized.replace(regex, "");
  }

  // Rule 14: Strip Dates (e.g. 12-05-2024 or 12 مئی)
  normalized = normalized.replace(/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/g, "");
  normalized = normalized.replace(/\d{1,2}\s+(جنوری|فروری|مارچ|اپریل|مئی|جون|جولائی|اگست|ستمبر|اکتوبر|نومبر|دسمبر)/g, "");

  // Policy 28: Remove trailing full stops or Urdu dots
  normalized = normalized.replace(/[\s\u06C1\u0648\u0626\u06CC\.\u06D4]+$/u, "");
  
  return normalized.length < 3 ? text : normalized;
};

/**
 * Suggests a template and export name for a given slide text.
 * Implements Rule 13, 20, 23, and 24.
 */
export const suggestMetadata = (text: string, blockId: string, index: number, totalSlides: number) => {
  let templateId = "default";
  let normalized = normalizeUrduSlide(text);
  
  // Rule 13: Honorifics for Scholars (Ulama)
  const scholarTitles = ["مولانا", "مفتی", "علامہ", "پیر", "شیخ", "قاری"];
  const isScholar = scholarTitles.some(title => normalized.includes(title));
  
  if (isScholar) {
    normalized = normalized.replace(/(حاضری|آمد)/g, "تشریف آوری");
  } else {
    normalized = normalized.replace(/تشریف آوری/g, "آمد");
  }

  let suffix = "";
  
  // Rule 20, 23: Address detection (ends with Pakistan)
  if (/پاکستان[\s\p{P}]*$/u.test(normalized)) {
    // Policy 33: Check if it's outside Pakistan (simple heuristic)
    // If it contains "بنگلہ دیش", "جنوبی افریقہ", etc. but ends with Pakistan? 
    // Actually policy says "News from outside Pakistan should not have address".
    // We'll skip if it mentions common foreign countries.
    const foreignCountries = ["بنگلہ دیش", "جنوبی افریقہ", "انڈیا", "برطانیہ", "امریکہ"];
    const isForeign = foreignCountries.some(c => normalized.includes(c));
    
    if (!isForeign) {
      templateId = "addressBar";
      // Find location match
      const matches: string[] = [];
      Object.keys(URDU_LOCATION_MAP).forEach(urduKey => {
        if (normalized.includes(urduKey)) {
          matches.push(URDU_LOCATION_MAP[urduKey]);
        }
      });
      const city = matches.find(m => m !== "Pakistan") || matches[0] || "Address";
      suffix = city;
    } else {
      // If foreign, we just treat it as a normal slide or discard it
      // For now, let's just not give it the addressBar template
      suffix = String.fromCharCode(65 + index);
    }
  } 
  // Rule 24: Reporter line
  else if (isReportLine(normalized) || normalized.startsWith("رپورٹ")) {
    templateId = "reporterName";
    suffix = "Report";
    if (!normalized.startsWith("رپورٹ :")) {
      normalized = normalized.replace(/^رپورٹ\s*/, "رپورٹ : ");
    }
  } 
  else if (isPersonName(normalized)) {
    templateId = "nameBand";
    suffix = sanitizeFilename(transliterateUrdu(normalized));
  } 
  else {
    // Normal slide uses A, B, C...
    suffix = String.fromCharCode(65 + index);
  }

  const exportName = `${blockId}.${suffix}.png`;
  
  return { templateId, exportName, normalizedText: normalized };
};

