const form = document.querySelector("#unlock-form");
const passwordInput = document.querySelector("#password");
const submitButton = document.querySelector("#unlock");
const statusNode = document.querySelector("#status");

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.classList.toggle("error", isError);
}

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function decryptBundle(password) {
  const response = await fetch("./site.enc", { cache: "no-store" });
  if (!response.ok) throw new Error("encrypted bundle is unavailable");

  const bundle = new Uint8Array(await response.arrayBuffer());
  const magic = new TextDecoder().decode(bundle.slice(0, 7));
  if (magic !== "AIVEL01" || bundle.length < 57) {
    throw new Error("encrypted bundle is invalid");
  }

  const view = new DataView(bundle.buffer, bundle.byteOffset, bundle.byteLength);
  const iterations = view.getUint32(8, false);
  const salt = bundle.slice(12, 28);
  const iv = bundle.slice(28, 40);
  const ciphertext = bundle.slice(40);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

async function loadIntoServiceWorker(payload) {
  if (!("serviceWorker" in navigator)) {
    throw new Error("service workers are unavailable");
  }

  await navigator.serviceWorker.register("./sw.js", { scope: "./" });
  const registration = await navigator.serviceWorker.ready;
  const worker = registration.active;
  if (!worker) throw new Error("service worker did not activate");

  const files = payload.files.map((file) => ({
    path: file.path,
    mime: file.mime,
    buffer: decodeBase64(file.data),
  }));
  const transfer = files.map((file) => file.buffer);
  const channel = new MessageChannel();
  const acknowledged = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("service worker timed out")), 10_000);
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timeout);
      if (event.data?.ok) resolve();
      else reject(new Error("service worker rejected the bundle"));
    };
  });
  worker.postMessage({ type: "LOAD_ENCRYPTED_SITE", files }, [channel.port2, ...transfer]);
  await acknowledged;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = passwordInput.value;
  if (!password) return;

  submitButton.disabled = true;
  passwordInput.disabled = true;
  setStatus("Расшифровываем страницу…");

  try {
    const payload = await decryptBundle(password);
    await loadIntoServiceWorker(payload);
    passwordInput.value = "";
    setStatus("Готово. Открываем…");
    const target = new URL("./app/", window.location.href);
    target.search = window.location.search;
    target.hash = window.location.hash;
    window.location.assign(target.href);
  } catch (error) {
    console.error("Unable to unlock the encrypted page", error);
    passwordInput.disabled = false;
    submitButton.disabled = false;
    passwordInput.select();
    setStatus("Не удалось открыть страницу. Проверьте пароль и попробуйте ещё раз.", true);
  }
});
