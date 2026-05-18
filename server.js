import express, { json } from 'express';
import cors from 'cors';
import multer from 'multer';
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { existsSync, createReadStream, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import yauzl from 'yauzl';
import sax from 'sax';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';

const POLICIES_PATH = join(dirname(fileURLToPath(import.meta.url)), 'ai_policies.json');
let AI_POLICIES = { wordReplacements: [], forbiddenWords: [], formattingRules: [], constraints: {} };

try {
  if (existsSync(POLICIES_PATH)) {
    AI_POLICIES = JSON.parse(readFileSync(POLICIES_PATH, 'utf8'));
  }
} catch (err) {
  console.error("Failed to load AI policies:", err);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

let isIndexingHistorical = false;





const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001;

app.use(cors());
app.use(json());

// Initialize SQLite Database
const db = new Database('newsroom.db');

// Create tables with Full-Text Search
db.exec(`
  CREATE TABLE IF NOT EXISTS slides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    newsId TEXT,
    originalText TEXT,
    slideText TEXT,
    type TEXT
  );
  
  CREATE VIRTUAL TABLE IF NOT EXISTS slides_fts USING fts5(
    slideText,
    content='slides',
    content_rowid='id'
  );
  
  CREATE TRIGGER IF NOT EXISTS slides_ai AFTER INSERT ON slides BEGIN
    INSERT INTO slides_fts(rowid, slideText) VALUES (new.id, new.slideText);
  END;
`);

/**
 * Streaming DOCX Parser
 * Extract text from word/document.xml without loading the whole file into memory.
 */
const streamDocxText = (docxPath) => {
  return new Promise((resolve, reject) => {
    let textContent = '';
    const insertStmt = db.prepare('INSERT INTO slides (newsId, originalText, slideText, type) VALUES (?, ?, ?, ?)');
    let currentNewsId = 'Unknown';
    let currentLine = '';
    
    yauzl.open(docxPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      
      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        if (entry.fileName === 'word/document.xml') {
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) return reject(err);
            
            const saxStream = sax.createStream(true);
            let inText = false;
            
            db.prepare('DELETE FROM slides').run();
            db.prepare('DELETE FROM slides_fts').run();
            if (db.inTransaction) {
              console.warn("Database already in transaction, skipping BEGIN");
            } else {
              db.prepare('BEGIN').run();
            }

            
            saxStream.on('opentag', (node) => {
              if (node.name === 'w:t') inText = true;
            });
            
            saxStream.on('closetag', (name) => {
              if (name === 'w:t') inText = false;
              if (name === 'w:p') {
                const line = currentLine.trim();
                if (line) {
                  const bfMatch = line.match(/^BF\.(\d+)/i);
                  if (bfMatch) {
                    currentNewsId = `BF.${bfMatch[1]}`;
                  } else if (line.length > 5) {
                    insertStmt.run(currentNewsId, line, line, 'normal');
                  }
                }
                currentLine = '';
              }
            });
            
            saxStream.on('text', (text) => {
              if (inText) currentLine += text;
            });

            readStream.pipe(saxStream);
            readStream.on('end', () => {
              db.prepare('COMMIT').run();
              zipfile.readEntry();
            });
            readStream.on('error', (err) => {
              if (db.inTransaction) db.prepare('ROLLBACK').run();
              reject(err);
            });


          });
        } else {
          zipfile.readEntry();
        }
      });
      
      zipfile.on('end', () => resolve());
      zipfile.on('error', (err) => reject(err));
    });
  });
};

app.post('/api/index-historical', async (req, res) => {
  if (isIndexingHistorical) {
    return res.json({ success: true, message: 'Indexing already in progress' });
  }

  try {
    isIndexingHistorical = true;
    const docxPath = join(__dirname, './public/Slides for AI training.docx');
    if (!existsSync(docxPath)) {
      isIndexingHistorical = false;
      return res.status(404).json({ error: 'Historical DOCX not found' });
    }

    await streamDocxText(docxPath);
    
    const count = db.prepare('SELECT COUNT(*) as count FROM slides').get().count;
    res.json({ success: true, count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    isIndexingHistorical = false;
  }
});


app.get('/api/search', (req, res) => {
  const { q, limit = 5 } = req.query;
  if (!q) return res.json([]);
  try {
    const stmt = db.prepare(`
      SELECT s.* FROM slides s
      JOIN slides_fts f ON s.id = f.rowid
      WHERE f.slideText MATCH ?
      ORDER BY rank LIMIT ?
    `);
    res.json(stmt.all(`${q}*`, limit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/**
 * Route: Search by News ID (for pattern learning)
 */
app.get('/api/search-by-block', (req, res) => {
  const { newsId } = req.query;
  if (!newsId) return res.json([]);
  try {
    const stmt = db.prepare('SELECT * FROM slides WHERE newsId = ? ORDER BY id ASC');
    res.json(stmt.all(newsId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const upload = multer({ dest: 'uploads/' });

/**
 * Route: Parse New News File
 */
app.post('/api/parse-news', upload.single('file'), async (req, res) => {
  if (!req.file) {
    console.error("No file uploaded");
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  console.log("Parsing new news file:", req.file.originalname);
  
  try {
    const docxPath = req.file.path;
    const blocks = [];
    let currentBlock = null;

    yauzl.open(docxPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        console.error("ZIP open error:", err);
        return res.status(500).json({ error: err.message });
      }
      
      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        if (entry.fileName === 'word/document.xml') {
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              console.error("Entry stream error:", err);
              return res.status(500).json({ error: err.message });
            }
            const saxStream = sax.createStream(true);
            let inText = false;
            let currentLine = '';

            saxStream.on('opentag', (node) => { if (node.name === 'w:t') inText = true; });
            saxStream.on('closetag', (name) => {
              if (name === 'w:t') inText = false;
              if (name === 'w:p') {
                const line = currentLine.trim();
                if (line) {
                  // Improved Regex: Matches BF.123, 1., 1), (1), or dashed separators like ---
                  const blockMatch = line.match(/^(BF\.(\d+)|(\d+)\s*[\.\)]\s*|[-*_]{3,})/i);
                  
                  if (blockMatch) {
                    if (currentBlock) blocks.push(currentBlock);
                    const blockId = blockMatch[2] || blockMatch[3] || `Block_${blocks.length + 1}`;
                    currentBlock = { id: blockId.startsWith('BF.') ? blockId : `BF.${blockId}`, originalText: line };
                  } else {

                    if (!currentBlock) {
                      currentBlock = { id: 'News', originalText: line };
                    } else {
                      currentBlock.originalText += '\n' + line;
                    }
                  }
                }

                currentLine = '';
              }
            });
            saxStream.on('text', (text) => { if (inText) currentLine += text; });
            
            readStream.pipe(saxStream);
            readStream.on('end', () => {
               if (currentBlock) blocks.push(currentBlock);
               console.log(`Finished parsing. Found ${blocks.length} blocks.`);
               zipfile.readEntry();
            });
          });
        } else {
          zipfile.readEntry();
        }
      });
      
      zipfile.on('end', () => {
        if (existsSync(docxPath)) unlinkSync(docxPath);
        res.json(blocks);
      });

      zipfile.on('error', (err) => {
        console.error("ZIP error:", err);
        res.status(500).json({ error: err.message });
      });
    });
  } catch (err) {
    console.error("Parse news failed:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Route: Generate Slides using Gemini AI
 */
app.post('/api/generate-slides-ai', async (req, res) => {
  const { text, examples } = req.body;
  
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
    return res.status(500).json({ error: "Gemini API Key not configured" });
  }

  // Format examples for the prompt
  const examplesPrompt = examples && examples.length > 0 
    ? examples.map(ex => `Input: ${ex.originalText}\nSlides: ${JSON.stringify(ex.slides)}`).join('\n\n')
    : "No historical examples available.";

  const prompt = `
    You are an expert Urdu news editor with 6 years of professional experience in newsroom automation. 
    Your task is to split the provided news block into slides while strictly adhering to the following NON-BREAKABLE policies and historical style patterns.

    CORE POLICIES:
    - Slide Count: Minimum ${AI_POLICIES.constraints.minSlides || 2}, Maximum ${AI_POLICIES.constraints.maxSlides || 8} slides per block.
    - Word Count: Each slide must be between ${AI_POLICIES.constraints.minWordsPerSlide || 8} and ${AI_POLICIES.constraints.maxWordsPerSlide || 20} words.
    - Grammar: Every slide MUST be a complete sentence with a Subject (Fail) and Object (Mafool). No incomplete phrases.
    - Location Rules: Append "(مصطفی آباد)" to "رائیونڈ" and "(مدینۃالاولیاء)" to "ملتان". NEVER mention city/area names inside the slide text itself (Policy 26).
    - Terminology: Use "محرم شریف" instead of "محرم الحرام". Use "فیضان مدینہ کراچی" instead of "عالمی مدنی مرکز فیضان مدینہ کراچی".
    - Honorifics: Use "تشریف آوری" ONLY for Ulama/Scholars. For others, use "حاضری" or "آمد".
    - Prophet's Name: Always include "صلی اللہ علیہ و آلہ وصحبہ وسلم" after the Prophet's name. HOWEVER, do NOT write it with "Ashiqan-e-Rasool" (عاشقان رسول) (Policy 27).
    - Forbidden: NEVER use words: ${AI_POLICIES.forbiddenWords.join(", ")}. NEVER include dates.
    - Punctuation: NEVER put a full stop (.) or (۔) at the end of any slide (Policy 28).
    - Word Replacements: 
        - "مشورہ" -> "مدنی مشورہ"
        - "بریفنگ" -> "کاموں سے متعلق آگاہی"
        - "اہم تعلیمی سیشن" -> "ایک سیشن کا اہتما م"
        - "دو روزہ سنتوں بھرےاجتماع کے سلسلےمیں" -> "دو دن کے سنتوں بھرے اجتماع کے سلسلے"
        - "مدنی خبروں کے نمائندےسےخصوصی گفتگوبھی کی" -> "مدنی خبروں سے گفتگو"
    
    SPECIAL FORMATTING (At the end):
    - Addresses: If the news block contains locations, list them at the very end as separate strings. Format: "City Province, Country" (e.g., "لاہور پنجاب ، پاکستان").
    - Foreign News: Do NOT write addresses for news outside Pakistan (Policy 33).
    - Reporter: If a reporter is mentioned, add a separate line: "رپورٹ : [Name]".
    - Participation: NEVER generate slides about who participated or who was present (Policy 34).
    - IMPORTANT: Address and Reporter lines do NOT count towards the slide limit.

    HISTORICAL CONTEXT (Adhere to this 6-year style):
    ${examplesPrompt}
    
    CURRENT NEWS BLOCK TO PROCESS:
    ${text}
    
    OUTPUT INSTRUCTIONS:
    - Return ONLY a raw JSON array of strings.
    - The first N strings are the slides (N = 2 to 8).
    - The subsequent strings are the address and reporter lines.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = response.text();
    // Strip markdown if present
    const jsonText = rawText.replace(/```json|```/g, "").trim();
    const slides = JSON.parse(jsonText);
    res.json(slides);
  } catch (err) {
    console.error("Gemini Error:", err);
    res.status(500).json({ error: "Failed to generate slides with AI. " + err.message });
  }
});



app.listen(port, () => console.log(`Backend running at http://localhost:${port}`));
