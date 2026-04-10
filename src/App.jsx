import React, { useState } from 'react';
import { Loader2, Copy, CheckCircle2, Video, Sparkles, Settings2, Image as ImageIcon, PenTool, Film, AlertTriangle } from 'lucide-react';

// Custom Icon untuk elak isu missing export lucide-react
const Facebook = ({ className }) => (
  <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
);

const Instagram = ({ className }) => (
  <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>
);

// Fungsi retry untuk elak API gagal sesaat + Tangkap exact error Google
const fetchWithRetry = async (url, options, retries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        // Ambil JSON ralat sebenar dari Google supaya kita tahu apa puncanya
        const errorData = await response.json().catch(() => ({}));
        const googleErrorMsg = errorData?.error?.message || 'Sila check API Key atau format payload';
        
        if (response.status === 401 || response.status === 403) throw new Error(`Auth Error: ${response.status} - ${googleErrorMsg}`);
        throw new Error(`HTTP Error ${response.status}: ${googleErrorMsg}`);
      }
      return await response.json();
    } catch (e) {
      if (i === retries - 1 || e.message.includes('Auth Error') || e.message.includes('HTTP Error 400') || e.message.includes('HTTP Error 404')) throw e;
      await new Promise(res => setTimeout(res, delays[i]));
    }
  }
};

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('Santai & Kasual');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('copy'); 
  const [copiedStates, setCopiedStates] = useState({});

  const generateAll = async () => {
    if (!prompt.trim()) {
      setError('Bro, masukkan idea dulu. Jangan biar kosong.');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);
    setActiveTab('copy'); 

    // BACA API KEY DARI .env DAN CUCI HABIS-HABISAN (Buang space, tab, newline \r \n)
    const rawKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    const apiKey = rawKey.replace(/\s+/g, '');

    if (!apiKey || apiKey.includes('LetakKeyGoogleKauKatSini')) {
      setError('Gagal: API Key nampak macam tak betul. Sila masukkan key sebenar kat dalam fail .env dan restart server.');
      setLoading(false);
      return;
    }

    try {
      // PENTING: Guna model gemini-2.5-flash sebab model 1.5 mungkin dah tak dijumpai (404)
      const textUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const systemInstruction = `Anda adalah pakar media sosial, copywriter, dan pengarah video bertauliah dari Malaysia. Tugas anda adalah mengambil idea pengguna dan menghasilkan content marketing. Gunakan Bahasa Melayu untuk copywriting dan skrip.
      Hasilkan output HANYA dalam format JSON:
      1. fb: Copywriting panjang, storytelling.
      2. ig: Copywriting fokus visual, ada hashtag.
      3. tiktok_copy: Caption pendek TikTok.
      4. video_script: Array object berisi { "scene": "1", "visual": "Arahan", "audio_dialogue": "Skrip" }.
      5. image_prompt: WAJIB ADA. A highly detailed ENGLISH prompt for Midjourney/DALL-E.
      6. trending_hashtags: 5 hashtag trending Malaysia dipisahkan dengan ruang.`;

      const textPayload = {
        contents: [{ parts: [{ text: `Idea: ${prompt}\nNada/Tone: ${tone}` }] }],
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

      const response = await fetchWithRetry(textUrl, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(textPayload) 
      });
      
      const textOutput = response.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textOutput) throw new Error("API tidak memulangkan sebarang teks.");

      // Cuci format markdown kalau AI return ```json ... ```
      let cleanJson = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      
      setResults(JSON.parse(cleanJson));
      setLoading(false); 

    } catch (err) {
      console.error("Ralat penuh:", err);
      // Paparkan error sebenar dari Google
      setError(`${err.message}`);
      setLoading(false);
    }
  };

  const copyToClipboard = (text, platform) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    setCopiedStates(prev => ({ ...prev, [platform]: true }));
    setTimeout(() => setCopiedStates(prev => ({ ...prev, [platform]: false })), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans pb-24">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg shadow-indigo-200 mb-2">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">Omni<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Studio</span></h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">Satu idea. AI uruskan semuanya — Copywriting, Gambar, dan Skrip Video.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
          <textarea className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Cth: Nak buat kempen merdeka untuk cafe..." value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <select className="w-full md:w-1/3 p-3 bg-slate-50 border border-slate-200 rounded-xl" value={tone} onChange={(e) => setTone(e.target.value)}>
              <option value="Santai & Kasual">😎 Santai & Kasual</option>
              <option value="Profesional & Korporat">💼 Profesional & Korporat</option>
              <option value="Kelakar & Menghiburkan">😂 Kelakar & Menghiburkan</option>
              <option value="Hard Sell / Promosi">🔥 Hard Sell / Promosi</option>
            </select>
            <button onClick={generateAll} disabled={loading} className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:to-purple-700 text-white rounded-xl font-bold flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Menjana...</> : <><Sparkles className="w-5 h-5" /> Generate Magic</>}
            </button>
          </div>
          {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-bold flex items-start gap-3"><AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />{error}</div>}
        </div>

        {results && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl w-full md:w-max mx-auto overflow-x-auto">
              {[ { id: 'copy', icon: <PenTool className="w-4 h-4"/>, label: 'Copywriting' }, { id: 'image', icon: <ImageIcon className="w-4 h-4"/>, label: 'Prompt Gambar' }, { id: 'video', icon: <Film className="w-4 h-4"/>, label: 'Skrip Video' } ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{tab.icon} {tab.label}</button>
              ))}
            </div>

            {activeTab === 'copy' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* FB */}
                  <div className="bg-white rounded-3xl border border-blue-100 overflow-hidden flex flex-col">
                    <div className="p-4 bg-blue-50/50 flex justify-between"><div className="font-bold flex items-center gap-2"><Facebook className="w-5 h-5 text-blue-600" /> Facebook</div><button onClick={() => copyToClipboard(results.fb, 'fb')} className="text-blue-600 text-xs font-bold">{copiedStates.fb ? 'Copied' : 'Copy'}</button></div>
                    <div className="p-5 flex-1 whitespace-pre-wrap text-sm text-slate-700">{results.fb}</div>
                  </div>
                  {/* IG */}
                  <div className="bg-white rounded-3xl border border-pink-100 overflow-hidden flex flex-col">
                    <div className="p-4 bg-pink-50/50 flex justify-between"><div className="font-bold flex items-center gap-2"><Instagram className="w-5 h-5 text-pink-600" /> Instagram</div><button onClick={() => copyToClipboard(results.ig, 'ig')} className="text-pink-600 text-xs font-bold">{copiedStates.ig ? 'Copied' : 'Copy'}</button></div>
                    <div className="p-5 flex-1 whitespace-pre-wrap text-sm text-slate-700">{results.ig}</div>
                  </div>
                  {/* TikTok */}
                  <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-4 bg-slate-50 flex justify-between"><div className="font-bold flex items-center gap-2"><Video className="w-5 h-5" /> TikTok</div><button onClick={() => copyToClipboard(results.tiktok_copy, 'tk')} className="text-slate-600 text-xs font-bold">{copiedStates.tk ? 'Copied' : 'Copy'}</button></div>
                    <div className="p-5 flex-1 whitespace-pre-wrap text-sm text-slate-700">{results.tiktok_copy}</div>
                  </div>
                </div>
                {results.trending_hashtags && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-5 flex justify-between items-center">
                    <div><h4 className="font-bold text-indigo-900">Trending Hashtags</h4><p className="text-sm text-indigo-700">{results.trending_hashtags}</p></div>
                    <button onClick={() => copyToClipboard(results.trending_hashtags, 'hash')} className="bg-white px-4 py-2 rounded-xl text-indigo-700 text-sm font-bold shadow-sm">{copiedStates.hash ? 'Copied!' : 'Copy'}</button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'image' && (
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                 <div className="p-6 bg-slate-50/50 flex justify-between items-center">
                    <div><h3 className="font-extrabold">Prompt Gambar</h3><p className="text-sm text-slate-500">Copy & paste kat Midjourney / DALL-E</p></div>
                    <button onClick={() => copyToClipboard(results.image_prompt, 'img')} className="bg-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm border border-slate-200">{copiedStates.img ? 'Copied!' : 'Copy Prompt'}</button>
                 </div>
                 <div className="p-6"><div className="bg-slate-900 text-green-400 p-6 rounded-2xl text-sm font-mono whitespace-pre-wrap">{results.image_prompt}</div></div>
              </div>
            )}

            {activeTab === 'video' && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="font-extrabold text-lg">Skrip Video (Reels/TikTok)</h3>
                    <button onClick={() => copyToClipboard(JSON.stringify(results.video_script), 'vid')} className="bg-white border px-4 py-2 rounded-xl font-bold shadow-sm text-sm">{copiedStates.vid ? 'Copied!' : 'Copy Semua'}</button>
                 </div>
                 <div className="space-y-4">
                    {results.video_script.map((s, i) => (
                      <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                         <span className="bg-indigo-100 text-indigo-700 text-xs font-black px-2 py-1 rounded-md mb-2 inline-block">SCENE {s.scene}</span>
                         <p className="text-sm text-slate-600 mb-2">🎥 {s.visual}</p>
                         <p className="text-base text-slate-800 font-bold">🎤 "{s.audio_dialogue}"</p>
                      </div>
                    ))}
                 </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}