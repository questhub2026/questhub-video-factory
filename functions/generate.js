
const fetch = require('node-fetch');


exports.handler = async (event) => {

if (event.httpMethod !== 'POST') {

return { statusCode: 405, body: 'Method Not Allowed' };

}


try {

const { script, character, imageUrl } = JSON.parse(event.body);

console.log('🔹 Received request for character:', character);


const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVEN_API_KEY) {

console.error('❌ ELEVENLABS_API_KEY is missing');

return {

statusCode: 500,

body: JSON.stringify({ error: 'Missing ElevenLabs API key' })

};

}

console.log('✅ ElevenLabs key found');


const FAL_KEY = process.env.FAL_KEY;

if (!FAL_KEY) {

console.error('❌ FAL_KEY is missing');

return {

statusCode: 500,

body: JSON.stringify({ error: 'Missing Fal.ai API key' })

};

}

console.log('✅ Fal.ai key found');


console.log('🔹 Generating voiceover with ElevenLabs...');

const voiceResponse = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {

method: 'POST',

headers: {

'Content-Type': 'application/json',

'xi-api-key': ELEVEN_API_KEY

},

body: JSON.stringify({

text: script,

model_id: 'eleven_v3',

voice_settings: {

stability: 0.5,

similarity_boost: 0.5

}

})

});


if (!voiceResponse.ok) {

const err = await voiceResponse.text();

console.error('❌ ElevenLabs error:', err);

return {

statusCode: 500,

body: JSON.stringify({ error: `ElevenLabs error: ${err}` })

};

}


const audioBuffer = await voiceResponse.buffer();

const audioBase64 = audioBuffer.toString('base64');

console.log('✅ Voiceover generated');


console.log('🔹 Sending to Fal.ai image-to-video (talking head)...');

const falResponse = await fetch('https://fal.run/fal-ai/image-to-video', {

method: 'POST',

headers: {

'Content-Type': 'application/json',

'Authorization': `Key ${FAL_KEY}`

},

body: JSON.stringify({

image_url: imageUrl,

prompt: script,

aspect_ratio: '1:1',

duration: 5

})

});


if (!falResponse.ok) {

const err = await falResponse.text();

console.error('❌ Fal.ai error:', err);

return {

statusCode: 500,

body: JSON.stringify({ error: `Fal.ai error: ${err}` })

};

}


const falData = await falResponse.json();

console.log('✅ Fal.ai response received:', falData);


if (falData.video_url) {

return {

statusCode: 200,

body: JSON.stringify({ success: true, videoUrl: falData.video_url })

};

} else if (falData.job_id) {

// Poll for status

return {

statusCode: 200,

body: JSON.stringify({ success: true, jobId: falData.job_id })

};

} else {

console.error('❌ Unexpected Fal.ai response:', falData);

return {

statusCode: 500,

body: JSON.stringify({ error: 'Fal.ai response missing video_url or job_id' })

};

}


} catch (err) {

console.error('❌ Unhandled error:', err);

return {

statusCode: 500,

body: JSON.stringify({ error: err.message })

};

}

};


