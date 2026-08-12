/* ==========================================================================
   Service Worker：讓遊戲可以安裝、離線也能玩。

   快取策略（很重要，別改成全部 cache-first）：
     ・網頁與程式（html / css / js / json）→ 先走網路，失敗才用快取。
       這樣老師改了內容，學生一開就是最新版；沒網路時仍然打得開。
     ・圖片與字型 → 先用快取，沒有再抓。圖片不會變，這樣最快也最省流量。

   改版時把 CACHE 的版本號 +1，舊快取會自動被清掉。
   ========================================================================== */
var CACHE = "lifequest-v13";

/* 安裝時先抓起來的核心檔案（少一兩支也不會讓安裝失敗）*/
var CORE = [
  "./",
  "./index.html",
  "./auth.html",
  "./manifest.webmanifest",
  "./css/tokens.css",
  "./css/components.css",
  "./css/style.css",
  "./js/data/characters.js",
  "./js/data/illusions.js",
  "./js/data/titles.js",
  "./js/data/shop-items.js",
  "./js/data/daily-sets.js",
  "./js/data/units.js",
  "./js/data/tarot.js",
  "./js/data/psychtests.js",
  "./js/data/zodiac.js",
  "./js/data/values.js",
  "./js/data/lessons.js",
  "./js/config.js",
  "./js/state.js",
  "./js/cloud.js",
  "./js/audio.js",
  "./js/bgm.js",
  "./js/game/keyforge.js",
  "./js/game/economy.js",
  "./js/game/daily.js",
  "./js/game/illusions.js",
  "./js/game/titles.js",
  "./js/game/levelflow.js",
  "./js/game/hunt.js",
  "./js/game/oracle.js",
  "./js/game/lessons.js",
  "./js/ui/modal.js",
  "./js/ui/help.js",
  "./js/ui/login.js",
  "./js/ui/story.js",
  "./js/ui/forge.js",
  "./js/ui/hub.js",
  "./js/ui/daily.js",
  "./js/ui/codex.js",
  "./js/ui/character.js",
  "./js/ui/shop.js",
  "./js/ui/journal.js",
  "./js/ui/oracle.js",
  "./js/ui/tarot.js",
  "./js/ui/psych.js",
  "./js/ui/zodiac.js",
  "./js/ui/values.js",
  "./js/ui/lessons.js",
  "./js/ui/settings.js",
  "./js/main.js",
  "./js/pwa.js"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(CORE.map(function (u) {
        return c.add(u).catch(function () { /* 單一檔案失敗就跳過 */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/** 圖片、字型這類不會變的東西 */
function isStatic(url) {
  return /\.(png|jpe?g|webp|gif|svg|ico|woff2?|ttf|mp3|ogg)$/i.test(url.pathname);
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  if (url.origin !== location.origin) return;   // 外部字型交給瀏覽器自己處理

  /* --- 圖片等靜態資源：先看快取 --- */
  if (isStatic(url)) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) {
          if (res && res.status === 200) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); });
          }
          return res;
        });
      })
    );
    return;
  }

  /* --- 網頁與程式：先走網路，離線才退回快取 --- */
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        // 連快取都沒有時，導覽請求就退回首頁
        return hit || (req.mode === "navigate" ? caches.match("./index.html") : undefined);
      });
    })
  );
});
