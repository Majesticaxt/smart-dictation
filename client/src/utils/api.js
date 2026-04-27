/**
 * API utility — Axios instance for backend calls.
 * Uses /api (relative) which works on Vercel.
 * Vite proxies /api → localhost:3001 during local development.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

/**
 * Send text to backend for AI-powered cleanup via Groq.
 * @param {string} text - Text to clean
 * @returns {Promise<string>} Cleaned text
 */
export async function cleanTextWithAI(text) {
  const response = await api.post('/clean', { text });
  return response.data.text;
}

export default api;
