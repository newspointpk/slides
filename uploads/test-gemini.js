import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Using API Key:", apiKey ? "FOUND" : "MISSING");
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    console.log("Testing gemini-flash-latest with v1beta...");
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent("Say hello in Urdu");

    console.log("Success (v1):", result.response.text());
  } catch (err) {
    console.error("Failed (v1):", err.message);
    
    try {
      console.log("Testing gemini-1.5-flash with v1beta...");
      const modelBeta = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const resultBeta = await modelBeta.generateContent("Say hello in Urdu");
      console.log("Success (v1beta):", resultBeta.response.text());
    } catch (errBeta) {
      console.error("Failed (v1beta):", errBeta.message);
    }
  }
}

test();
