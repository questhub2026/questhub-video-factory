
const fetch = require('node-fetch');


exports.handler = async (event) => {

if (event.httpMethod !== 'POST') {

return { statusCode: 405, body: 'Method Not Allowed' };

}


try {

const { script, character, imageUrl } = JSON.parse(event.body);


const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVEN_API_KEY) {

return { statusCode: 500, body: JSON.stringify({ error: 'Missing ElevenLabs API key' }) };

}


const voiceResponse = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {

method: 'POST',

headers: {

'Content-Type': 'application/json',

'xi-api-key': ELEVEN_API_KEY

},

body: JSON.stringify({

text: script,

model_id: 'eleven_v3',

voice_settings: { stability: 0.5, similarity_boost: 0.5 }

})

});


if (!voiceResponse.ok) {

const err = await voiceResponse.text();

return { statusCode: 500, body: JSON.stringify({ error: `ElevenLabs error: ${err}` }) };

}


const audioBuffer = await voiceResponse.buffer();

const audioBase64 = audioBuffer.toString('base64');


const imageRes = await fetch(imageUrl);

if (!imageRes.ok) {

return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch image' }) };

}

const imageBuffer = await imageRes.buffer();

const imageBase64 = imageBuffer.toString('base64');


const FAL_KEY = process.env.FAL_KEY;

if (!FAL_KEY) {

return { statusCode: 500, body: JSON.stringify({ error: 'Missing Fal.ai API key' }) };

}


const duration = Math.round(Math.min(60, Math.max(10, script.length * 0.5)));


const falResponse = await fetch('https://fal.run/fal-ai/veed/fabric/talking-head', {

method: 'POST',

headers: {

'Content-Type': 'application/json',

'Authorization': `Key ${FAL_KEY}`

},

body: JSON.stringify({

image_data: imageBase64,

audio_data: audioBase64,

aspect_ratio: '1:1',

video_duration: duration

})

});


if (!falResponse.ok) {

const err = await falResponse.text();

return { statusCode: 500, body: JSON.stringify({ error: `Fal.ai error: ${err}` }) };

}


const falData = await falResponse.json();

if (falData.video_url) {

return { statusCode: 200, body: JSON.stringify({ success: true, videoUrl: falData.video_url }) };

} else if (falData.job_id) {

return { statusCode: 200, body: JSON.stringify({ success: true, jobId: falData.job_id }) };

} else {

return { statusCode: 500, body: JSON.stringify({ error: 'Fal.ai did not return video URL or job ID' }) };

}


} catch (err) {

return { statusCode: 500, body: JSON.stringify({ error: err.message }) };

}

};



