/* ==========================================================================
   劇情播放（全螢幕）
   一格一格播，點畫面繼續；遇到抉擇就停下來等玩家選。
   ========================================================================== */
(function (LQ) {
  "use strict";

  var el = null;
  var cur = null;

  function esc(s) { return LQ.ui.modal.esc(s); }
  function nl2br(s) { return LQ.ui.modal.nl2br(s); }

  function who(id) {
    var c = LQ.data.characters[id];
    return c || LQ.data.characters.narrator;
  }

  /** 畫出目前這一格 */
  function render() {
    var b = cur.beats[cur.i];
    var person = who(b.who);
    var isNarr = !b.who || b.who === "narrator";

    var dots = cur.beats.map(function (_, k) {
      return '<span class="' + (k <= cur.i ? "on" : "") + '"></span>';
    }).join("");

    el.innerHTML =
      '<div class="story__stage">' +
        (b.img ? '<img class="story__img" src="' + LQ.data.scene(b.img) + '" alt="">' : "") +
        '<div class="story__grad"></div>' +
        '<div class="story__top">' +
          '<span class="story__chapter">' + esc(cur.chapter || "") + "</span>" +
          (cur.canSkip ? '<button type="button" class="story__skip" id="story-skip">跳過劇情</button>' : "") +
        "</div>" +
      "</div>" +
      '<div class="story__box"><div class="story__panel">' +
        (isNarr ? "" :
          '<div class="story__who">' +
            (person.face ? '<img src="' + person.face + '" alt="">' : "") +
            "<b>" + esc(person.name) + "</b>" +
            (person.role ? "<span>" + esc(person.role) + "</span>" : "") +
          "</div>") +
        '<p class="story__text' + (isNarr ? " story__text--narr" : "") + '" id="story-text"></p>' +
        '<div id="story-extra"></div>' +
        '<div class="story__next" id="story-next">' +
          '<span class="story__dots">' + dots + "</span>" +
          "<span>點擊繼續</span><i>▼</i>" +
        "</div>" +
      "</div></div>";

    if (cur.canSkip) {
      document.getElementById("story-skip").addEventListener("click", function (e) {
        e.stopPropagation();
        finish();
      });
    }

    type(document.getElementById("story-text"), b.text || "", function () {
      if (b.choice) showChoice(b.choice);
    });
  }

  /** 打字機效果；再點一次會直接顯示完整內容 */
  var typing = null;
  function type(node, text, done) {
    clearInterval(typing);
    var html = nl2br(text);
    // 逐字顯示純文字，換行等打完再一次套上
    var plain = String(text);
    var i = 0;
    node.textContent = "";
    cur.typing = true;

    typing = setInterval(function () {
      i += 2;
      node.textContent = plain.slice(0, i);
      if (i >= plain.length) {
        clearInterval(typing);
        node.innerHTML = html;
        cur.typing = false;
        if (done) done();
      }
    }, 18);

    cur.finishTyping = function () {
      clearInterval(typing);
      node.innerHTML = html;
      cur.typing = false;
      if (done) done();
    };
  }

  /** 抉擇：選完顯示「後果」，再點一次才往下走 */
  function showChoice(choice) {
    document.getElementById("story-next").style.display = "none";
    var extra = document.getElementById("story-extra");
    extra.innerHTML =
      '<p style="font-size:13px;color:var(--ink-faint);margin:10px 0 0">' + esc(choice.prompt || "") + "</p>" +
      '<div class="choices">' +
        choice.options.map(function (o, k) {
          return '<button type="button" class="choice" data-op="' + k + '">' + esc(o.label) + "</button>";
        }).join("") +
      "</div>";

    cur.waiting = true;

    extra.querySelectorAll("[data-op]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var op = choice.options[Number(btn.dataset.op)];
        LQ.audio.good();
        extra.innerHTML =
          '<div class="choice__after"><b>你選擇了</b>' + esc(op.label) +
          '<div style="height:8px"></div>' + nl2br(op.after || "") + "</div>";
        cur.waiting = false;
        document.getElementById("story-next").style.display = "";
      });
    });
  }

  function next() {
    if (!cur) return;                        // 已經播完了（例如最後一格被連點兩下）
    if (cur.waiting) return;                 // 抉擇還沒選，不能跳過
    if (cur.typing) { cur.finishTyping(); return; }
    cur.i += 1;
    if (cur.i >= cur.beats.length) { finish(); return; }
    LQ.audio.tap();
    render();
  }

  function finish() {
    if (!cur) return;
    clearInterval(typing);
    el.hidden = true;
    el.innerHTML = "";
    var cb = cur && cur.onDone;
    cur = null;
    if (cb) cb();
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.story = {
    init: function () {
      el = document.getElementById("story");
      el.addEventListener("click", function (e) {
        if (e.target.closest(".choice") || e.target.closest(".story__skip")) return;
        next();
      });
    },

    /**
     * 播一段劇情。
     * @param {object} o { chapter, beats:[], canSkip:boolean, onDone:function }
     */
    play: function (o) {
      cur = { chapter: o.chapter, beats: o.beats || [], i: 0,
              canSkip: o.canSkip !== false, onDone: o.onDone,
              typing: false, waiting: false };
      if (!cur.beats.length) { finish(); return; }
      el.hidden = false;
      render();
    }
  };

})(window.LQ = window.LQ || {});
