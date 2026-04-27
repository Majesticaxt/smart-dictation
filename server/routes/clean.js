import { Router } from 'express';
import Groq from 'groq-sdk';

const router = Router();

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * POST /clean
 * Accepts { text: "..." } and returns AI-cleaned text.
 * Uses Groq's free tier with Llama model.
 */
router.post('/', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Check if API key is configured
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'gsk_your_key_here') {
      return res.status(500).json({
        error: 'GROQ_API_KEY not configured. Get a free key at https://console.groq.com/keys',
      });
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
        {
          role: 'user',
          content: text,
        },
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
    console.error('Clean route error:', error.message);

    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Wait a moment and try again.' });
    }

    res.status(500).json({ error: 'Failed to clean text. The local fallback will be used.' });
  }
});

export { router as cleanRoute };
