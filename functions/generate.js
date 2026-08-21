Generate.js
Sam F
​You​
Generate.js

const fetch = require('node-fetch');
const FormData = require('form-data');

// ─── ENVIRONMENT VARIABLES ─────────────────────────────────────────
const FAL_KEY = process.env.FAL_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// ─── CONFIGURATION ──────────────────────────────────────────────────
// Choose the app you want. Options:
// - fal-ai/ai-avatar : Best for lip-sync from image + audio
// - fal-ai/creatify/aurora : Ultra-realistic, full-body with audio + prompt
// - fal-ai/bytedance/omnihuman/v1.5 : Advanced emotional + gestures
const APP_ID = 'fal-ai/ai-avatar'; // <-- CHANGE THIS if you prefer another

// ─── HANDLER ────────────────────────────────────────────────────────
exports.handler = async function(event, context) {
// Only allow POST
if (event.httpMethod !== 'POST') {
return { statusCode: 405, body: 'Method Not Allowed' };
}

try {
const { imageUrl, script } = JSON.parse(event.body);

if (!imageUrl || !script) {
return {
statusCode: 400,
body: JSON.stringify({ error: 'Missing imageUrl or script' })
};
}

// ─── 1. Generate Voiceover with ElevenLabs ──────────────────
const audioUrl = await generateVoiceover(script);
if (!audioUrl) {
return {
statusCode: 500,
body: JSON.stringify({ error: 'Failed to generate voiceover' })
};
}

// ─── 2. Generate Video with Fal.ai ──────────────────────────
const videoUrl = await generateVideo(imageUrl, audioUrl);
if (!videoUrl) {
return {
statusCode: 500,
body: JSON.stringify({ error: 'Failed to generate video' })
};
}

// ─── 3. Return the result ────────────────────────────────────
return {
statusCode: 200,
body: JSON.stringify({ videoUrl })
};

} catch (error) {
console.error('Error:', error);
return {
statusCode: 500,
body: JSON.stringify({ error: error.message || 'Internal Server Error' })
};
}
};

// ─── HELPER: Generate voiceover using ElevenLabs ──────────────────
async function generateVoiceover(script) {
const url = 'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM';
const headers = {
'Accept': 'audio/mpeg',
'Content-Type': 'application/json',
'xi-api-key': ELEVENLABS_API_KEY
};
const body = JSON.stringify({
text: script,
model_id: 'eleven_monolingual_v1',
voice_settings: {
stability: 0.5,
similarity_boost: 0.75
}
});

const response = await fetch(url, { method: 'POST', headers, body });
if (!response.ok) {
const errorText = await response.text();
console.error('ElevenLabs error:', errorText);
return null;
}

// Get audio as buffer and upload to a temporary URL (or base64)
// For simplicity, we return a data URL or we can use a file hosting.
// But Fal.ai expects an audio URL. We'll need to upload the audio.
// To keep it simple, we'll convert to base64 data URL.
const audioBuffer = await response.buffer();
const base64 = audioBuffer.toString('base64');
return `data:audio/mpeg;base64,${base64}`;
}

// ─── HELPER: Generate video using Fal.ai ───────────────────────────
async function generateVideo(imageUrl, audioUrl) {
const url = `https://fal.run/${APP_ID}`;
const headers = {
'Authorization': `Key ${FAL_KEY}`,
'Content-Type': 'application/json'
};

// Build payload based on the app
let payload = {};
if (APP_ID === 'fal-ai/ai-avatar') {
payload = {
image_url: imageUrl,
audio_url: audioUrl,
sync_mode: 'lip_sync' // or 'expression' if available
};
} else if (APP_ID === 'fal-ai/creatify/aurora') {
payload = {
image_url: imageUrl,
audio_url: audioUrl,
prompt: 'Studio lighting, high quality, detailed'
};
} else if (APP_ID === 'fal-ai/bytedance/omnihuman/v1.5') {
payload = {
image_url: imageUrl,
audio_url: audioUrl,
resolution: '720p' // or '1080p'
};
} else {
// fallback generic
payload = { image_url: imageUrl, audio_url: audioUrl };
}

const response = await fetch(url, {
method: 'POST',
headers,
body: JSON.stringify(payload)
});

if (!response.ok) {
const errorText = await response.text();
console.error('Fal.ai error:', errorText);
return null;
}

const data = await response.json();
// Fal.ai response contains a video_url field
return data.video_url || data.video?.url || null;
}


Sent from my iPhone
