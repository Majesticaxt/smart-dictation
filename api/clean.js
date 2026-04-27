import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY not configured in Vercel environment variables.' });
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a text editor. Your job is to clean up dictated speech text. Do the following:
1. Fix grammar and sentence structure
2. Add proper punctuation (commas, full stops, question marks)
3. Remove filler words (um, uh, like, you know, basically, literally, I mean, sort of, kind of)
4. Remove repeated words or stutters
5. Fix capitalization
6. Keep the original meaning completely unchanged
7. Do NOT add any new content or change the speaker's intent
8. Output ONLY the cleaned text — no explanations, no quotes, no prefixes.`,
        },
        { role: 'user', content: text },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.2,
      max_tokens: 2048,
    });

    const cleanedText = chatCompletion.choices[0]?.message?.content?.trim();

    if (!cleanedText) {
      return res.status(500).json({ error: 'AI returned empty response' });
    }

    res.json({ text: cleanedText });
  } catch (error) {
    console.error('Clean API error:', error.message);
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Try again in a moment.' });
    }
    res.status(500).json({ error: 'Failed to clean text.' });
  }
}
