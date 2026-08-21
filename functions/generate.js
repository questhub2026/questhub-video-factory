

const fetch = require('node-fetch');

const FormData = require('form-data');


const FAL_KEY = process.env.FAL_KEY;

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;


// Use the correct app ID for talking-head video

const APP_ID = 'fal-ai/ai-avatar';


exports.handler = async function(event, context) {

// Only allow POST

if (event.httpMethod !== 'POST') {

return {

statusCode: 405,

body: JSON.stringify({ error: 'Method Not Allowed' })

};

}


try {

// Parse the request body

const { imageUrl, script } = JSON.parse(event.body);


if (!imageUrl || !script) {

return {

statusCode: 400,

body: JSON.stringify({ error: 'Missing imageUrl or script' })

};

}


console.log('🎤 Generating voiceover for:', script.substring(0, 50) + '...');


// ─── 1. Generate Voiceover with ElevenLabs ──────────────────

const audioData = await generateVoiceover(script);

if (!audioData) {

return {

statusCode: 500,

body: JSON.stringify({ error: 'Failed to generate voiceover – check ElevenLabs key' })

};

}


console.log('✅ Voiceover generated, audio size:', audioData.length);


// ─── 2. Generate Video with Fal.ai ──────────────────────────

const videoUrl = await generateVideo(imageUrl, audioData);

if (!videoUrl) {

return {

statusCode: 500,

body: JSON.stringify({ error: 'Failed to generate video – check Fal.ai key' })

};

}


console.log('✅ Video generated:', videoUrl);


// ─── 3. Return the result ────────────────────────────────────

return {

statusCode: 200,

body: JSON.stringify({ videoUrl })

};


} catch (error) {

console.error('❌ Error:', error.message);

return {

statusCode: 500,

body: JSON.stringify({ error: error.message || 'Internal Server Error' })

};

}

};


// ─── Helper: Generate Voiceover with ElevenLabs ──────────────────

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


try {

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

} catch (error) {

console.error('ElevenLabs fetch error:', error.message);

return null;

}

}


// ─── Helper: Generate Video with Fal.ai ───────────────────────────

async function generateVideo(imageUrl, audioData) {

const url = `https://fal.run/${APP_ID}`;

const headers = {

'Authorization': `Key ${FAL_KEY}`,

'Content-Type': 'application/json'

};


const payload = {

image_url: imageUrl,

audio_url: audioData,

sync_mode: 'lip_sync'

};


try {

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

} catch (error) {

console.error('Fal.ai fetch error:', error.message);

return null;

}

}



