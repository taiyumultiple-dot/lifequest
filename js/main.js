/* ==========================================================================
   啟動與畫面切換
   ========================================================================== */
(function (LQ) {
  "use strict";

  var elScreen, elNav, elTop, elBoot;
  var current = "hub";

  var SCREENS = {
    hub:       function () { LQ.ui.hub.render(); },
    daily:     function () { LQ.ui.daily.render(); },
    codex:     function () { LQ.ui.codex.render(); },
    character: function () { LQ.ui.character.render(); },
    shop:      function () { LQ.ui.shop.render(); },
    journal:   function () { LQ.ui.journal.render(); },
    settings:  function () { LQ.ui.settings.render(); },
    // 心象探索
    oracle:    function () { LQ.ui.oracle.render(); },
    tarot:     function () { LQ.ui.tarot.render(); },
    psych:     function () { LQ.ui.psych.render(); },
    zodiac:    function () { LQ.ui.zodiac.render(); },
    values:    function () { LQ.ui.values.render(); }
  };

  // 底部導覽七顆；沒有自己那一顆的畫面，歸在最接近的那一顆底下
  var NAV_OF = { hub: "hub", daily: "daily", codex: "hub", journal: "hub",
                 character: "character", shop: "shop", settings: "settings",
                 tarot: "tarot", zodiac: "zodiac",
                 oracle: "hub", psych: "hub", values: "hub" };

  /** 把 HTML 放進主畫面容器 */
  function render(html) {
    elScreen.innerHTML = html;
    elScreen.scrollTop = 0;
    window.scrollTo(0, 0);
    // 畫面裡任何 data-go 都能切頁
    elScreen.querySelectorAll("[data-go]").forEach(function (b) {
      b.addEventListener("click", function () { LQ.go(b.dataset.go); });
    });
  }

  /** 切到某個畫面 */
  function go(name) {
    if (!SCREENS[name]) name = "hub";
    current = name;
    SCREENS[name]();
    var navKey = NAV_OF[name] || name;
    elNav.querySelectorAll("[data-go]").forEach(function (b) {
      b.setAttribute("aria-current", b.dataset.go === navKey ? "true" : "false");
    });
    refreshTopbar();
  }

  /** 更新頂部資源列 */
  function refreshTopbar() {
    document.getElementById("res-stamina").textContent = LQ.state.d.stamina;
    document.getElementById("res-stamina-max").textContent = LQ.economy.staminaMax();
    document.getElementById("res-frag").textContent = LQ.state.d.frag;
    document.getElementById("topbar-title").textContent = LQ.titles.current().name;

    // 登入了就把名字與頭像換成本人的
    var nameEl = document.getElementById("topbar-name");
    var faceEl = document.getElementById("topbar-face");
    if (LQ.cloud.isSignedIn()) {
      nameEl.textContent = LQ.cloud.displayName() || "已登入";
      var av = LQ.cloud.avatar();
      if (av && faceEl.getAttribute("src") !== av) {
        faceEl.setAttribute("src", av);
        faceEl.onerror = function () { faceEl.src = "assets/characters/kehua-avatar.webp"; };
      }
    } else {
      nameEl.textContent = "陳可華";
    }
  }

  /** 如果使用者載入過內容包，就用它取代內建的六關 */
  function applyContentPack() {
    try {
      var raw = localStorage.getItem("lifequest_pack_v1");
      if (!raw) return;
      var arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) {
        LQ.data.units = arr;
        console.log("[內容包] 已套用自訂關卡，共 " + arr.length + " 關");
      }
    } catch (e) {
      console.warn("[內容包] 讀取失敗，改用內建內容：", e);
    }
  }

  function boot() {
    elScreen = document.getElementById("screen");
    elNav = document.getElementById("nav");
    elTop = document.getElementById("topbar");
    elBoot = document.getElementById("boot");

    LQ.state.load();
    applyContentPack();
    LQ.daily.sync();

    LQ.ui.modal.init();
    LQ.ui.story.init();
    LQ.ui.forge.init();

    elNav.querySelectorAll("[data-go]").forEach(function (b) {
      b.addEventListener("click", function () { LQ.audio.tap(); go(b.dataset.go); });
    });
    document.getElementById("btn-profile").addEventListener("click", function () { go("character"); });

    // 瀏覽器規定：使用者要先跟頁面互動過，才允許出聲，
    // 所以第一次點畫面（或按鍵）時才解鎖音效。
    function unlockAudio() {
      LQ.audio.unlock();
      LQ.bgm.start();
      document.removeEventListener("pointerdown", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    }
    document.addEventListener("pointerdown", unlockAudio);
    document.addEventListener("keydown", unlockAudio);

    // 存檔一有變動就排一次雲端上傳（沒登入的話這行不會做事）
    LQ.state.onChange(function () { LQ.cloud.schedulePush(); });
    // 登入狀態改變時，頂列的名字要跟著換
    LQ.cloud.onChange(function () { refreshTopbar(); });

    go("hub");

    // 收起開場畫面 → 進登入畫面 → 選完才顯示遊戲
    setTimeout(function () {
      elBoot.classList.add("boot--out");
      setTimeout(function () {
        elBoot.remove();
        LQ.ui.login.boot(function () {
          elTop.hidden = false;
          elScreen.hidden = false;
          elNav.hidden = false;
          go("hub");
        });
      }, 520);
    }, 700);

    // 開發用：在 console 打 LQ.keyforge.selfTest() 可以驗證核心引擎
    console.log("五門・心靈迷宮 已啟動。輸入 LQ.keyforge.selfTest() 可驗證鑄鑰引擎。");
  }

  LQ.render = render;
  LQ.go = go;
  LQ.refreshTopbar = refreshTopbar;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})(window.LQ = window.LQ || {});
