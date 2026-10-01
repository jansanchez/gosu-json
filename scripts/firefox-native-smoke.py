"""Optional integration check against an installed Firefox and geckodriver.

Requires Selenium in a project-local virtual environment. All endpoints are local.
See docs/TESTING.md. No production service is contacted by the test.
"""
import json
import os
from pathlib import Path
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from selenium import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.support.ui import WebDriverWait

ROOT = Path(__file__).resolve().parents[1]
VERSION = json.loads((ROOT / "package.json").read_text())["version"]
RAW = '{"native":true,"name":"日本語","id":9007199254740993,"x":1,"x":2}'
requests = []


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        requests.append(self.path)
        mime = "application/json"
        body = RAW
        status = 200
        if self.path == "/html":
            mime, body = "text/html", "<p>Ordinary page</p>"
        elif self.path == "/plain":
            mime = "text/plain"
        elif self.path == "/error":
            mime, status = "application/problem+json", 400
        elif self.path == "/invalid":
            body = "not JSON"
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.end_headers()
        self.wfile.write(body.encode("utf-8"))

    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f"http://127.0.0.1:{server.server_port}"
options = webdriver.FirefoxOptions()
options.binary_location = os.environ["GOSU_FIREFOX_EXECUTABLE"]
options.add_argument("-headless")
options.add_argument("--remote-allow-system-access")
service = Service(os.environ["GOSU_GECKODRIVER_EXECUTABLE"])
driver = webdriver.Firefox(options=options, service=service)
wait = WebDriverWait(driver, 15)


def async_js(script):
    return driver.execute_async_script("const done=arguments[0];" + script)


def permission(accept):
    driver.set_context("chrome")
    try:
        wait.until(lambda d: d.execute_script(
            "return document.getElementById('addon-webext-permissions-notification')?.button?.label === 'Allow'"
        ))
        button = "button" if accept else "secondaryButton"
        driver.execute_script(
            "document.getElementById('addon-webext-permissions-notification')."
            + button + ".click();"
        )
    finally:
        driver.set_context("content")


def click_toolbar():
    driver.set_context("chrome")
    try:
        driver.execute_script("""
            const {ExtensionParent}=ChromeUtils.importESModule(
                'resource://gre/modules/ExtensionParent.sys.mjs');
            const extension=WebExtensionPolicy.getByID('json-atelier@local.invalid').extension;
            ExtensionParent.apiManager.global.browserActionFor(extension).triggerAction(window);
        """)
    finally:
        driver.set_context("content")


def workspace_after(previous):
    handle = wait.until(lambda d: next(
        (h for h in d.window_handles if h not in previous), None
    ))
    driver.switch_to.window(handle)
    wait.until(lambda d: d.current_url.startswith("moz-extension:"))
    wait.until(lambda d: d.find_elements("css selector", "#editor .cm-content"))
    return handle


def source():
    return driver.find_element("css selector", "#editor .cm-content").text


try:
    driver.install_addon(str(ROOT / "releases" / f"gosu-json-firefox-{VERSION}.zip"), temporary=True)
    workspace_after(set(driver.window_handles[:1]))
    print("Firefox", driver.capabilities["browserVersion"], flush=True)
    driver.get(origin + "/first")
    original = driver.current_window_handle
    assert driver.execute_script("return document.contentType") == "application/json"
    previous = set(driver.window_handles)
    click_toolbar()
    workspace = workspace_after(previous)
    wait.until(lambda d: d.find_element("id", "accessPrompt").is_displayed())
    assert source() == ""
    assert not driver.find_elements("css selector", ".tree-row")
    driver.find_element("id", "declineAccess").click()
    assert requests.count("/first") == 1
    driver.find_element("id", "allowAccess").click()
    permission(False)
    wait.until(lambda d: "declined" in d.find_element("id", "accessStatus").text)
    assert source() == "" and requests.count("/first") == 1
    driver.find_element("id", "allowAccess").click()
    permission(True)
    wait.until(lambda d: "9007199254740993" in source())
    assert "日本語" in source() and source().count('"x"') == 2
    assert requests.count("/first") == 2
    assert not driver.find_element("id", "accessPrompt").is_displayed()
    driver.find_element("id", "alwaysOpen").click()
    wait.until(lambda d: not d.find_element("id", "openingPrompt").is_displayed())
    async_js("browser.runtime.sendMessage({type:'sync-opening'}).then(done);")
    previous = set(driver.window_handles)
    driver.switch_to.window(original)
    driver.get(origin + "/automatic")
    automatic = workspace_after(previous)
    wait.until(lambda d: "9007199254740993" in source())
    assert source().count('"x"') == 2 and "日本語" in source()
    assert requests.count("/automatic") == 1
    assert not driver.find_element("id", "accessPrompt").is_displayed()
    print("PASS: native toolbar, empty panels, defer, deny, allow, fresh GET and automatic lossless import.", flush=True)
    for path in ["/html", "/plain", "/invalid"]:
        previous = set(driver.window_handles)
        driver.switch_to.window(original)
        driver.get(origin + path)
        time.sleep(0.8)  # Negative checks need a bounded observation interval.
        assert set(driver.window_handles) == previous, path
    previous = set(driver.window_handles)
    driver.get(origin + "/error")
    error_workspace = workspace_after(previous)
    wait.until(lambda d: "9007199254740993" in source())
    assert requests.count("/error") == 1
    driver.switch_to.window(automatic)
    async_js("browser.storage.local.set({openingModes:{'" + origin + "':'manual'}}).then(()=>browser.runtime.sendMessage({type:'sync-opening'})).then(done);")
    previous = set(driver.window_handles)
    driver.switch_to.window(original)
    driver.get(origin + "/manual")
    time.sleep(0.8)
    assert set(driver.window_handles) == previous
    driver.switch_to.window(automatic)
    async_js("browser.storage.local.set({openingModes:{'" + origin + "':'always'}}).then(()=>browser.runtime.sendMessage({type:'sync-opening'})).then(done);")
    assert async_js("browser.permissions.remove({origins:['http://127.0.0.1/*']}).then(done);")
    async_js("browser.runtime.sendMessage({type:'sync-opening'}).then(done);")
    previous = set(driver.window_handles)
    driver.switch_to.window(original)
    driver.get(origin + "/revoked")
    time.sleep(0.8)
    assert set(driver.window_handles) == previous
    print("PASS: HTML/plain text/invalid JSON ignored, +json HTTP errors imported, manual mode and revoked access stop automatic opening.", flush=True)
finally:
    driver.quit()
    server.shutdown()
