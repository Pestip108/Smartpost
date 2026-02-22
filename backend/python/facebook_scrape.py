from playwright.sync_api import sync_playwright
import random
import requests

webhook_url="https://porpoiselike-rory-uncontrovertedly.ngrok-free.dev/webhook-test/156c7d43-06e8-43a3-a60a-cbe69145fa6d"

with sync_playwright() as p:
    context = p.chromium.launch_persistent_context(
        user_data_dir="user_data",
        headless=False,
        channel="chrome"
    )
    page = context.new_page()

    # Login manually first time
    
    
    SEARCH_QUERY = "ai news"

    search_url = f"https://www.facebook.com/search/posts/?q={SEARCH_QUERY.replace(' ', '%20')}"
    page.goto(search_url)


    # Scroll
    collected = []
    print("entering loop")

    for _ in range(1):
        print(_)
        page.evaluate("window.scrollBy(0, 5000)")
        page.wait_for_timeout(random.randint(1500, 2500))

        messages = page.locator('div[data-ad-preview="message"]')
        count = messages.count()
        print("got count")
        if count > 0:
            for i in range(count):
                message = messages.nth(i)
                page.wait_for_timeout(random.randint(500, 1500))
                print("got message")

                try:
                    btn = message.locator('[role="button"]:has-text("See more")')
                    if btn.count() > 0:
                        btn.first.click(timeout=0)
                    print("see more pressed")
                except:
                    print("pass 1")
                    pass

                try:
                    print("entered try block")
                    text = page.evaluate("el => el.innerText", message.element_handle())
                    print("get text")

                    if text and text not in collected:
                        collected.append({"text":text})
                        print(text)
                        print("-" * 50)

                except:
                    print("pass 2")
                    pass
        else:
            print("entered else")
            page.evaluate("window.scrollBy(0, 2000)")
        
    page.close()
    context.close()
    data = dict()
    data["array"] = collected
    data["input"] = {"input": SEARCH_QUERY}

    print(data)

    requests.post(webhook_url, json=data, timeout=30)


