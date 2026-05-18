import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    if (data.models) {
      const flashModels = data.models.filter(m => m.name.includes('flash')).map(m => m.name);
      console.log("Flash Models:", flashModels);
    } else {
      console.log("No models found:", data);
    }
  } catch (err) {
    console.error("Failed to list models:", err.message);
  }
}

listModels();
