"""
Telegram scraper — uses Telethon and requires an authenticated session.
Run manually once to create the session file, then it can be called via Node.
"""
import sys
import json
import asyncio

try:
    from telethon import TelegramClient
    TELETHON_AVAILABLE = True
except ImportError:
    TELETHON_AVAILABLE = False

API_ID = 34658383
API_HASH = "79f024fafb229a181aadc2d78b4e6ac4"

CHANNELS = [
    "openai",
    "artificialintelligencenews",
    "ai_daily",
]

async def fill_data(client, channel_name: str):
    data_container = []
    try:
        channel = await client.get_entity(channel_name)
        messages = await client.get_messages(channel, limit=20)
        for msg in messages:
            if msg.text and msg.text.strip():
                data_container.append({"text": msg.text.strip()})
    except Exception as e:
        pass
    return data_container


async def run_async(prompt: str, channels: list):
    if not TELETHON_AVAILABLE:
        return {"source": "telegram", "input": prompt, "array": [], "error": "telethon not installed"}

    client = TelegramClient("session", API_ID, API_HASH)
    data = []
    try:
        await client.start()
        for channel in channels:
            msgs = await fill_data(client, channel)
            data.extend(msgs)
        await client.disconnect()
    except Exception as e:
        return {"source": "telegram", "input": prompt, "array": [], "error": str(e)}

    return {"source": "telegram", "input": prompt, "array": data}


def run(prompt: str, channels=None):
    if channels is None:
        channels = CHANNELS

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(run_async(prompt, channels))
    loop.close()
    print(json.dumps(result))


if __name__ == "__main__":
    prompt = sys.argv[1] if len(sys.argv) > 1 else "AI news"
    run(prompt)
