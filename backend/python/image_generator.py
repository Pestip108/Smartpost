import requests
import os
import sys
import json
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

API_KEY = os.getenv("IMAGE_GENERATION_KEY", "")

# Output directory: backend/public/generated_images
# Script lives at backend/python/, so go up one level then into public/generated_images
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "generated_images"


def sanitize_filename(text: str, max_len: int = 50) -> str:
    """Keep only alphanumeric chars and spaces, then replace spaces with underscores."""
    cleaned = re.sub(r"[^\w\s-]", "", text).strip()
    cleaned = re.sub(r"\s+", "_", cleaned)
    return cleaned[:max_len]


def run(prompt: str):
    """
    Generate an image from a prompt using Pollinations AI.
    Saves the image to backend/public/generated_images/<prompt>_<datetime>.png
    Prints a JSON object with the saved file path and public URL to stdout.
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_prompt = sanitize_filename(prompt)
    filename = f"{safe_prompt}_{timestamp}.png"
    output_path = OUTPUT_DIR / filename

    try:
        base_url = os.getenv("IMAGE_GENERATION_URL")
        encoded_prompt = quote(prompt, safe="")
        url = f"{base_url}{encoded_prompt}?model=flux"

        headers = {}
        if API_KEY:
            headers["Authorization"] = f"Bearer {API_KEY}"

        response = requests.get(url, headers=headers, timeout=60)

        if response.status_code == 200:
            with open(output_path, "wb") as f:
                f.write(response.content)

            result = {
                "success": True,
                "filename": filename,
                "path": str(output_path),
                # Public URL path (served by Express static middleware)
                "url": f"/public/generated_images/{filename}",
                "content_type": "image/png",
            }
        else:
            result = {
                "success": False,
                "error": f"HTTP {response.status_code}: {response.text[:200]}",
            }
    except Exception as e:
        result = {
            "success": False,
            "error": str(e),
        }

    print(json.dumps(result))


if __name__ == "__main__":
    prompt = sys.argv[1] if len(sys.argv) > 1 else "A beautiful sunset over the ocean"
    run(prompt)