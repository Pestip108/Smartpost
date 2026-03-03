from playwright.sync_api import sync_playwright
import requests

user_input = "Job market"
attitude = "Normal"

test_url="https://porpoiselike-rory-uncontrovertedly.ngrok-free.dev/webhook-test/156c7d43-06e8-43a3-a60a-cbe69145fa6d"
prod_url="https://porpoiselike-rory-uncontrovertedly.ngrok-free.dev/webhook/156c7d43-06e8-43a3-a60a-cbe69145fa6d"
text_data = []

with sync_playwright() as p:
    context = p.chromium.launch_persistent_context(
        user_data_dir="user_data",
        headless=False,
        channel="chrome"
    )
    page = context.new_page()

    page.goto("https://google.com")
    

    search = page.locator("textarea[name='q']")
    search.fill(f"Search many websites and find me what people are saying about {user_input}")
    page.wait_for_timeout(2000)
    search.press("Enter")
    page.wait_for_timeout(2000)
    ai_mode = page.locator("span:has-text('AI Mode')")
    ai_mode.first.click()
    page.wait_for_timeout(5000)
    data = page.locator("div[data-container-id='main-col']")
    text = page.locator("li[data-complete='true']")

    for txt in text.all_text_contents():
        text_data.append({"text":txt})

    data=dict()
    data["input"] ={"input": user_input}
    data["array"] = text_data
    data["attitude"] = {"att":attitude}

    print(text.all_text_contents())
    requests.post(test_url, json=data, timeout=30)
