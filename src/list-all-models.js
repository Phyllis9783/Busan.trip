// list-all-models.js
// 這是一個「盤點倉庫」的腳本，會列出妳帳號下所有可用的模型

const API_KEY = "AIzaSyDllVNlRCHWbNuXvDj4gzZrcbaJj4VhoAc"; // 妳的金鑰
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function listModels() {
  console.log("🔍 正在向 Google 查詢您的可用模型清單...\n");
  
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("❌ 查詢失敗:", data.error.message);
      return;
    }

    if (!data.models) {
      console.log("⚠️ 沒有找到任何模型 (奇怪)");
      return;
    }

    console.log("=========================================");
    console.log("📋 Google 官方回傳的模型列表 (請截圖或複製給 Gemini)");
    console.log("=========================================");
    
    // 只列出能產生內容的模型 (generateContent)
    const availableModels = data.models
      .filter(m => m.supportedGenerationMethods.includes("generateContent"))
      .map(m => m.name.replace("models/", ""));

    availableModels.forEach(name => {
      console.log(`✅ ${name}`);
    });

    console.log("=========================================");

  } catch (error) {
    console.error("💀 發生錯誤:", error);
  }
}

listModels();