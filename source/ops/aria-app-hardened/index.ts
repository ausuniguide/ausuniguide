// @ts-nocheck
// ARIA chat endpoint for the UniPath Australia Android app — hardened 2026-09-24.
// Changes vs v11: server-owned system prompt (client `system` ignored), message size/count caps,
// persistent Postgres rate limits (per device, per IP, global) instead of an in-memory Map.
// Response contract unchanged: { text, reply, remaining } / 402 requiresUpgrade / 429.
// TODO(next): verify premium server-side via RevenueCat REST (needs REVENUECAT_SECRET secret) instead of trusting isPremium.
import { createClient } from 'npm:@supabase/supabase-js@2';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_KEY') ?? '';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

const PREMIUM_DAILY_LIMIT = 100;
const IP_DAILY_LIMIT = 150;
const GLOBAL_DAILY_LIMIT = 3000;
const MODEL = 'claude-haiku-4-5';

const SYSTEM_PROMPT = `You are ARIA, an AI assistant for international students applying to Australian universities.
You help with: course selection, scholarships, student visas (Subclass 500), accommodation, jobs (48 hrs/fortnight rule), English tests (IELTS/TOEFL/PTE), OSHC health insurance, cost of living, and life in Australia.

Guidelines:
- Keep answers concise (under 200 words)
- Use bullet points for lists
- Cite specific numbers when known (fees, scores, costs)
- Always recommend MARA-registered Migration Agents for visa/legal matters
- Be friendly, supportive - use "G'day" or "Cheers" occasionally
- If unsure, say so and direct to official sources (immi.homeaffairs.gov.au, university websites)
- Stay on topics related to studying and living in Australia; politely decline unrelated requests.`;

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const reply = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
async function sha(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
async function hit(key, limit) { const { data, error } = await db.rpc('web_hit', { p_key: key, p_limit: limit }); if (error) { console.error('rate', error); return true; } return data === true; }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const body = await req.json();
    const deviceId = String(body.deviceId || body.device_id || 'unknown').slice(0, 80);
    const isPremium = body.isPremium ?? body.is_premium ?? false;
    if (!isPremium) return reply({ text: 'ARIA AI is a Premium feature. Upgrade to Premium to unlock unlimited AI conversations!', requiresUpgrade: true }, 402);

    let messages = [];
    if (Array.isArray(body.messages)) messages = body.messages;
    else if (body.message) messages = [...(Array.isArray(body.conversationHistory) ? body.conversationHistory : []), { role: 'user', content: body.message }];
    else if (body.prompt) messages = [{ role: 'user', content: body.prompt }];
    messages = messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
    while (messages.length && messages[0].role !== 'user') messages.shift();
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') return reply({ text: 'No message received. Please try again.' });

    const ip = await sha('ip:' + ((req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'));
    const devOk = await hit(`app-dev:${await sha(deviceId)}`, PREMIUM_DAILY_LIMIT);
    const ipOk = devOk && (await hit(`app-ip:${ip}`, IP_DAILY_LIMIT));
    const globalOk = ipOk && (await hit('app-global', GLOBAL_DAILY_LIMIT));
    if (!devOk || !ipOk || !globalOk) return reply({ text: `You've reached your daily limit of ARIA messages. Resets at midnight UTC.` }, 429);

    if (!ANTHROPIC_KEY) return reply({ text: 'ARIA is temporarily unavailable. Please try again later.' }, 500);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 600, system: SYSTEM_PROMPT, messages }),
    });
    const data = await res.json();
    if (!res.ok) { console.error('Anthropic error:', data); return reply({ text: 'ARIA is temporarily unavailable. Please try again shortly.' }, 500); }
    const text = (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('') || 'Sorry, I had trouble generating a response.';
    return reply({ text, reply: text, remaining: null });
  } catch (err) {
    console.error('Edge function error:', err);
    return reply({ text: 'Something went wrong. Please try again.' }, 500);
  }
});
