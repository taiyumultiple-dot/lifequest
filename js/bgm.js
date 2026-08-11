/* ==========================================================================
   背景音樂
   ---------------------------------------------------------------------------
   三種模式，在 js/config.js 的 music.mode 切換：

     "off"      不放音樂（預設）
     "file"     播放 assets/audio/ 底下的音檔（推薦）
                → 完全離線可用、沒有廣告、載入快、沒有版權疑慮，
                  前提是你要放一首**你有權使用**的曲子。
     "youtube"  嵌入 YouTube 播放器播指定影片
                → 版權留在 YouTube 那邊（不是你在散布檔案），
                  但需要網路、可能會插廣告、離線就沒有音樂。

   兩種模式都要等使用者先點過畫面才會出聲（瀏覽器的自動播放限制）。
   ========================================================================== */
(function (LQ) {
  "use strict";

  var started = false;
  var yt = null;        // YouTube 用的 iframe
  var audio = null;     // 音檔用的 <audio>
  var ytReady = false;

  function cfg() {
    return (LQ.config && LQ.config.music) || { mode: "off" };
  }

  /**
   * 被別的網站用 iframe 嵌進去時（例如放進 AI Studio 的 React 站台），
   * 外層通常已經有自己的背景音樂，這裡再放一首會兩首疊在一起。
   * 所以嵌入時一律不放音樂，交給外層負責——跟 js/pwa.js 跳過
   * service worker 註冊是同一個理由。
   */
  function embedded() {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;   // 跨網域 iframe 連讀 top 都會被擋，那更該讓外層決定
    }
  }

  function mode() {
    if (embedded()) return "off";
    var m = cfg().mode;
    if (m === "youtube" && !cfg().youtubeId) return "off";
    if (m === "file" && !cfg().file) return "off";
    return m || "off";
  }

  function enabled() {
    return mode() !== "off" && LQ.state.d.music !== false;
  }

  function volume() {
    var v = LQ.state.d.musicVol;
    if (typeof v !== "number") v = (cfg().volume != null ? cfg().volume : 0.4);
    return Math.max(0, Math.min(1, v));
  }

  /* --- 音檔模式 ------------------------------------------------------ */

  function fileStart() {
    if (!audio) {
      audio = new Audio(cfg().file);
      audio.loop = true;
      audio.preload = "auto";
      audio.addEventListener("error", function () {
        console.warn("[音樂] 找不到音檔：" + cfg().file + "（把檔案放進 assets/audio/ 就會播）");
      });
    }
    audio.volume = volume();
    var p = audio.play();
    if (p && p.catch) p.catch(function () { /* 還沒互動過，等下一次 */ });
  }

  function fileStop() {
    if (audio) audio.pause();
  }

  /* --- YouTube 模式 -------------------------------------------------- */

  /**
   * 建一個 YouTube 播放器。
   * 用 enablejsapi 之後就能用 postMessage 控制播放與音量，
   * 作法跟你 taigi 專案的 BackgroundYouTubeAudio 一樣。
   */
  function ytStart() {
    if (!yt) {
      var id = cfg().youtubeId;
      var box = document.createElement("div");
      box.id = "bgm-yt";
      // 放在畫面外，但不是 display:none —— 有些瀏覽器會直接停掉隱藏的播放器
      box.style.cssText =
        "position:fixed;width:200px;height:120px;left:-9999px;top:0;" +
        "opacity:0;pointer-events:none;z-index:-1";
      box.innerHTML =
        '<iframe id="bgm-yt-frame" width="200" height="120" frameborder="0" ' +
        'allow="autoplay; encrypted-media" ' +
        'src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) +
        "?autoplay=1&loop=1&playlist=" + encodeURIComponent(id) +
        '&controls=0&modestbranding=1&playsinline=1&rel=0&enablejsapi=1"></iframe>';
      document.body.appendChild(box);
      yt = document.getElementById("bgm-yt-frame");
      yt.addEventListener("load", function () {
        ytReady = true;
        ytCmd("setVolume", [Math.round(volume() * 100)]);
        ytCmd("playVideo");
      });
    } else {
      ytCmd("setVolume", [Math.round(volume() * 100)]);
      ytCmd("playVideo");
    }
  }

  function ytCmd(func, args) {
    if (!yt || !yt.contentWindow) return;
    try {
      yt.contentWindow.postMessage(JSON.stringify({
        event: "command", func: func, args: args || []
      }), "*");
    } catch (e) { /* 播放器還沒準備好 */ }
  }

  function ytStop() {
    ytCmd("pauseVideo");
  }

  /* --- 對外介面 ------------------------------------------------------ */

  var BGM = {

    /** 使用者第一次點畫面時呼叫（瀏覽器要求先有互動才能出聲）*/
    start: function () {
      if (started) return;
      started = true;
      if (!enabled()) return;
      if (mode() === "file") fileStart();
      else if (mode() === "youtube") ytStart();
    },

    /** 設定頁改了開關或音量之後呼叫 */
    refresh: function () {
      if (!started) return;
      if (!enabled()) { this.stop(); return; }
      if (mode() === "file") { fileStart(); if (audio) audio.volume = volume(); }
      else if (mode() === "youtube") {
        if (!yt) ytStart();
        else { ytCmd("setVolume", [Math.round(volume() * 100)]); ytCmd("playVideo"); }
      }
    },

    stop: function () {
      fileStop();
      ytStop();
    },

    /** 這個裝置上到底有沒有音樂可放（設定頁要不要顯示開關）*/
    available: function () { return mode() !== "off"; },

    modeName: function () { return mode(); },

    /** 診斷用 */
    debug: function () {
      return {
        mode: mode(), started: started, enabled: enabled(),
        volume: volume(), ytReady: ytReady,
        audioPaused: audio ? audio.paused : null,
        audioSrcOk: audio ? (audio.error === null) : null
      };
    }
  };

  LQ.bgm = BGM;

})(window.LQ = window.LQ || {});
