import React, { useState } from 'react';
import { Loader2, Copy, CheckCircle2, Video, Sparkles, Settings2, Image as ImageIcon, PenTool, Film, AlertTriangle, Cpu } from 'lucide-react';

// Ikon Tersuai (Facebook & Instagram)
const Facebook = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
);

const Instagram = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>
);

// Fungsi Fetch dengan Exponential Backoff
const fetchWithRetry = async (url, options, retries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Auth Error: 401. API Key anda tidak sah atau telah dihadkan.`);
        }
        if (response.status === 404) {
          throw new Error(`Model Error: 404. Model AI ini tidak menyokong API Key anda.`);
        }
        throw new Error(`HTTP Error: ${response.status} - ${errorData?.error?.message || 'Gagal menyambung ke API'}`);
      }
      return await response.json();
    } catch (e) {
      if (i === retries - 1 || e.message.includes('Auth Error') || e.message.includes('Model Error')) throw e;
      await new Promise(res => setTimeout(res, delays[i]));
    }
  }
};

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('Santai & Kasual');
  const [model, setModel] = useState('gemini-1.5-flash'); 
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('copy'); 
  const [copiedStates, setCopiedStates] = useState({});

  const generateAll = async () => {
    if (!prompt.trim()) {
      setError('Sila masukkan idea content anda terlebih dahulu.');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);
    setActiveTab('copy'); 

    // PENGURUSAN API KEY (Vite & Vercel Ready)
    // Menggunakan fungsi pembantu untuk mengelakkan ralat 'import.meta' dalam persekitaran ES2015
    const getSafeApiKey = () => {
      try {
        // @ts-ignore
        return import.meta.env.VITE_GEMINI_API_KEY || '';
      } catch (e) {
        return '';
      }
    };

    const rawKey = getSafeApiKey();
    const apiKey = rawKey.replace(/[\s'"]/g, '');

    if (!apiKey) {
      setError('Ralat: API Key tidak dijumpai. Sila pastikan VITE_GEMINI_API_KEY telah ditetapkan dalam Settings Vercel.');
      setLoading(false);
      return;
    }

    try {
      const textUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const systemInstruction = `Anda adalah pakar pemasaran media sosial Malaysia. Hasilkan content marketing yang viral dalam Bahasa Melayu.
      Output MESTI dalam format JSON sahaja:
      1. fb: Copywriting panjang (storytelling).
      2. ig: Copywriting visual, aesthetic & kreatif.
      3. tiktok_copy: Caption pendek, padu & catchy.
      4. video_script: Skrip video 3-5 scene (Visual & Audio).
      5. image_prompt: Prompt bahasa Inggeris yang detail untuk AI Image Generator.
      6. trending_hashtags: 5 hashtag trending di Malaysia.`;

      const textPayload = {
        contents: [{ parts: [{ text: `Idea: ${prompt}\nNada: ${tone}` }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              fb: { type: "STRING" },
              ig: { type: "STRING" },
              tiktok_copy: { type: "STRING" },
              video_script: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    scene: { type: "STRING" },
                    visual: { type: "STRING" },
                    audio_dialogue: { type: "STRING" }
                  }
                }
              },
              image_prompt: { type: "STRING" },
              trending_hashtags: { type: "STRING" }
            },
            required: ["fb", "ig", "tiktok_copy", "video_script", "image_prompt", "trending_hashtags"]
          }
        }
      };

      const data = await fetchWithRetry(textUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(textPayload)
      });

      const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textOutput) throw new Error("AI tidak memulangkan sebarang jawapan.");
      
      setResults(JSON.parse(textOutput));
      setLoading(false); 

    } catch (err) {
      console.error("Ralat Sistem:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    try {
      document.execCommand('copy');
      setCopiedStates({ ...copiedStates, [key]: true });
      setTimeout(() => setCopiedStates({ ...copiedStates, [key]: false }), 2000);
    } catch (e) {
      console.error("Gagal menyalin teks.");
    }
    document.body.removeChild(el);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans pb-20">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200 mb-2">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Omni<span className="text-indigo-600">Studio</span>
          </h1>
          <p className="text-slate-500 text-lg font-medium">Ubah idea anda menjadi content profesional dalam saat.</p>
        </div>

        {/* Input Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600">Apa idea content anda hari ini?</label>
            <textarea
              className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all resize-none outline-none"
              placeholder="Contoh: Promo raya cafe saya, beli 1 percuma 1 untuk menu Latte..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Model AI</label>
              <select 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Terpantas)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Paling Bijak)</option>
                <option value="gemini-pro">Gemini Pro (Versi Lama)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Nada Penulisan</label>
              <select 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                <option value="Santai & Kasual">😎 Santai & Kasual</option>
                <option value="Profesional">💼 Profesional</option>
                <option value="Hard Sell / Promosi">🔥 Hard Sell</option>
                <option value="Kelakar">😂 Menghiburkan</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={generateAll}
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Sedang Menjana...</> : <><Sparkles className="w-5 h-5" /> Generate Magic</>}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold flex gap-3 animate-pulse">
               <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
               <p>{error}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        {results && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex gap-2 p-1 bg-slate-200 rounded-2xl w-max mx-auto overflow-x-auto">
              {[
                { id: 'copy', label: 'Copywriting', icon: <PenTool className="w-4 h-4"/> },
                { id: 'image', label: 'Prompt Gambar', icon: <ImageIcon className="w-4 h-4"/> },
                { id: 'video', label: 'Skrip Video', icon: <Film className="w-4 h-4"/> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Copywriting */}
            {activeTab === 'copy' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: 'fb', label: 'Facebook', icon: <Facebook className="w-4 h-4 text-blue-600"/>, content: results.fb, color: 'blue' },
                  { id: 'ig', label: 'Instagram', icon: <Instagram className="w-4 h-4 text-pink-600"/>, content: results.ig, color: 'pink' },
                  { id: 'tk', label: 'TikTok', icon: <Video className="w-4 h-4 text-black"/>, content: results.tiktok_copy, color: 'slate' }
                ].map(item => (
                  <div key={item.id} className="bg-white rounded-3xl border border-slate-200 flex flex-col h-full overflow-hidden shadow-sm">
                    <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                      <span className="font-bold text-slate-800 flex items-center gap-2">{item.icon} {item.label}</span>
                      <button onClick={() => copyToClipboard(item.content, item.id)} className="text-xs font-black text-indigo-600 hover:text-indigo-800 uppercase">
                        {copiedStates[item.id] ? <CheckCircle2 className="w-4 h-4 text-green-600"/> : 'Copy'}
                      </button>
                    </div>
                    <div className="p-5 flex-1 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {item.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Image Prompt */}
            {activeTab === 'image' && (
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 bg-slate-50 flex justify-between items-center border-b">
                  <h3 className="font-bold text-slate-800">Prompt Gambar (Guna AI Pelukis)</h3>
                  <button onClick={() => copyToClipboard(results.image_prompt, 'img')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2">
                    {copiedStates.img ? <CheckCircle2 className="w-4 h-4"/> : <Copy className="w-4 h-4"/>} 
                    {copiedStates.img ? 'Tersalin' : 'Salin Prompt'}
                  </button>
                </div>
                <div className="p-6">
                  <p className="text-sm text-slate-500 mb-4 font-medium italic">Sila salin prompt bahasa Inggeris di bawah ke Midjourney, Leonardo, atau DALL-E:</p>
                  <div className="bg-slate-900 text-green-400 p-6 rounded-2xl font-mono text-sm leading-relaxed border border-slate-800 shadow-inner">
                    {results.image_prompt}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Video Script */}
            {activeTab === 'video' && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Film className="w-5 h-5 text-indigo-600"/> Skrip Video Pendek</h3>
                {results.video_script.map((s, i) => (
                  <div key={i} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
                    <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">Scene {s.scene}</p>
                    <p className="text-sm text-slate-600">🎥 <b>Visual:</b> {s.visual}</p>
                    <p className="text-base font-bold text-slate-900">🎤 <b>Audio:</b> "{s.audio_dialogue}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}