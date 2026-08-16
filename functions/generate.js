
const fetch = require('node-fetch');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { script, character, imageUrl } = JSON.parse(event.body);
        console.log('🔹 Received request for character:', character);

        // --- 1. Generate Voiceover with ElevenLabs ---
        const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;
        if (!ELEVEN_API_KEY) {
            console.error('❌ ELEVENLABS_API_KEY is missing');
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Missing ElevenLabs API key' })
            };
        }
        console.log('✅ ElevenLabs key found');

        const voiceResponse = await fetch('https://na01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fapi.elevenlabs.io%2Fv1%2Ftext-to-speech%2F21m00Tcm4TlvDq8ikWAM&data=05%7C02%7C%7C43eec2e5cf9040787a0d08defb37787c%7C84df9e7fe9f640afb435aaaaaaaaaaaa%7C1%7C0%7C639224412831204833%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C0%7C%7C%7C&sdata=%2BTr1DvNTaq7XAvOq5xhx%2Fd1BSdlMRutzWNF9N56wjwk%3D&reserved=0', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVEN_API_KEY
            },
            body: JSON.stringify({
                text: script,
                model_id: 'eleven_v3', // ← FIXED: Use the new model
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

        // --- 2. Fetch Image ---
        console.log('🔹 Fetching image...');
        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) {
            console.error('❌ Image fetch failed:', imageRes.status);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `Failed to fetch image: ${imageRes.status}` })
            };
        }
        const imageBuffer = await imageRes.buffer();
        const imageBase64 = imageBuffer.toString('base64');
        console.log('✅ Image fetched');

        // --- 3. Generate Video with Fal.ai (VEED Fabric) ---
        const FAL_KEY = process.env.FAL_KEY;
        if (!FAL_KEY) {
            console.error('❌ FAL_KEY is missing');
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Missing Fal.ai API key' })
            };
        }
        console.log('✅ Fal.ai key found');

        console.log('🔹 Sending to Fal.ai (VEED Fabric)...');
        const falResponse = await fetch('https://na01.safelinks.protection.outlook.com/?url=https%3A%2F%2Ffal.run%2Ffal-ai%2Fveed%2Ffabric%2Ftalking-head&data=05%7C02%7C%7C43eec2e5cf9040787a0d08defb37787c%7C84df9e7fe9f640afb435aaaaaaaaaaaa%7C1%7C0%7C639224412831242628%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C0%7C%7C%7C&sdata=bsLAXKdxgoORSIzIaMvPCqulmMI%2BNJt0p9ypmY3RJeM%3D&reserved=0', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Key ${FAL_KEY}`
            },
            body: JSON.stringify({
                image_data: imageBase64,
                audio_data: audioBase64,
                aspect_ratio: '1:1',
                video_duration: Math.min(60, Math.max(10, script.length * 0.5))
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
        console.log('✅ Fal.ai response received');

        if (falData.video_url) {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, videoUrl: falData.video_url })
            };
        } else if (falData.job_id) {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, jobId: falData.job_id })
            };
        } else {
            console.error('❌ Unexpected Fal.ai response:', falData);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Fal.ai did not return video URL or job ID' })
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
