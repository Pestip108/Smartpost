from playwright.sync_api import sync_playwright

user_input = "league of legends"

with sync_playwright() as p:
    context = p.chromium.launch_persistent_context(
        user_data_dir="user_data",
        headless=False,
        channel="chrome"
    )
    page = context.new_page()

    page.goto("https://deepai.org/machine-learning-model/text2img")

    input_box = page.locator("textarea[id='generate-textarea']")
    submit = page.locator("button[id='modelSubmitButton']")
    output = page.locator("img[id='main-image']")

    input_box.fill(user_input)
    page.wait_for_timeout(2000)
    submit.click()
    page.wait_for_timeout(3000)
    output = page.locator("img[id='main-image']")
    
    print(output.get_attribute("src"))