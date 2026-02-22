from telethon import TelegramClient
from flask import Flask, request, jsonify
import requests
import asyncio
    
api_id = 34658383
api_hash = "79f024fafb229a181aadc2d78b4e6ac4"

client = TelegramClient("session", api_id, api_hash)

webhook_url="https://porpoiselike-rory-uncontrovertedly.ngrok-free.dev/webhook-test/156c7d43-06e8-43a3-a60a-cbe69145fa6d"

app = Flask(__name__)

loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)

client = TelegramClient("session", api_id, api_hash)

async def init_client():
    await client.start()

loop.run_until_complete(init_client())

async def fill_data(channel_name):
    data_container = []
    try:
        channel= await client.get_entity(channel_name)
        messages = await client.get_messages(channel, limit=30)
    
        for msg in messages:
            if msg.text:
                data_container.append({"text":msg.text})
    except:
        print(f"{channel_name} error")

    return data_container

@app.route("/receive", methods=["POST"])
def main():
    channel_name = request.json
    
    async def get_messages():
        data = []
        for channel in channel_name["array"]:
            msg = await fill_data(channel)
            data.extend(msg)
        return data
    data=dict()
    data["array"] = loop.run_until_complete(get_messages())
    data["input"] = channel_name["text"]

    requests.post(webhook_url, json=data, timeout=30)
    
    return jsonify({"status": "ok", "messages_count": len(data)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
