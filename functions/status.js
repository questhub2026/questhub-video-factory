
const fetch = require('node-fetch');


exports.handler = async (event) => {

if (event.httpMethod !== 'GET') {

return { statusCode: 405, body: 'Method Not Allowed' };

}


const jobId = event.queryStringParameters.jobId;

if (!jobId) {

return { statusCode: 400, body: 'Missing jobId' };

}


try {

const FAL_KEY = process.env.FAL_KEY;

const response = await fetch(`https://fal.run/fal-ai/veed/fabric/talking-head/status/${jobId}`, {

headers: { 'Authorization': `Key ${FAL_KEY}` }

});


if (!response.ok) {

const err = await response.text();

return { statusCode: 500, body: JSON.stringify({ error: err }) };

}


const data = await response.json();

return {

statusCode: 200,

body: JSON.stringify(data)

};

} catch (err) {

return {

statusCode: 500,

body: JSON.stringify({ error: err.message })

};

}

};


