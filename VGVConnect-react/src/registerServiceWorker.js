export function registerServiceWorker() {
  const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const canRegister = "serviceWorker" in navigator && (isLocalhost || window.location.protocol === "https:");
  if (!canRegister) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // La app sigue funcionando aunque el navegador no permita registrar el service worker.
    });
  });
}