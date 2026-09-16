// Registro del Service Worker. Archivo aparte (no inline) por la CSP.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/service-worker.js").catch(function (error) {
      console.log("Error al registrar Service Worker:", error);
    });
  });
}
