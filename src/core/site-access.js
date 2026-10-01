// Match patterns grant a scheme and host, including every port on that host.
export function sitePattern(input) {
  const url = new URL(input);
  if (!/^https?:$/.test(url.protocol))
    throw new Error("Choose an HTTP or HTTPS site.");
  return `${url.protocol}//${url.hostname}/*`;
}
// Call directly from the click handler: request must precede any async work.
export function allowSite(api, input, request = false) {
  const access = { origins: [sitePattern(input)] };
  return request
    ? api.permissions.request(access)
    : api.permissions.contains(access);
}
