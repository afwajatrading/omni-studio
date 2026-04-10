import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Film,
  Image as ImageIcon,
  Loader2,
  PenTool,
  Sparkles,
  Video,
} from 'lucide-react';

const Facebook = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const Instagram = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const fetchWithRetry = async (url, options, retries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];

  for (let i = 0; i < retries; i += 1) {
    try {
      const response = await fetch(url, options);
      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Auth Error: ${responseData?.error || 'Akses ke Gemini API ditolak.'}`);
        }

        if (response.status === 404) {
          throw new Error(`Model Error: ${responseData?.error || 'Model AI tidak dijumpai.'}`);
        }

        throw new Error(responseData?.error || `HTTP Error: ${response.status}`);
      }

      return responseData;
    } catch (error) {
      if (
        i === retries - 1 ||
        error.message.includes('Auth Error') ||
        error.message.includes('Model Error')
      ) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delays[i]));
    }
  }

  throw new Error('Permintaan gagal selepas beberapa cubaan.');
};

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('Santai & Kasual');
  const [model, setModel] = useState('gemini-2.5-flash');
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

    try {
      const data = await fetchWithRetry('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, tone, model }),
      });

      setResults(data);
    } catch (err) {
      console.error('Ralat Sistem:', err);

      if (err.message.includes('Auth Error')) {
        setError('Akses ke Gemini API ditolak. Di Vercel, tetapkan `GEMINI_API_KEY` yang sah dan redeploy semula.');
      } else if (err.message.includes('Model Error')) {
        setError(`Model "${model}" tidak tersedia untuk API key ini. Cuba tukar model lain dalam dropdown.`);
      } else {
        setError(err.message || 'Sistem mengalami gangguan yang tidak diketahui.');
      }
    } finally {
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
      setCopiedStates((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    } catch {
      console.error('Gagal menyalin teks.');
    }

    document.body.removeChild(el);
  };

  const copyVideoScript = () => {
    if (!results?.video_script?.length) return;

    const scriptText = results.video_script
      .map(
        (scene) =>
          `Scene ${scene.scene}\nVisual: ${scene.visual}\nAudio: "${scene.audio_dialogue}"`
      )
      .join('\n\n');

    copyToClipboard(scriptText, 'video-script');
  };

  const copyAllCopywriting = () => {
    if (!results) return;

    const sections = [
      `Facebook\n${results.fb || ''}`,
      `Instagram\n${results.ig || ''}`,
      `TikTok\n${results.tiktok_copy || ''}`,
      results.trending_hashtags ? `Hashtags\n${results.trending_hashtags}` : null,
    ].filter(Boolean);

    copyToClipboard(sections.join('\n\n'), 'copy-all');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-20 font-sans text-slate-800 md:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="space-y-3 text-center">
          <div className="mb-2 inline-flex rounded-2xl bg-indigo-600 p-3 shadow-xl shadow-indigo-200">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            Omni<span className="text-indigo-600">Studio</span>
          </h1>
          <p className="text-lg font-medium text-slate-500">
            Ubah idea anda menjadi content profesional dalam saat.
          </p>
        </div>

        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600">Apa idea content anda hari ini?</label>
            <textarea
              className="h-32 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none transition-all focus:ring-2 focus:ring-indigo-500"
              placeholder="Contoh: Promo raya cafe saya, beli 1 percuma 1 untuk menu Latte..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
                Model AI
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Disyorkan)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Lebih Kuat)</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
                Nada Penulisan
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                <option value="Santai & Kasual">Santai & Kasual</option>
                <option value="Profesional">Profesional</option>
                <option value="Hard Sell / Promosi">Hard Sell / Promosi</option>
                <option value="Kelakar">Menghiburkan</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={generateAll}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-bold text-white shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sedang Menjana...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate Magic
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 animate-pulse">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {results && (
          <div className="animate-in slide-in-from-bottom-4 space-y-6 fade-in duration-500">
            <div className="mx-auto flex w-max gap-2 overflow-x-auto rounded-2xl bg-slate-200 p-1">
              {[
                { id: 'copy', label: 'Copywriting', icon: <PenTool className="h-4 w-4" /> },
                { id: 'image', label: 'Prompt Gambar', icon: <ImageIcon className="h-4 w-4" /> },
                { id: 'video', label: 'Skrip Video', icon: <Film className="h-4 w-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-xl px-6 py-2 text-sm font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'copy' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Copywriting Siap Guna</h3>
                    <p className="text-sm text-slate-500">Salin satu platform atau ambil semuanya sekali gus.</p>
                  </div>
                  <button
                    onClick={copyAllCopywriting}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
                  >
                    {copiedStates['copy-all'] ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copiedStates['copy-all'] ? 'Tersalin' : 'Copy Semua'}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {[
                    {
                      id: 'fb',
                      label: 'Facebook',
                      icon: <Facebook className="h-4 w-4 text-blue-600" />,
                      content: results.fb,
                    },
                    {
                      id: 'ig',
                      label: 'Instagram',
                      icon: <Instagram className="h-4 w-4 text-pink-600" />,
                      content: results.ig,
                    },
                    {
                      id: 'tk',
                      label: 'TikTok',
                      icon: <Video className="h-4 w-4 text-black" />,
                      content: results.tiktok_copy,
                    },
                  ].map((item) => (
                    <div
                      key={item.id}
                      className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b bg-slate-50 p-4">
                        <span className="flex items-center gap-2 font-bold text-slate-800">
                          {item.icon}
                          {item.label}
                        </span>
                        <button
                          onClick={() => copyToClipboard(item.content, item.id)}
                          className="text-xs font-black uppercase text-indigo-600 hover:text-indigo-800"
                        >
                          {copiedStates[item.id] ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            'Copy'
                          )}
                        </button>
                      </div>
                      <div className="flex-1 whitespace-pre-wrap p-5 text-sm leading-relaxed text-slate-700">
                        {item.content}
                      </div>
                    </div>
                  ))}
                </div>

                {results.trending_hashtags && (
                  <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-base font-bold text-indigo-900">Hashtag Cadangan</h4>
                        <p className="text-sm text-indigo-700">Hashtag ini boleh terus dipakai untuk caption atau posting.</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(results.trending_hashtags, 'hashtags')}
                        className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-700"
                      >
                        {copiedStates.hashtags ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copiedStates.hashtags ? 'Tersalin' : 'Copy Hashtag'}
                      </button>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm font-medium leading-relaxed text-indigo-900">
                      {results.trending_hashtags}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'image' && (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b bg-slate-50 p-6">
                  <h3 className="font-bold text-slate-800">Prompt Gambar (Guna AI Pelukis)</h3>
                  <button
                    onClick={() => copyToClipboard(results.image_prompt, 'img')}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
                  >
                    {copiedStates.img ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedStates.img ? 'Tersalin' : 'Salin Prompt'}
                  </button>
                </div>
                <div className="p-6">
                  <p className="mb-4 text-sm font-medium italic text-slate-500">
                    Sila salin prompt bahasa Inggeris di bawah ke Midjourney, Leonardo, atau DALL-E:
                  </p>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 font-mono text-sm leading-relaxed text-green-400 shadow-inner">
                    {results.image_prompt}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'video' && (
              <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                    <Film className="h-5 w-5 text-indigo-600" />
                    Skrip Video Pendek
                  </h3>
                  <button
                    onClick={copyVideoScript}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
                  >
                    {copiedStates['video-script'] ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copiedStates['video-script'] ? 'Tersalin' : 'Copy Skrip'}
                  </button>
                </div>
                {results.video_script.map((scene, index) => (
                  <div
                    key={index}
                    className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <p className="text-xs font-black uppercase tracking-widest text-indigo-600">
                      Scene {scene.scene}
                    </p>
                    <p className="text-sm text-slate-600">
                      <b>Visual:</b> {scene.visual}
                    </p>
                    <p className="text-base font-bold text-slate-900">
                      <b>Audio:</b> "{scene.audio_dialogue}"
                    </p>
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
