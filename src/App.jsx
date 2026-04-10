import React, { useState } from 'react';
import { Loader2, Copy, CheckCircle2, Video, Sparkles, Settings2, Image as ImageIcon, PenTool, Film, AlertTriangle } from 'lucide-react';

// Custom Icon untuk Facebook & Instagram
const Facebook = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
);

const Instagram = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>
);

const fetchWithRetry = async (url, options, retries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Auth Error: 401. Google tolak API key.`);
        }
        throw new Error(`HTTP Error: ${response.status} - Gagal menyambung ke API.`);
      }
      return await response.json();
    } catch (e) {
      if (i === retries - 1 || e.message.includes('Auth Error')) throw e;
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
  const [copiedStates, setCopiedStates] = useState({ fb: false, ig: false, tiktok: false, script: false, imagePrompt: false, hashtags: false });

  const generateAll = async () => {
    if (!prompt.trim()) {
      setError('Bro, masukkan idea dulu. Jangan biar kosong.');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);
    setActiveTab('copy'); 

    // --- API KEY (VERCEL READY) ---
    // PENTING UNTUK VERCEL/VS CODE: 
    // Padam komen (//) pada DUA baris di bawah sebelum push ke GitHub!
    const rawKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    const apiKey = rawKey.replace(/[\s'"]/g, '');


    if (!apiKey) {
      setError('Gagal: API Key kosong. Pastikan variable VITE_GEMINI_API_KEY telah diletak di Vercel.');
      setLoading(false);
      return;
    }

    try {
      const textUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

      const systemInstruction = `Anda adalah pakar media sosial, copywriter, dan pengarah video bertauliah dari Malaysia. Tugas anda adalah mengambil idea pengguna dan menghasilkan content marketing. Gunakan Bahasa Melayu untuk copywriting dan skrip.

      Hasilkan output HANYA dalam format JSON dengan struktur ini:
      1. fb: Copywriting panjang, storytelling.
      2. ig: Copywriting fokus visual, aesthetic, ada hashtag.
      3. tiktok_copy: Caption pendek TikTok.
      4. video_script: Array object berisi { "scene": "1", "visual": "Arahan kamera/visual", "audio_dialogue": "Skrip cakap/VO" }. Buat 3-5 scene pendek.
      5. image_prompt: WAJIB ADA. A highly detailed ENGLISH prompt to generate a high-quality marketing image based on the user's idea. Must not be empty.
      6. trending_hashtags: Senarai 5 hashtag yang relevan, viral, dan trending di Malaysia berkaitan idea ini. Format: Gabungkan semua hashtag dengan ruang (space).`;

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
              image_prompt: { type: "STRING", description: "Mandatory highly detailed English prompt for image generation." },
              trending_hashtags: { type: "STRING" }
            },
            required: ["fb", "ig", "tiktok_copy", "video_script", "image_prompt", "trending_hashtags"]
          }
        }
      };

      const textData = await fetchWithRetry(textUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(textPayload)
      });

      const textOutput = textData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textOutput) throw new Error("Format respons dari API Text tidak sah atau kosong.");
      
      let jsonResult;
      try {
        jsonResult = JSON.parse(textOutput.replace(/```json/g, '').replace(/```/g, '').trim());
      } catch (parseError) {
        throw new Error("Gagal parse JSON dari AI: " + textOutput.substring(0, 50) + "...");
      }

      setResults(jsonResult);
      setLoading(false); 

    } catch (err) {
      console.error("Ralat Utama:", err);
      if (err.message.includes('Auth Error') || err.message.includes('401') || err.message.includes('400')) {
        setError(`Ralat 401: Akses Ditolak. Vercel sedang membaca API Key yang bermula dengan "${apiKey.substring(0, 8)}...". Sila pastikan key ini aktif di Google AI Studio.`);
      } else {
        setError(err.message || 'Sistem mengalami gangguan yang tidak diketahui.');
      }
      setLoading(false);
    }
  };

  const copyToClipboard = (text, platform) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedStates(prev => ({ ...prev, [platform]: true }));
      setTimeout(() => setCopiedStates(prev => ({ ...prev, [platform]: false })), 2000);
    } catch (err) {
      console.error('Gagal copy', err);
    }
    document.body.removeChild(textArea);
  };

  const copyVideoScript = () => {
    if (!results?.video_script) return;
    const scriptText = results.video_script.map(s => `Scene ${s.scene}\nVisual: ${s.visual}\nAudio: ${s.audio_dialogue}\n`).join('\n');
    copyToClipboard(scriptText, 'script');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans pb-24">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg shadow-indigo-200 mb-2">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Omni<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Studio</span>
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
            Satu idea. AI uruskan semuanya — Copywriting, Gambar, dan Skrip Video.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              Apa idea content anda hari ni?
            </label>
            <textarea
              className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none text-slate-700"
              placeholder="Cth: Nak buat kempen merdeka untuk cafe. Promo kopi beli 1 percuma 1..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
            <div className="w-full md:w-1/3 space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Nada / Tone
              </label>
              <select 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-medium"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                <option value="Santai & Kasual">😎 Santai & Kasual</option>
                <option value="Profesional & Korporat">💼 Profesional & Korporat</option>
                <option value="Kelakar & Menghiburkan">😂 Kelakar & Menghiburkan</option>
                <option value="Hard Sell / Promosi">🔥 Hard Sell / Promosi</option>
              </select>
            </div>

            <button
              onClick={generateAll}
              disabled={loading}
              className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Sedang Menjana...</>
              ) : (
                <><Sparkles className="w-5 h-5" /> Generate Magic</>
              )}
            </button>
          </div>
          
          {/* Main Error Alert */}
          {error && (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold flex items-start gap-3">
               <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
               <div className="flex-1">
                 <p className="mb-1">Terdapat Ralat:</p>
                 <code className="text-xs bg-red-100 px-2 py-1 rounded block whitespace-pre-wrap">{error}</code>
               </div>
            </div>
          )}
        </div>

        {/* Results Area */}
        {results && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Tabs Navigation */}
            <div className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl w-full md:w-max mx-auto overflow-x-auto">
              {[
                { id: 'copy', icon: <PenTool className="w-4 h-4" />, label: 'Copywriting' },
                { id: 'image', icon: <ImageIcon className="w-4 h-4" />, label: 'Prompt Gambar' },
                { id: 'video', icon: <Film className="w-4 h-4" />, label: 'Skrip Video' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: COPYWRITING */}
            {activeTab === 'copy' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col bg-white rounded-3xl shadow-sm border border-blue-100 overflow-hidden">
                    <div className="p-4 border-b border-blue-50 bg-blue-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-blue-900"><Facebook className="w-5 h-5 text-blue-600" /> Facebook</div>
                      <button onClick={() => copyToClipboard(results.fb, 'fb')} className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold">
                        {copiedStates.fb ? <><CheckCircle2 className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
                      </button>
                    </div>
                    <div className="p-5 flex-1"><p className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">{results.fb}</p></div>
                  </div>

                  <div className="flex flex-col bg-white rounded-3xl shadow-sm border border-pink-100 overflow-hidden">
                    <div className="p-4 border-b border-pink-50 bg-pink-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-pink-900"><Instagram className="w-5 h-5 text-pink-600" /> Instagram</div>
                      <button onClick={() => copyToClipboard(results.ig, 'ig')} className="text-pink-600 hover:bg-pink-100 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold">
                        {copiedStates.ig ? <><CheckCircle2 className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
                      </button>
                    </div>
                    <div className="p-5 flex-1"><p className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">{results.ig}</p></div>
                  </div>

                  <div className="flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-slate-900"><Video className="w-5 h-5 text-black" /> TikTok Caption</div>
                      <button onClick={() => copyToClipboard(results.tiktok_copy, 'tiktok')} className="text-slate-600 hover:bg-slate-200 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold">
                        {copiedStates.tiktok ? <><CheckCircle2 className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
                      </button>
                    </div>
                    <div className="p-5 flex-1"><p className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">{results.tiktok_copy}</p></div>
                  </div>
                </div>

                {/* Trending Hashtags Section */}
                {results.trending_hashtags && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                    <div className="flex-1 space-y-1">
                      <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        Trending Hashtags (Malaysia)
                      </h4>
                      <p className="text-sm font-medium text-indigo-700 whitespace-pre-wrap leading-relaxed">
                        {results.trending_hashtags}
                      </p>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(results.trending_hashtags, 'hashtags')} 
                      className="shrink-0 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors flex items-center gap-2 text-sm font-bold shadow-sm w-full md:w-auto justify-center"
                    >
                      {copiedStates.hashtags ? <><CheckCircle2 className="w-4 h-4 text-green-600" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Hashtags</>}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: IMAGE PROMPT */}
            {activeTab === 'image' && (
              results.image_prompt ? (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                   <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-800">Prompt Gambar (Midjourney / DALL-E)</h3>
                        <p className="text-sm text-slate-500">Copy prompt bahasa Inggeris ni dan paste kat AI pelukis kegemaran kau.</p>
                      </div>
                      <button onClick={() => copyToClipboard(results.image_prompt, 'imagePrompt')} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl transition-colors flex items-center gap-2 text-sm font-bold shadow-sm">
                        {copiedStates.imagePrompt ? <><CheckCircle2 className="w-4 h-4 text-green-600" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Prompt</>}
                      </button>
                   </div>
                   <div className="p-6">
                      <div className="bg-slate-900 text-green-400 font-mono text-sm p-6 rounded-2xl overflow-x-auto shadow-inner border border-slate-800">
                         <p className="whitespace-pre-wrap leading-relaxed">{results.image_prompt}</p>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 text-center flex flex-col items-center justify-center">
                  <AlertTriangle className="w-12 h-12 text-orange-400 mb-4" />
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Prompt Tak Berjaya Dijana</h3>
                  <p className="text-slate-500 max-w-md">
                    Nampaknya AI terlepas pandang nak hasilkan prompt gambar untuk kau kali ni. Benda ni kadang-kadang jadi. Cuba tekan butang <b>Generate Magic</b> tu sekali lagi bro!
                  </p>
                </div>
              )
            )}

            {/* TAB CONTENT: VIDEO SCRIPT */}
            {activeTab === 'video' && results.video_script && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-800">Skrip Video Pendek (Reels/TikTok)</h3>
                      <p className="text-sm text-slate-500">Gunakan skrip ni untuk shoot video atau prompt ke AI Video Generator.</p>
                    </div>
                    <button onClick={copyVideoScript} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl transition-colors flex items-center gap-2 text-sm font-bold shadow-sm">
                      {copiedStates.script ? <><CheckCircle2 className="w-4 h-4 text-green-600" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Semua</>}
                    </button>
                 </div>
                 <div className="p-6 space-y-6">
                    {results.video_script.map((scene, index) => (
                      <div key={index} className="flex gap-4 md:gap-6 relative">
                        {index !== results.video_script.length - 1 && (
                          <div className="absolute left-6 top-12 bottom-[-24px] w-[2px] bg-indigo-100 hidden md:block"></div>
                        )}
                        <div className="w-12 h-12 rounded-full bg-indigo-50 border-2 border-indigo-100 text-indigo-600 font-extrabold flex items-center justify-center shrink-0 z-10 hidden md:flex">
                          {scene.scene}
                        </div>
                        <div className="flex-1 bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                           <div className="flex items-center gap-2 mb-2 md:hidden">
                             <span className="bg-indigo-100 text-indigo-700 text-xs font-black px-2 py-1 rounded-md">SCENE {scene.scene}</span>
                           </div>
                           <div>
                             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Visual / Kamera</span>
                             <p className="text-sm text-slate-700 font-medium mt-1">{scene.visual}</p>
                           </div>
                           <div className="pt-2 border-t border-slate-200">
                             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Film className="w-3 h-3" /> Skrip / Audio</span>
                             <p className="text-sm text-slate-800 font-bold mt-1 text-lg">"{scene.audio_dialogue}"</p>
                           </div>
                        </div>
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