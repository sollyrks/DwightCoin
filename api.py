from flask import Flask, jsonify
from flask_cors import CORS
import asyncio
import struct
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey

app = Flask(__name__)
CORS(app)

LAMPORTS_PER_SOL = 1_000_000_000
TOKEN_DECIMALS = 6
CURVE_ADDRESS = "6GXfUqrmPM4VdN1NoDZsE155jzRegJngZRjMkGyby7do"
EXPECTED_DISCRIMINATOR = struct.pack("<Q", 6966180631402821399)
RPC_ENDPOINT = "https://api.mainnet-beta.solana.com"

class BondingCurveState:
    def __init__(self, data: bytes) -> None:
        view = memoryview(data[8:])
        self.virtual_token_reserves = int.from_bytes(view[0:8], 'little')
        self.virtual_sol_reserves = int.from_bytes(view[8:16], 'little')
        self.real_token_reserves = int.from_bytes(view[16:24], 'little')
        self.real_sol_reserves = int.from_bytes(view[24:32], 'little')
        self.token_total_supply = int.from_bytes(view[32:40], 'little')
        self.complete = bool(view[40])

async def get_bonding_curve_state(conn: AsyncClient, curve_address: Pubkey) -> BondingCurveState:
    response = await conn.get_account_info(curve_address)
    if not response.value or not response.value.data:
        raise ValueError("Invalid curve state: No data")

    data = response.value.data
    if data[:8] != EXPECTED_DISCRIMINATOR:
        raise ValueError("Invalid curve state discriminator")

    return BondingCurveState(data)

def calculate_bonding_curve_price(curve_state: BondingCurveState) -> float:
    if curve_state.virtual_token_reserves <= 0 or curve_state.virtual_sol_reserves <= 0:
        raise ValueError("Invalid reserve state")

    return (curve_state.virtual_sol_reserves / LAMPORTS_PER_SOL) / (curve_state.virtual_token_reserves / 10 ** TOKEN_DECIMALS)

@app.route('/api/price')
async def get_price():
    try:
        async with AsyncClient(RPC_ENDPOINT) as conn:
            curve_address = Pubkey.from_string(CURVE_ADDRESS)
            bonding_curve_state = await get_bonding_curve_state(conn, curve_address)
            token_price_sol = calculate_bonding_curve_price(bonding_curve_state)
            
            return jsonify({
                'price': token_price_sol,
                'tokensPerSol': 1 / token_price_sol
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=3000) 