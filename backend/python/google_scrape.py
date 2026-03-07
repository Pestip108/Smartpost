import sys
import json
from playwright.sync_api import sync_playwright

def run(prompt: str, attitude: str = "Normal"):
    text_data = []

    try:
        with sync_playwright() as p:
            context = p.chromium.launch_persistent_context(
                user_data_dir="user_data",
                headless=False,
                channel="chrome"
            )
            page = context.new_page()

            page.goto("https://google.com")

            search = page.locator("textarea[name='q']")
            search.fill(f"Find me what people are saying about {prompt}")
            search.press("Enter")
            page.wait_for_timeout(3000)
            page.wait_for_load_state("networkidle")

            # Try AI Mode if available
            try:
                ai_mode = page.locator("span:has-text('AI Mode')")
                search.wait_for()
                if ai_mode.count() > 0:
                    ai_mode.first.click()
                    page.wait_for_timeout(5000)
            except:
                pass

            text = page.locator("li[data-complete='true']")
            for txt in text.all_text_contents():
                if txt.strip():
                    text_data.append({"text": txt.strip()})

            # Also grab visible paragraphs/snippets as fallback
            if not text_data:
                snippets = page.locator("div.VwiC3b, span.hgKElc")
                for s in snippets.all_text_contents():
                    if s.strip():
                        text_data.append({"text": s.strip()})

            page.close()
            context.close()
    except Exception as e:
        text_data = [{"text": f"Google scrape error: {str(e)}"}]

    result = {
        "source": "google",
        "input": prompt,
        "attitude": attitude,
        "array": text_data
    }
    print(json.dumps(result))


if __name__ == "__main__":
    prompt = sys.argv[1] if len(sys.argv) > 1 else "AI news"
    attitude = sys.argv[2] if len(sys.argv) > 2 else "Normal"
    run(prompt, attitude)
