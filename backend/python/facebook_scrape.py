import sys
import json
import random

def run(prompt: str):
    """
    NOTE: Facebook scraping requires a persistent Chrome session that has been
    logged in manually once (user_data_dir). In a headless server it may fail
    on first run — just open Chrome manually, log into Facebook, then rerun.
    """
    collected = []

    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            context = p.chromium.launch_persistent_context(
                user_data_dir="user_data",
                headless=True,
                channel="chrome"
            )
            page = context.new_page()

            search_url = f"https://www.facebook.com/search/posts/?q={prompt.replace(' ', '%20')}"
            page.goto(search_url)

            for _ in range(2):
                page.evaluate("window.scrollBy(0, 5000)")
                page.wait_for_timeout(random.randint(1500, 2500))

                messages = page.locator('div[data-ad-preview="message"]')
                count = messages.count()

                if count > 0:
                    for i in range(min(count, 10)):
                        message = messages.nth(i)
                        try:
                            btn = message.locator('[role="button"]:has-text("See more")')
                            if btn.count() > 0:
                                btn.first.click(timeout=3000)
                        except:
                            pass

                        try:
                            text = page.evaluate("el => el.innerText", message.element_handle())
                            if text and text.strip() and {"text": text.strip()} not in collected:
                                collected.append({"text": text.strip()})
                        except:
                            pass
                else:
                    page.evaluate("window.scrollBy(0, 2000)")

            page.close()
            context.close()
    except Exception as e:
        collected = [{"text": f"Facebook scrape error: {str(e)}"}]

    result = {
        "source": "facebook",
        "input": prompt,
        "array": collected
    }
    print(json.dumps(result))


if __name__ == "__main__":
    prompt = sys.argv[1] if len(sys.argv) > 1 else "AI news"
    run(prompt)
