
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

        // Use the latest model
        const voiceResponse = await fetch('https://na01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fapi.elevenlabs.io%2Fv1%2Ftext-to-speech%2F21m00Tcm4TlvDq8ikWAM&data=05%7C02%7C%7Ca2db83b113da43ffde4d08defb408eea%7C84df9e7fe9f640afb435aaaaaaaaaaaa%7C1%7C0%7C639224451863617034%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C0%7C%7C%7C&sdata=qqZ8lNbU%2BFNu%2BW2w%2BeT8rNqkRYlu37L8UnhTgmEeaeg%3D&reserved=0', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVEN_API_KEY
            },
            body: JSON.stringify({
                text: script,
                model_id: 'eleven_flash_v2_5', // ✅ FIXED: use the newest fast model
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
                }
            })
        });

        // Better error handling
        if (!voiceResponse.ok) {
            const status = voiceResponse.status;
            const body = await voiceResponse.text();
            console.error('❌ ElevenLabs error status:', status);
            console.error('❌ ElevenLabs error body:', body);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: `ElevenLabs error ${status}: ${body}`
                })
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
        const falResponse = await fetch('https://na01.safelinks.protection.outlook.com/?url=https%3A%2F%2Ffal.run%2Ffal-ai%2Fveed%2Ffabric%2Ftalking-head&data=05%7C02%7C%7Ca2db83b113da43ffde4d08defb408eea%7C84df9e7fe9f640afb435aaaaaaaaaaaa%7C1%7C0%7C639224451863661571%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C0%7C%7C%7C&sdata=tZpje5HwBW%2BlT%2Fn3w5r4PDcy4hWukrMg1mXyt%2BLfwxQ%3D&reserved=0', {
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
            const status = falResponse.status;
            const body = await falResponse.text();
            console.error('❌ Fal.ai error status:', status);
            console.error('❌ Fal.ai error body:', body);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `Fal.ai error ${status}: ${body}` })
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
