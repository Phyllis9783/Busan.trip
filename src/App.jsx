import React, { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MapPin, Calculator, Map as MapIcon, Plus, Trash2, Plane, Bed, Ticket, Utensils, ShoppingBag, MoreHorizontal, Camera, Coffee, Loader2, Sparkles, Navigation, Wand2, Activity, RefreshCw, AlertTriangle, Lock, ScanLine, Wallet } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- 1. 資安設定 ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error(" ❌  錯誤：找不到 VITE_GEMINI_API_KEY，請檢查 .env 或 Vercel 設定！");
}

// Leaflet Icon 設定
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;
ChartJS.register(ArcElement, Tooltip, Legend);

// --- 2. 預設資料 (V20.21 雙語導航示範) ---
const DEFAULT_TRIP = {
  meta: { country: "KR", currency: "KRW", rate: 0.024, symbol: "₩" },
  itinerary: {
    1: { 
      center: [35.0788, 129.0180], 
      zoom: 14, 
      summary: "第1天：初見松島，入住溫德姆至尊與頂級海鮮自助。", 
      items: [
        { time: "15:00", title: "🏨 釜山溫德姆至尊飯店 (Wyndham Grand)", desc: "Check-in，享受全房型海景，體驗松島奢華住宿。", type: "hotel", intense: false }, 
        { time: "18:00", title: "🦀 The Bridge 自助餐 (더브릿지)", desc: "晚餐：釜山頂級海鮮吃到飽，必吃長腳蟹與新鮮生魚片。", type: "food", intense: false },
        { time: "20:30", title: "🚶 松島天空步道 (송도구름산책로)", desc: "飯後散步，行走在海上步道，欣賞松島海上纜車夜景。", type: "ticket", intense: false }
      ] 
    },
    2: { 
      center: [35.0968, 129.0306], 
      zoom: 14, 
      summary: "第2天：色彩斑斕的文化村與南浦洞購物狂歡。", 
      items: [
        { time: "10:00", title: "🏘️ 甘川洞文化村 (감천문화마을)", desc: "釜山的馬丘比丘，尋找小王子雕像並與彩色小屋合影。", type: "ticket", intense: true },
        { time: "13:00", title: "🐙 札嘎其市場 (자갈치시장)", desc: "午餐：品嚐現撈活章魚與烤盲鰻，體驗道地釜山海味。", type: "food", intense: false },
        { time: "15:30", title: "🛍️ BIFF 廣場 (BIFF 광장)", desc: "下午茶：元祖黑糖餅，接著在南浦洞商圈盡情購物。", type: "shopping", intense: false }
      ] 
    },
    3: { 
      center: [35.1587, 129.1604], 
      zoom: 14, 
      summary: "第3天：海雲台海岸風情與膠囊列車的浪漫。", 
      items: [
        { time: "09:30", title: "🚋 海雲台藍線公園 (해운대블루라인파크)", desc: "搭乘天空膠囊列車，沿著海岸線欣賞絕美海景。", type: "ticket", intense: false },
        { time: "12:00", title: "🐚 尾浦末家 (미포끝집)", desc: "午餐：在海邊享用著名的烤貝類與海鮮拉麵。", type: "food", intense: false },
        { time: "15:00", title: "🌊 海雲台海水浴場 (해운대해수욕장)", desc: "漫步沙灘，餵食海鷗，感受釜山最著名的度假氛圍。", type: "other", intense: false },
        { time: "19:00", title: "🌃 The Bay 101 (더베이101)", desc: "晚餐後欣賞摩天大樓倒映在水面的百萬夜景。", type: "other", intense: false }
      ] 
    },
    4: { 
      center: [35.1532, 129.1186], 
      zoom: 14, 
      summary: "第4天：廣安里大橋景觀與文青咖啡廳巡禮。", 
      items: [
        { time: "11:00", title: "🌉 廣安里海灘 (광안리해수욕장)", desc: "以廣安大橋為背景，在沙灘上的裝置藝術前拍照打卡。", type: "other", intense: false },
        { time: "13:00", title: "☕ Millac the Market (밀락더마켓)", desc: "午餐與下午茶：在最新的複合式文化空間享用美食。", type: "food", intense: false },
        { time: "16:00", title: "🧖‍♀️ 新世界 Spa Land (스파랜드)", desc: "金氏世界紀錄最大百貨公司，參觀五星級汗蒸幕。", type: "shopping", intense: false },
        { time: "20:00", title: "🎆 廣安里無人機秀 (광안리 드론쇼)", desc: "觀賞令人驚嘆的夜間無人機燈光表演 (週六限定)。", type: "ticket", intense: false }
      ] 
    },
    5: { 
      center: [35.1796, 128.9549], 
      zoom: 13, 
      summary: "第5天：最後的採買與機場送別。", 
      items: [
        { time: "10:00", title: "🛒 樂天超市 釜山店 (롯데마트 부산점)", desc: "最後衝刺：購買海苔、泡菜、零食等伴手禮。", type: "shopping", intense: false },
        { time: "13:00", title: "✈️ 金海國際機場 (김해국제공항)", desc: "辦理登機與退稅，帶著滿滿的回憶返家。", type: "transport", intense: true }
      ] 
    }
  }
};

const categoryNames = {
  food: '餐飲',
  transport: '交通',
  shopping: '購物',
  hotel: '住宿',
  ticket: '票券',
  other: '其他'
};

// --- 3. 版本控制 (V20.21 Navigation Fix) ---
const STORAGE_KEY_DATA = 'travel_ai_data_v20_21_navfix';
const STORAGE_KEY_META = 'travel_ai_meta_v20_21_navfix';
const STORAGE_KEY_EXPENSES = 'travel_ai_expenses_v20_21_navfix';
const STORAGE_KEY_AUTH = 'travel_ai_auth_biz_rescue'; 

const App = () => {
  // --- 🔐 商業防護鎖 ---
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [authError, setAuthError] = useState("");

  // --- 核心狀態 ---
  const [activeTab, setActiveTab] = useState('itinerary');
  const [day, setDay] = useState(1);
  const [tripData, setTripData] = useState(DEFAULT_TRIP.itinerary);
  const [tripMeta, setTripMeta] = useState(DEFAULT_TRIP.meta);
  const [expenses, setExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({ amount: '', note: '', type: 'food' });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  // ✨ 選中項目的狀態
  const [selectedItem, setSelectedItem] = useState(null);
  
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  // --- 初始化 Logic ---
  useEffect(() => {
    const auth = localStorage.getItem(STORAGE_KEY_AUTH);
    if (auth === "AUTHORIZED_PARTNER_RESCUE") {
      setIsAuthorized(true);
    }

    try {
      const storedExpenses = localStorage.getItem(STORAGE_KEY_EXPENSES);
      if (storedExpenses) setExpenses(JSON.parse(storedExpenses));

      const storedTrip = localStorage.getItem(STORAGE_KEY_DATA);
      const storedMeta = localStorage.getItem(STORAGE_KEY_META);
      
      if (storedTrip && storedMeta) {
        setTripData(JSON.parse(storedTrip));
        setTripMeta(JSON.parse(storedMeta));
      }
    } catch (e) { console.warn("資料版本重置", e); }
  }, []);

  // --- 地圖 Logic ---
  useEffect(() => {
    if (activeTab !== 'itinerary' || !isAuthorized) return;
    try {
      if (!mapInstance.current && mapRef.current) {
        const initialCenter = tripData[1]?.center || [35.0788, 129.0180];
        mapInstance.current = L.map(mapRef.current, { zoomControl: false }).setView(initialCenter, 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: 'OpenStreetMap' }).addTo(mapInstance.current);
      }
      if (mapInstance.current && tripData[day]) {
        const target = tripData[day].center;
        if (Array.isArray(target) && target.length === 2) {
          mapInstance.current.flyTo(target, tripData[day].zoom || 13, { duration: 1.2 });
          
          markersRef.current.forEach(m => mapInstance.current.removeLayer(m));
          markersRef.current = [];
          
          const marker = L.marker(target).addTo(mapInstance.current)
            .bindPopup(tripData[day].summary || `Day ${day} 行程`)
            .openPopup();
          markersRef.current.push(marker);
          
          setTimeout(() => mapInstance.current.invalidateSize(), 300);
        }
      }
    } catch (error) { console.error("Map Error", error); }
  }, [activeTab, day, tripData, isAuthorized]);

  // --- 圖片壓縮 ---
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; 
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
        };
      };
    });
  };

  // --- AI API ---
  const callAI = async (prompt, imagePart = null) => {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    let retries = 0;
    while (retries < 3) {
      try {
        setStatusMessage(imagePart ? "AI 正在分析收據..." : "AI 正在規劃行程...");
        const result = imagePart 
          ? await model.generateContent([prompt, imagePart]) 
          : await model.generateContent(prompt);
        return result;
      } catch (error) {
        if (error.message.includes("429") || error.message.includes("503")) {
          retries++;
          setStatusMessage(`連線繁忙，第 ${retries} 次重試...`);
          await new Promise(r => setTimeout(r, 2000 * retries));
        } else {
          throw error;
        }
      }
    }
    throw new Error("伺服器忙線中，請稍後再試");
  };

  const generateItinerary = async () => {
    const userPrompt = prompt("請輸入您的願望 (例如：釜山松島 3天2夜)");
    if (!userPrompt) return;
    setIsGenerating(true);
    setSelectedItem(null); 
    try {
      // 🔥 導航關鍵優化：強制雙語標題
      const promptText = `User Request: "${userPrompt}"
      請生成旅遊行程 JSON。
      【重要規則】：
      1. 判斷目的地國家：如果是日本，country="JP", currency="JPY"。如果是韓國，country="KR"。
      2. "rate" 定義必須是「1 單位當地貨幣 = 多少台幣(TWD)」。
      3. 【Emoji 規則】：請在每個 items 的 title 前面加上符合該活動的 Emoji (例如 🦀, 🏨, 🏖️, 🛍️)。
      4. 【導航優化】：若是韓國(KR)行程，Title 必須包含「韓文原文」，例如 "景福宮 (경복궁)"，方便 Naver Map 搜尋。若是日本(JP)，可只用中文或中文+英文。
      
      【格式要求】：
      {
        "meta": { "country": "KR", "currency": "KRW", "rate": 0.024, "symbol": "₩" },
        "itinerary": {
          "1": { "center": [緯度, 經度], "zoom": 13, "summary": "...", "items": [{ "time": "09:00", "title": "🛍️ 樂天免稅店 (롯데면세점)", "desc": "...", "type": "shopping" }] }
        }
      }
      只回傳純 JSON，不要包含 price 欄位。`;

      const result = await callAI(promptText);
      const text = result.response.text().replace(/```json|```/g, '').trim();
      const cleanJson = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      const parsedData = JSON.parse(cleanJson);

      if (parsedData.meta.currency !== tripMeta.currency) {
        setExpenses([]);
        localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify([]));
      }
      
      setTripData(parsedData.itinerary);
      setTripMeta(parsedData.meta);
      setDay(1);
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(parsedData.itinerary));
      localStorage.setItem(STORAGE_KEY_META, JSON.stringify(parsedData.meta));
      alert(` ✨ 行程規劃完成！已切換至 ${parsedData.meta.country}`);
    } catch (error) {
      alert(`失敗：${error.message}`);
    } finally {
      setIsGenerating(false);
      setStatusMessage("");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsAnalyzing(true);
    try {
      const base64Data = await compressImage(file);
      const promptText = `Context: Current currency is ${tripMeta.currency}. Analyze receipt. 
      Return JSON: {"amount": number, "currency": "${tripMeta.currency}", "category": "category_code", "summary": "Traditional Chinese desc"}.
      
      【重要分類規則 Category Rules】:
      - shopping: 衣服, 紀念品, 化妝品, **藥品 (medicine)**, **藥妝店 (Olive Young)**, 禮品.
      - food: 餐廳, 咖啡, 零食.
      - transport: 計程車, 機票, 交通卡.
      
      Example: "Buying medicine" -> category: "shopping".
      `;
      
      const result = await callAI(promptText, { inlineData: { data: base64Data, mimeType: "image/jpeg" } });
      const text = result.response.text().replace(/```json|```/g, '').trim();
      const data = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
      
      let type = data.category ? data.category.toLowerCase() : 'other';
      if (!['food', 'transport', 'shopping', 'hotel', 'ticket', 'other'].includes(type)) {
        type = 'other';
      }

      setNewExpense({ amount: data.amount, note: data.summary, type: type });
      if (navigator.vibrate) navigator.vibrate(50);
      alert(` 🎉 辨識成功：${data.summary} - ${data.amount}`);
    } catch (error) {
      alert(`辨識失敗：${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddExpense = () => {
    if (!newExpense.amount) return;
    const amountForeign = parseFloat(newExpense.amount);
    const amountTWD = Math.round(amountForeign * tripMeta.rate);
    const item = { id: Date.now(), amountForeign, amountTWD, type: newExpense.type, note: newExpense.note || '其他', date: new Date().toLocaleDateString() };
    const updated = [item, ...expenses];
    setExpenses(updated);
    localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(updated));
    setNewExpense({ ...newExpense, amount: '', note: '' });
  };

  const handleLogin = () => {
    if (["TRAVEL2026", "VIP", "DEMO888"].includes(accessCode.toUpperCase())) {
      setIsAuthorized(true);
      localStorage.setItem(STORAGE_KEY_AUTH, "AUTHORIZED_PARTNER_RESCUE");
    } else {
      setAuthError("無效的邀請碼");
      setTimeout(() => setAuthError(""), 3000);
    }
  };

  const handleLogout = () => {
      localStorage.removeItem(STORAGE_KEY_AUTH);
      setIsAuthorized(false);
      setAccessCode("");
  }

  // --- Helper: Icon ---
  const getCategoryIcon = (type) => {
    switch(type) {
        case 'food': return <Utensils size={32}/>;
        case 'transport': return <Plane size={32}/>;
        case 'shopping': return <ShoppingBag size={32}/>;
        case 'hotel': return <Bed size={32}/>;
        case 'ticket': return <Ticket size={32}/>;
        default: return <Sparkles size={32}/>;
    }
  };

  const getCategoryColor = (type) => ({ 
    food: 'bg-orange-100 text-orange-600', 
    transport: 'bg-blue-100 text-blue-600', 
    shopping: 'bg-pink-100 text-pink-600', 
    hotel: 'bg-indigo-100 text-indigo-600', 
    ticket: 'bg-teal-100 text-teal-600', 
    other: 'bg-gray-100 text-gray-600' 
  }[type] || 'bg-gray-100 text-gray-600');

  // 🔥 導航按鈕邏輯 (Naver 搜索優化)
  const openSmartMap = () => {
    const isKorea = ['KR', 'Korea', 'South Korea'].includes(tripMeta.country);
    
    // 情況 A：有點選特定行程 -> 導航去那個地點 (搜尋)
    if (selectedItem !== null && tripData[day]?.items[selectedItem]) {
      // 移除開頭的 Emoji，保留後面的文字 (包含括號內的韓文)
      const fullTitle = tripData[day].items[selectedItem].title;
      const cleanTitle = fullTitle.replace(/^[^\u4e00-\u9fa5a-zA-Z\uac00-\ud7a3]+/, ''); 
      
      if (isKorea) {
        // Naver 搜尋時，若有韓文 (홍대거리)，成功率極高
        window.open(`nmap://search?query=${encodeURIComponent(cleanTitle)}&appname=travelai`, '_blank');
        setTimeout(() => window.open(`https://map.naver.com/v5/search/${encodeURIComponent(cleanTitle)}`, '_blank'), 500);
      } else {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanTitle)}`, '_blank');
      }
    } 
    // 情況 B：沒選行程 -> 導航去當天市中心
    else {
      if (!tripData[day]) return;
      const [lat, lng] = tripData[day].center;
      
      if (isKorea) {
        window.open(`nmap://map?lat=${lat}&lng=${lng}&zoom=15&appname=travelai`, '_blank');
        setTimeout(() => window.open(`https://map.naver.com/v5/?c=${lng},${lat},15,0,0,0,dh`, '_blank'), 500);
      } else {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
      }
    }
  };

  // --- UI 渲染 ---
  if (!isAuthorized) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
        <div className="bg-white/10 p-8 rounded-2xl backdrop-blur-md border border-white/20 w-full max-w-sm text-center shadow-2xl">
          <div className="bg-indigo-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/50">
            <Lock size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-indigo-400">AI 智能旅遊系統</h1>
          <p className="mb-6 text-gray-300 text-sm">B2B 商業合作夥伴專用通道</p>
          <input type="text" className="w-full p-3 rounded-lg bg-black/30 border border-gray-600 text-center text-xl tracking-widest mb-4 focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500 transition-all" placeholder="輸入邀請碼" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          <button onClick={handleLogin} className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-lg font-bold transition-all shadow-lg active:scale-95">進入系統</button>
          {authError && <p className="mt-4 text-red-400 text-sm animate-pulse">{authError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-800 overflow-hidden relative">
      {(isGenerating || isAnalyzing) && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white transition-all">
          <div className="bg-white/10 p-8 rounded-2xl border border-white/20 shadow-2xl flex flex-col items-center max-w-sm text-center">
            <Loader2 size={48} className="animate-spin mb-4 text-indigo-400" />
            <h3 className="text-xl font-bold mb-2">AI 智能運算中</h3>
            <p className="text-indigo-200 animate-pulse font-mono min-h-[1.5rem]">{statusMessage}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm z-30 flex-none border-b border-gray-200">
        <div className="px-5 py-4 flex justify-between items-center">
          <div><h1 className="text-2xl font-bold text-indigo-600">旅遊人工智能 <span className="text-xs bg-indigo-100 px-2 rounded-full text-indigo-800">V20.21 ({tripMeta.country})</span></h1></div>
          <div className="flex gap-2">
            <button onClick={handleLogout} className="bg-gray-200 text-gray-500 p-2 rounded-full hover:bg-gray-300 transition" title="登出"><Lock size={16}/></button>
            <button onClick={generateItinerary} disabled={isGenerating} className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md flex gap-2 items-center hover:bg-indigo-700 disabled:bg-gray-400 transition-colors">
              <Wand2 size={16}/> AI 排行程
            </button>
          </div>
        </div>
        <div className="flex p-1 mx-4 mb-2 bg-slate-100 rounded-xl relative">
          <button onClick={() => setActiveTab('itinerary')} className={`flex-1 py-2 text-sm font-bold z-10 transition-all ${activeTab === 'itinerary' ? 'text-indigo-600 bg-white shadow-sm rounded-lg' : 'text-gray-500'}`}><MapIcon size={16} className="inline mr-1"/>行程</button>
          <button onClick={() => setActiveTab('finance')} className={`flex-1 py-2 text-sm font-bold z-10 transition-all ${activeTab === 'finance' ? 'text-indigo-600 bg-white shadow-sm rounded-lg' : 'text-gray-500'}`}><Calculator size={16} className="inline mr-1"/>記帳 ({tripMeta.currency})</button>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        {activeTab === 'itinerary' ? (
          <div className="flex flex-col md:flex-row h-full">
            {/* 行程列表 */}
            <div className="w-full md:w-[400px] bg-white h-1/2 md:h-full overflow-y-auto p-4 border-r custom-scrollbar">
              
              <div className="flex gap-3 mb-6 overflow-x-auto pb-4 pl-1">
                {Object.keys(tripData || {}).map(d => (
                  <button key={d} onClick={() => { setDay(parseInt(d)); setSelectedItem(null); }} 
                    className={`flex-none w-16 h-20 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 
                    ${day === parseInt(d) 
                      ? 'bg-[#6366F1] text-white shadow-lg shadow-indigo-500/40 scale-105' 
                      : 'bg-white text-gray-300 border border-gray-100 hover:bg-gray-50 hover:text-gray-400'}`}>
                    <span className="text-[10px] font-bold mb-1 opacity-80">Day</span>
                    <span className="text-3xl font-black italic tracking-tighter">{d}</span>
                  </button>
                ))}
              </div>

              <h2 className="font-bold text-xl mb-4 text-indigo-900 border-l-4 border-[#6366F1] pl-3 flex items-center justify-between">
                <span>Day {day}</span>
                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded-full">行程細節</span>
              </h2>
              
              <div className="space-y-4 pb-20">
                {tripData && tripData[day]?.items.map((item, i) => (
                  /* 卡片：移除右側 icon，加入點擊互動 */
                  <div key={i} 
                    onClick={() => setSelectedItem(i)}
                    className={`group cursor-pointer p-5 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg
                    ${selectedItem === i 
                      ? 'bg-indigo-50 border-indigo-300 shadow-md ring-2 ring-indigo-100' 
                      : 'bg-white border-gray-50 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]' 
                    }`}>
                    <div className="flex items-start gap-4">
                      {/* 時間膠囊 */}
                      <div className={`font-bold text-sm min-w-[50px] pt-1 ${selectedItem === i ? 'text-indigo-700' : 'text-[#6366F1]'}`}>{item.time}</div>
                      
                      <div className="flex-1 border-l-2 border-indigo-50 pl-4 relative">
                        <div className="flex justify-between items-start">
                           {/* 標題 (含 Emoji) */}
                           <div className={`font-bold text-lg leading-tight pr-2 ${selectedItem === i ? 'text-indigo-900' : 'text-slate-800'}`}>{item.title}</div>
                        </div>
                        <div className={`text-sm mt-2 leading-relaxed ${selectedItem === i ? 'text-indigo-600' : 'text-slate-500'}`}>{item.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {(!tripData[day]?.items || tripData[day].items.length === 0) && <div className="text-center text-gray-400 py-10">此日尚無規劃行程</div>}
              </div>
            </div>

            {/* 地圖區域 */}
            <div className="flex-1 bg-slate-200 relative">
              <div id="map" ref={mapRef} className="h-full w-full z-0"></div>
              {/* 智慧導航按鈕 */}
              <button onClick={openSmartMap} className={`absolute bottom-8 right-8 text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm z-[400] flex items-center gap-2 hover:scale-110 transition duration-300 active:scale-95 ${['KR', 'Korea', 'South Korea'].includes(tripMeta.country) ? 'bg-[#03C75A]' : 'bg-[#4285F4]'}`}>
                <Navigation size={18}/> 
                {selectedItem !== null 
                  ? `導航至：${tripData[day]?.items[selectedItem]?.title.substring(0, 5)}...` 
                  : (['KR', 'Korea', 'South Korea'].includes(tripMeta.country) ? 'Naver 導航 (市區)' : 'Google 導航 (市區)')
                }
              </button>
            </div>
          </div>
        ) : (
          /* 記帳頁面 */
          <div className="p-4 overflow-y-auto h-full max-w-md mx-auto space-y-5 pb-20">
             <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-indigo-50/50">
               <div className="relative mb-6">
                 <label className="block w-full bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] text-white py-5 rounded-2xl shadow-lg shadow-indigo-500/30 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all text-center font-bold text-lg flex items-center justify-center gap-3">
                    <ScanLine size={24} className="animate-pulse"/> 智慧掃描記帳
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isAnalyzing}/>
                 </label>
               </div>
               <div className="text-center mb-6">
                 <div className="text-gray-400 text-xs font-bold mb-2 tracking-widest uppercase">金額 ({tripMeta.currency})</div>
                 <div className="flex items-center justify-center gap-2 border-b-2 border-indigo-50 pb-4 mx-2">
                    <span className="text-4xl font-black text-indigo-300 pt-4">{tripMeta.symbol}</span>
                    <input type="number" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} className="text-7xl font-black w-full text-center outline-none placeholder-gray-100 text-[#4F46E5] bg-transparent" placeholder="0"/>
                 </div>
               </div>
               <div className="mb-8 px-2">
                 <input type="text" value={newExpense.note} onChange={e => setNewExpense({...newExpense, note: e.target.value})} className="w-full bg-gray-50 p-4 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition text-center font-bold text-gray-700 placeholder-gray-300" placeholder="輸入項目說明..."/>
               </div>
               <div className="grid grid-cols-3 gap-4 mb-8">
                 {['food', 'transport', 'shopping', 'hotel', 'ticket', 'other'].map(t => (
                   <button key={t} onClick={() => setNewExpense({...newExpense, type: t})} className={`aspect-square rounded-3xl flex flex-col items-center justify-center gap-2 transition-all duration-300 border-2 ${newExpense.type === t ? 'bg-[#EEF2FF] border-[#6366F1] text-[#6366F1] shadow-md scale-105' : 'bg-[#F8FAFC] border-transparent text-gray-400 hover:bg-white hover:shadow-sm'}`}>
                     {getCategoryIcon(t)}
                     <span className="text-sm font-bold tracking-wide">{categoryNames[t]}</span>
                   </button>
                 ))}
               </div>
               <button onClick={handleAddExpense} className="w-full bg-[#0F172A] text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition shadow-xl active:scale-95 tracking-wide text-lg">確認記帳</button>
             </div>
             
             <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 min-h-[200px]">
               <h4 className="font-bold text-gray-400 text-sm mb-6 flex items-center gap-2 px-2"><Wallet size={16}/> 最近消費</h4>
               <div className="space-y-4">
                 {expenses.map(ex => (
                   <div key={ex.id} className="flex justify-between items-center group hover:bg-gray-50 p-3 rounded-2xl transition-colors cursor-default">
                      <div className="flex gap-4 items-center">
                         <div className={`p-4 rounded-2xl transition-all ${getCategoryColor(ex.type)} bg-opacity-20 group-hover:scale-110`}>{getCategoryIcon(ex.type)}</div>
                         <div><div className="font-bold text-gray-800 text-lg">{ex.note}</div><div className="text-xs text-gray-400 font-mono mt-1">{ex.date}</div></div>
                      </div>
                      <div className="text-right"><div className="font-bold text-[#4F46E5] text-lg">NT$ {ex.amountTWD}</div><div className="text-xs text-gray-400 font-mono mt-1">{tripMeta.symbol} {ex.amountForeign}</div></div>
                   </div>
                 ))}
                 {expenses.length === 0 && <div className="text-center text-gray-300 py-12 flex flex-col items-center gap-3"><Sparkles className="text-gray-200" size={48}/>尚未有消費紀錄</div>}
               </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;