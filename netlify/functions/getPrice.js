const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            }
        };
    }

    try {
        console.log('Fetching price data from Jupiter...');
        const MINT_ADDRESS = 'EHotaY3TM1mPFXmMkbpoQZrQSJaaxKNRimJkW4DQpump';
        const response = await fetch(`https://price.jup.ag/v4/price?ids=${MINT_ADDRESS}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Raw response:', JSON.stringify(result, null, 2));
        
        if (!result.data || !result.data[MINT_ADDRESS]) {
            throw new Error("Price data not found");
        }

        const priceInSol = result.data[MINT_ADDRESS].price;
        const tokensPerSol = 1 / priceInSol;

        console.log('Price calculation:', {
            priceInSol: priceInSol,
            tokensPerSol: tokensPerSol
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                price: priceInSol,
                tokensPerSol: tokensPerSol
            })
        };
    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: error.message,
                stack: error.stack
            })
        };
    }
}; 