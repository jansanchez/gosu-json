export const api = globalThis.browser ?? globalThis.chrome;
export async function send(message) {
  return api.runtime.sendMessage(message);
}
