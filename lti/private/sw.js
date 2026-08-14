const scopePath = new URL(self.registration.scope).pathname;
const appPrefix = `${scopePath}app/`;
let decryptedFiles = new Map();

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("message", (event) => {
  if (event.data?.type !== "LOAD_ENCRYPTED_SITE") return;

  decryptedFiles = new Map(
    event.data.files.map((file) => [
      file.path,
      { bytes: file.buffer, mime: file.mime },
    ]),
  );
  event.ports[0]?.postMessage({ ok: true });
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(appPrefix)) return;

  event.respondWith(
    (async () => {
      if (decryptedFiles.size === 0) {
        if (event.request.mode === "navigate") {
          return Response.redirect(self.registration.scope, 302);
        }
        return new Response("Locked", { status: 423 });
      }

      let filePath = url.pathname;
      if (filePath.endsWith("/")) filePath += "index.html";
      let file = decryptedFiles.get(filePath);
      if (!file && !pathExtension(filePath)) {
        file = decryptedFiles.get(`${filePath}.html`);
      }
      if (!file) return new Response("Not found", { status: 404 });

      return new Response(file.bytes, {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": file.mime,
          "X-Content-Type-Options": "nosniff",
        },
      });
    })(),
  );
});

function pathExtension(filePath) {
  const fileName = filePath.slice(filePath.lastIndexOf("/") + 1);
  return fileName.includes(".");
}
