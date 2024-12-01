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
        console.log('Fetching price data...');
        const response = await fetch('https://api.mainnet-beta.solana.com', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getAccountInfo",
                "params": [
                    "EHotaY3TM1mPFXmMkbpoQZrQSJaaxKNRimJkW4DQpump",
                    {
                        "encoding": "base64"
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Raw response:', JSON.stringify(result, null, 2));
        
        if (!result.result || !result.result.value || !result.result.value.data) {
            throw new Error("Invalid curve state: No data");
        }

        const data = Buffer.from(result.result.value.data[0], 'base64');
        const virtualTokenReserves = data.readBigUInt64LE(8);
        const virtualSolReserves = data.readBigUInt64LE(16);

        console.log('Reserves:', {
            virtualTokenReserves: virtualTokenReserves.toString(),
            virtualSolReserves: virtualSolReserves.toString()
        });

        if (virtualTokenReserves <= 0n || virtualSolReserves <= 0n) {
            throw new Error("Invalid reserve state");
        }

        const LAMPORTS_PER_SOL = 1000000000;
        const TOKEN_DECIMALS = 6;

        const priceInSol = Number(virtualSolReserves) / LAMPORTS_PER_SOL / 
                          (Number(virtualTokenReserves) / Math.pow(10, TOKEN_DECIMALS));

        console.log('Calculated price:', priceInSol);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                price: priceInSol,
                tokensPerSol: 1 / priceInSol
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