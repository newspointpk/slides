/**
 * Urdu to English Transliteration and Name Detection Utility
 */

const URDU_NAME_PARTS: Record<string, string> = {
  // Common prefixes/First names
  "محمد": "Muhammad",
  "عبد": "Abdul",
  "سید": "Syed",
  "حافظ": "Hafiz",
  "قاری": "Qari",
  "مولانا": "Maulana",
  "مفتی": "Mufti",
  "ڈاکٹر": "Doctor",
  "انجینئر": "Engineer",
  
  // Core names
  "طاہر": "Tahir",
  "حیدر": "Haider",
  "خان": "Khan",
  "باری": "Bari",
  "محمود": "Mehmood",
  "احمد": "Ahmed",
  "علی": "Ali",
  "حسن": "Hassan",
  "حسین": "Hussain",
  "عمر": "Umer",
  "عثمان": "Usman",
  "ابوبکر": "Abubakar",
  "طلحہ": "Talha",
  "زبیر": "Zubair",
  "حمزہ": "Hamza",
  "بلال": "Bilal",
  "سلمان": "Salman",
  "فیصل": "Faisal",
  "عرفان": "Irfan",
  "عمران": "Imran",
  "ارشد": "Arshad",
  "اسلم": "Aslam",
  "اکرم": "Akram",
  "اقبال": "Iqbal",
  "طارق": "Tariq",
  "خالد": "Khalid",
  "راشد": "Rashid",
  "ساجد": "Sajid",
  "ماجد": "Majid",
  "عامر": "Aamir",
  "ناصر": "Nasir",
  "ظفر": "Zafar",
  "وقار": "Waqar",
  "یاسر": "Yasir",
  "زاہد": "Zahid",
  "شاہد": "Shahid",
  "عابد": "Aabid",
  "حامد": "Hamid",
  "غلام": "Ghulam",
  "فرید": "Fareed",
  "رحمت": "Rehmat",
  "اللہ": "Allah",
  "سبحان": "Subhan",
  "ایاز": "Ayaz",
  "حمید": "Hameed",
  "مجید": "Majeed",
  "رشید": "Rashid",
  "سعید": "Saeed",
  "نوید": "Navid",
  "ولید": "Waleed",
  "خلیل": "Khalil",
  "جلیل": "Jaleel",
  "شکیل": "Shakeel",
  "عقیل": "Aqeel",
  "نبیل": "Nabeel",
  "عدیل": "Adeel",
  "جاوید": "Javed",
  "پرویز": "Parvez",
  "شہزاد": "Shahzad",
  "اصغر": "Asghar",
  "اکبر": "Akbar",
  "اعظم": "Azam",
  "افضل": "Afzal",
  "انور": "Anwar",
  "اختر": "Akhtar",
  "اظہر": "Azhar",
  "امجد": "Amjad",
  "اشرف": "Ashraf",
  "الطاف": "Altaf",
  "رضا": "Raza",
  "مرتضی": "Murtaza",
  "مصطفی": "Mustafa",
  "مجتبی": "Mujtaba",
  
  // Suffixes/Titles/Affiliations
  "عطاری": "Attari",
  "مدنی": "Madani",
  "قادری": "Qadri",
  "رضوی": "Razvi",
  "نقشبندی": "Naqshbandi",
  "سہروردی": "Suhrawardi",
  "چشتی": "Chishti",
  "درانی": "Durrani",
  "صاحب": "Sahib",
  "بھائی": "Bhai",
  "چوہدری": "Chaudhry",
  "راجپوت": "Rajput",
  "قریشی": "Qureshi",
  "صدیقی": "Siddiqui",
  "فاروقی": "Farooqi",
  "عثمانی": "Usmani",
  "علوی": "Alvi",
  "ہاشمی": "Hashmi",
};

export const URDU_LOCATION_MAP: Record<string, string> = {
  "کراچی": "Karachi",
  "لاہور": "Lahore",
  "اسلام آباد": "Islamabad",
  "پشاور": "Peshawar",
  "راولپنڈی": "Rawalpindi",
  "ایبٹ آباد": "Abbottabad",
  "مینگورہ": "Mingora",
  "سوات": "Swat",
  "مردان": "Mardan",
  "صوابی": "Swabi",
  "نوشہرہ": "Nowshera",
  "چارسدہ": "Charsadda",
  "کوہاٹ": "Kohat",
  "بنوں": "Bannu",
  "ڈی آئی خان": "DIKhan",
  "ڈیرہ اسماعیل خان": "DIKhan",
  "کوئٹہ": "Quetta",
  "خضدار": "Khuzdar",
  "حب": "Hub",
  "چمن": "Chaman",
  "تربت": "Turbat",
  "سبی": "Sibi",
  "لورالائی": "Loralai",
  "فیصل آباد": "Faisalabad",
  "ملتان": "Multan",
  "سیالکوٹ": "Sialkot",
  "گوجرانوالہ": "Gujranwala",
  "حیدرآباد": "Hyderabad",
  "حیدر آباد": "Hyderabad",
  "سکھر": "Sukkur",
  "لاڑکانہ": "Larkana",
  "نوابشاہ": "Nawabshah",
  "میرپور خاص": "MirpurKhas",
  "بہاولپور": "Bahawalpur",
  "سرگودھا": "Sargodha",
  "جھنگ": "Jhang",
  "شیخوپورہ": "Sheikhupura",
  "گجرات": "Gujrat",
  "قصور": "Kasur",
  "رحیم یار خان": "RahimYarKhan",
  "ساہیوال": "Sahiwal",
  "اوکاڑہ": "Okara",
  "واہ کینٹ": "WahCantt",
  "ٹیکسلا": "Taxila",
  "اٹک": "Attock",
  "چکوال": "Chakwal",
  "جہلم": "Jhelum",
  "منڈی بہاؤالدین": "MandiBahauddin",
  "حافظ آباد": "Hafizabad",
  "چنیوٹ": "Chiniot",
  "ٹوبہ ٹیک سنگھ": "TobaTekSingh",
  "بورے والا": "Burewala",
  "وہاڑی": "Vehari",
  "بہاولنگر": "Bahawalnagar",
  "پاکپتن": "Pakpattan",
  "لودھراں": "Lodhran",
  "خانپور": "Khanpur",
  "خانیوال": "Khanewal",
  "مظفر گڑھ": "Muzaffargarh",
  "لیہ": "Layyah",
  "بھکر": "Bhakkar",
  "میانوالی": "Mianwali",
  "خوشاب": "Khushab",
  "مظفر آباد": "Muzaffarabad",
  "میرپور": "Mirpur",
  "کوٹلی": "Kotli",
  "گلگت": "Gilgit",
  "سکردو": "Skardu",
  "ہنزہ": "Hunza",
  "بلتستان": "Baltistan",
  "کشمیر": "Kashmir",
  "سندھ": "Sindh",
  "پنجاب": "Punjab",
  "خیبر پختونخوا": "KPK",
  "بلوچستان": "Balochistan",
  "بنگلہ دیش": "Bangladesh",
  "انڈیا": "India",
  "برطانیہ": "UK",
  "امریکہ": "USA",
  "افغانستان": "Afghanistan",
  "سعودی عرب": "SaudiArabia",
  "دبئی": "Dubai",
  "پاکستان": "Pakistan"
};

// Words that are likely to be part of a report line
const REPORT_KEYWORDS = ["رپورٹ", "رپوٹر", "رپورٹ:", "رپورٹ :"];

/**
 * Detects if a line is a report line
 */
export function isReportLine(text: string): boolean {
  const trimmed = text.trim();
  return REPORT_KEYWORDS.some(keyword => trimmed.includes(keyword));
}

/**
 * Detects if a line is likely a person's name
 * Rules:
 * 1. Word count between 2 and 5
 * 2. Contains at least one known name part
 * 3. Doesn't contain common news/sentence words (verbs, connectors) - simplistic approach for now
 */
export function isPersonName(text: string): boolean {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  
  if (words.length < 2 || words.length > 5) return false;
  
  // If it starts with a BF code, it's not a name
  if (/^BF\.\d+/i.test(trimmed)) return false;

  // Check if any word is in our name parts dictionary
  const hasNamePart = words.some(word => URDU_NAME_PARTS[word]);
  
  // Also check for common "Report" keyword to avoid false positives
  if (isReportLine(trimmed)) return false;

  return hasNamePart;
}

/**
 * Transliterates Urdu text to English PascalCase
 */
export function transliterateUrdu(text: string): string {
  // Remove "Report:" prefix if present
  let cleanText = text.replace(/رپورٹ[\s:]+/u, "").trim();
  
  const words = cleanText.split(/\s+/).filter(Boolean);
  
  // Specific simplification logic based on user examples
  // 1. "محمد طاہر عطاری مدنی" -> "Tahir"
  // If we have 4+ parts and "محمد" is at start, and it ends with affiliations like "عطاری", "مدنی"
  if (words.length >= 4 && words[0] === "محمد") {
    // Try to find the second word as the "core" name
    if (URDU_NAME_PARTS[words[1]]) {
      return URDU_NAME_PARTS[words[1]];
    }
  }

  // 2. "حیدر خان درانی" -> "HaiderKhan"
  // If we have 3 parts and it ends with "درانی"
  if (words.length === 3 && words[2] === "درانی") {
    const p1 = URDU_NAME_PARTS[words[0]] || words[0];
    const p2 = URDU_NAME_PARTS[words[1]] || words[1];
    return `${p1}${p2}`;
  }

  // Default: Transliterate all parts and join
  const transliteratedParts = words.map(word => {
    // Check dictionary
    if (URDU_NAME_PARTS[word]) return URDU_NAME_PARTS[word];
    
    // Handle "Al-" prefix (ال)
    if (word.startsWith("ال") && word.length > 2) {
      const core = word.substring(2);
      if (URDU_NAME_PARTS[core]) return URDU_NAME_PARTS[core];
    }
    
    // Fallback: Simple character-based transliteration (very basic)
    return fallbackTransliterate(word);
  });

  // Limit to max 2 parts for filenames to keep them clean, unless it's "Abdul Bari" style
  if (transliteratedParts.length > 2) {
    // If first part is "Muhammad", omit it
    if (transliteratedParts[0] === "Muhammad") {
      return transliteratedParts.slice(1, 3).join("");
    }
    return transliteratedParts.slice(0, 2).join("");
  }

  return transliteratedParts.join("");
}

/**
 * Extremely basic fallback for unknown words
 * Just removes non-alphanumeric characters and tries to make it safe
 */
function fallbackTransliterate(word: string): string {
  if (/^[a-zA-Z]+$/.test(word)) return word;
  
  // Basic character mapping for common Urdu letters to Latin
  const charMap: Record<string, string> = {
    'ا': 'A', 'ب': 'B', 'پ': 'P', 'ت': 'T', 'ٹ': 'T', 'ث': 'S', 'ج': 'J', 'چ': 'Ch',
    'ح': 'H', 'خ': 'Kh', 'د': 'D', 'ڈ': 'D', 'ذ': 'Z', 'ر': 'R', 'ڑ': 'R', 'ز': 'Z',
    'ژ': 'Zh', 'س': 'S', 'ش': 'Sh', 'ص': 'S', 'ض': 'Z', 'ط': 'T', 'ظ': 'Z', 'ع': 'A',
    'غ': 'Gh', 'ف': 'F', 'ق': 'Q', 'ک': 'K', 'گ': 'G', 'ل': 'L', 'م': 'M', 'ن': 'N',
    'و': 'W', 'ہ': 'H', 'ھ': 'H', 'ی': 'Y', 'ئ': 'Y', 'ے': 'E', 'آ': 'A'
  };

  let result = '';
  for (const char of word) {
    result += charMap[char] || '';
  }
  
  return result || "Name"; 
}

/**
 * Formats a filename to be safe for Windows
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, "").trim();
}
