import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { cleanRoute } from './routes/clean.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/clean', cleanRoute);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Smart Dictation API running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🎙️  Smart Dictation API running on http://localhost:${PORT}`);
  console.log(`   POST /clean — AI text cleanup via Groq\n`);
});
