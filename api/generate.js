const DEFAULT_MODEL = 'gemini-1.5-flash';
const ALLOWED_MODELS = new Set([
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
]);

const SYSTEM_INSTRUCTION = `Anda adalah pakar pemasaran media sosial Malaysia. Hasilkan content marketing yang viral dalam Bahasa Melayu.
Output MESTI dalam format JSON sahaja:
1. fb: Copywriting panjang (storytelling).
2. ig: Copywriting visual, aesthetic & kreatif.
3. tiktok_copy: Caption pendek, padu & catchy.
4. video_script: Skrip video 3-5 scene (Visual & Audio).
5. image_prompt: Prompt bahasa Inggeris yang detail untuk AI Image Generator.
6. trending_hashtags: 5 hashtag trending di Malaysia.`;

const getMappedApiError = (message) => {
  const normalized = String(message || '').toLowerCase();

  if (normalized.includes('api key expired')) {
    return {
      status: 401,
      error: 'API key Gemini telah tamat tempoh. Jana key baru di Google AI Studio, kemas kini `GEMINI_API_KEY` di Vercel, kemudian redeploy semula.',
    };
  }

  if (normalized.includes('api key not valid')) {
    return {
      status: 401,
      error: 'API key Gemini tidak sah. Semak semula key di Google AI Studio dan kemas kini `GEMINI_API_KEY` di Vercel.',
    };
  }

  return null;
};

const buildPayload = (prompt, tone) => ({
  contents: [{ parts: [{ text: `Idea: ${prompt}\nNada: ${tone}` }] }],
  systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'OBJECT',
      properties: {
        fb: { type: 'STRING' },
        ig: { type: 'STRING' },
        tiktok_copy: { type: 'STRING' },
        video_script: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              scene: { type: 'STRING' },
              visual: { type: 'STRING' },
              audio_dialogue: { type: 'STRING' },
            },
          },
        },
        image_prompt: { type: 'STRING' },
        trending_hashtags: { type: 'STRING' },
      },
      required: ['fb', 'ig', 'tiktok_copy', 'video_script', 'image_prompt', 'trending_hashtags'],
    },
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY belum ditetapkan pada server.',
    });
  }

  const { prompt = '', tone = 'Santai & Kasual', model = DEFAULT_MODEL } = req.body ?? {};
  if (!prompt.trim()) {
    return res.status(400).json({ error: 'Prompt diperlukan.' });
  }

  const selectedModel = ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(prompt, tone)),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const apiMessage = data?.error?.message || 'Gagal menyambung ke Gemini API.';
      const mappedError = getMappedApiError(apiMessage);

      if (mappedError) {
        return res.status(mappedError.status).json({
          error: mappedError.error,
        });
      }

      return res.status(response.status).json({
        error: apiMessage,
      });
    }

    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) {
      return res.status(502).json({
        error: 'Gemini tidak memulangkan jawapan.',
      });
    }

    try {
      const parsed = JSON.parse(textOutput.replace(/```json/g, '').replace(/```/g, '').trim());
      return res.status(200).json(parsed);
    } catch {
      return res.status(502).json({
        error: 'Respons Gemini bukan JSON yang sah.',
      });
    }
  } catch {
    return res.status(500).json({
      error: 'Ralat dalaman semasa menghubungi Gemini API.',
    });
  }
}
