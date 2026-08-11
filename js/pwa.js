/* ==========================================================================
   PWA：註冊 service worker，讓它可以安裝、離線也能玩
   用 file:// 直接開的時候會自動跳過（那種情況不需要 service worker）
   ========================================================================== */
(function () {
  "use strict";

  if (location.protocol === "file:") return;
  if (!("serviceWorker" in navigator)) return;

  // 被別的網站用 iframe 嵌進去時（例如放進 AI Studio 的 React 站台），
  // 不要註冊 service worker：外層站台有自己的快取策略，
  // 這裡再註冊一份只會互相干擾，而且 PWA 安裝本來就該由外層負責。
  try {
    if (window.self !== window.top) return;
  } catch (e) {
    return;   // 跨網域 iframe 連讀 top 都會被擋，那更不該註冊
  }

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function (e) {
      console.warn("[PWA] service worker 註冊失敗：", e);
    });
  });

  // 記下安裝提示，讓設定頁可以主動叫出來
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    window.LQ = window.LQ || {};
    window.LQ.installPrompt = e;
  });
})();
