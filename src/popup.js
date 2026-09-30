import { api, send } from "./platform.js";
const status = document.querySelector("#message");
async function current() {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  return tab;
}
function action(id, fn) {
  document.querySelector(id).onclick = async () => {
    try {
      status.textContent = "";
      await fn();
      if (!status.textContent) status.textContent = "Done.";
    } catch (e) {
      status.textContent = e.message;
    }
  };
}
action("#empty", () => send({ type: "empty" }));
action("#current", async () => {
  const tab = await current();
  await api.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["capture-manual.js"],
  });
  status.textContent =
    "If this is a JSON/text response, it opens in a new tab.";
});
async function site() {
  const tab = await current(),
    url = new URL(tab.url);
  if (!/^https?:$/.test(url.protocol))
    throw new Error("Choose an HTTP or HTTPS site.");
  return url.origin;
}
async function opening(mode) {
  const origin = await site();
  const { openingModes = {} } = await api.storage.local.get("openingModes");
  openingModes[origin] = mode;
  await api.storage.local.set({ openingModes });
}
action("#enable", () => opening("always"));
action("#disable", () => opening("manual"));
