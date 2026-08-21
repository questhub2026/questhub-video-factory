
const fetch = require('node-fetch');
const FormData = require('form-data');

const FAL_KEY = process.env.FAL_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Use the correct app ID – change this if needed
const APP_ID = 'fal-ai/image-to-video';

exports.handler = async function(event, context) {
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

// 1. Generate voiceover with ElevenLabs
const audioUrl = await generateVoiceover(script);
if (!audioUrl) {
return {
statusCode: 500,
body: JSON.stringify({ error: 'Failed to generate voiceover' })
};
}

// 2. Generate video with Fal.ai
const videoUrl = await generateVideo(imageUrl, audioUrl);
if (!videoUrl) {
return {
statusCode: 500,
body: JSON.stringify({ error: 'Failed to generate video' })
};
}

return {
statusCode: 200,
body: JSON.stringify({ videoUrl })
};

} catch (error) {
console.error('Error:', error);
return {
statusCode: 500,
body: JSON.stringify({ error: error.message })
};
}
};

// ─── Generate Voiceover ────────────────────────────────────────────
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
voice_settings: { stability: 0.5, similarity_boost: 0.75 }
});

const response = await fetch(url, { method: 'POST', headers, body });
if (!response.ok) {
const errorText = await response.text();
console.error('ElevenLabs error:', errorText);
return null;
}

// Return audio as base64 data URL (Fal.ai accepts this)
const audioBuffer = await response.buffer();
const base64 = audioBuffer.toString('base64');
return `data:audio/mpeg;base64,${base64}`;
}

// ─── Generate Video ─────────────────────────────────────────────────
async function generateVideo(imageUrl, audioUrl) {
const url = `https://fal.run/${APP_ID}`;
const headers = {
'Authorization': `Key ${FAL_KEY}`,
'Content-Type': 'application/json'
};

const payload = {
image_url: imageUrl,
audio_url: audioUrl,
prompt: 'A cute cartoon character speaking, studio lighting, high quality',
video_duration: 10
};

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
return data.video_url || data.video?.url || null;
}


