/* ==========================================================================
   開場影片（全螢幕）
   登入完成後、進五扇門故事之前播一次。播完會記住，之後開遊戲不會再自動跳出，
   想重看的話從「設定」裡的「重播開場影片」再叫出來（那次不會影響記住的狀態）。
   ========================================================================== */
(function (LQ) {
  "use strict";

  var WATCHED_KEY = "lifequest_prologue_v1";
  var el = null;
  var onDone = null;

  function watched() {
    try { return localStorage.getItem(WATCHED_KEY) === "1"; } catch (e) { return false; }
  }
  function markWatched() {
    try { localStorage.setItem(WATCHED_KEY, "1"); } catch (e) { /* 忽略 */ }
  }

  function finish() {
    if (!el) return;
    var v = document.getElementById("pl-video");
    if (v) { v.pause(); v.removeAttribute("src"); v.load(); }
    el.hidden = true;
    el.innerHTML = "";
    var cb = onDone;
    onDone = null;
    if (cb) cb();
  }

  function render() {
    el.innerHTML =
      '<video id="pl-video" class="prologue__video" src="assets/videos/prologue.mp4" playsinline></video>' +
      '<button type="button" class="prologue__skip" id="pl-skip">跳過 ▸</button>';

    var v = document.getElementById("pl-video");

    v.addEventListener("ended", finish);

    // 有些瀏覽器會擋帶聲音的自動播放，擋下來的話顯示一顆播放鈕，點了再播
    var playPromise = v.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(function () { showPlayPrompt(v); });
    }

    document.getElementById("pl-skip").addEventListener("click", function (e) {
      e.stopPropagation();
      finish();
    });
  }

  function showPlayPrompt(v) {
    if (document.getElementById("pl-play")) return;
    var b = document.createElement("button");
    b.type = "button";
    b.id = "pl-play";
    b.className = "prologue__play";
    b.innerHTML = "▶<span>點這裡開始播放</span>";
    b.addEventListener("click", function () {
      v.play().then(function () { b.remove(); }).catch(function () { /* 還是不行就算了，留著跳過鈕 */ });
    });
    el.appendChild(b);
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.prologue = {
    watched: watched,

    /** 開場呼叫。已經看過就直接跳過，不會擋路。 */
    playOnce: function (done) {
      if (watched()) { done(); return; }
      el = document.getElementById("prologue");
      onDone = function () { markWatched(); done(); };
      el.hidden = false;
      render();
    },

    /** 設定頁「重播開場影片」用：純播放，不影響已讀記錄。 */
    replay: function (done) {
      el = document.getElementById("prologue");
      onDone = done || function () {};
      el.hidden = false;
      render();
    }
  };

})(window.LQ = window.LQ || {});
