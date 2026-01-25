// check-models.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// 妳的金鑰
const API_KEY = "AIzaSyDllVNlRCHWbNuXvDj4gzZrcbaJj4VhoAc";

const genAI = new GoogleGenerativeAI(API_KEY);

async function testModels() {
  console.log("🔍 正在查詢可用模型列表...");
  
  try {
    // 1. 列出所有模型
    // 注意：Gemini API 的 listModels 不一定在所有 SDK 版本都支援，
    // 但我們主要測試生成，所以下面直接打。
    
    const candidates = [
      "gemini-2.5-flash", 
      "gemini-2.5-flash-lite-preview-09-2025",
      "gemini-2.0-flash-exp",
      "gemini-1.5-flash"
    ];

    console.log("🚀 開始逐一測試連線能力...\n");

    for (const modelName of candidates) {
      process.stdout.write(`👉 測試 [${modelName}] ... `);
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hi");
        const response = await result.response;
        const text = response.text();
        console.log("✅ 成功！(回應: " + text.trim() + ")");
        console.log("   🌟 請在 App.jsx 使用這個名稱！\n");
        // 找到一個能用的就夠了，但我們可以跑完看看
      } catch (error) {
        console.log("❌ 失敗");
        console.log("   原因: " + error.message.split('\n')[0] + "\n");
      }
    }

  } catch (e) {
    console.error("致命錯誤:", e);
  }
}

testModels();