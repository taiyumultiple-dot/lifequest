/* ==========================================================================
   心象測驗（全螢幕）
   夾在「章前劇情」跟「鑄鑰」之間的小互動：原本課本段落裡的 checkpoint
   題目搬過來，改成兩種玩法——羅盤（四選一，點一個方向）跟量規
   （拖出 1~5 的量表）。純自我覺察，沒有對錯，不影響鑄鑰或評分。

   u.checkin = { title, questions: [
     { type: "dial",  prompt, options:[4 個字串], hint }
     { type: "gauge", prompt, min, max, minLabel, maxLabel, hint }
   ]}
   ========================================================================== */
(function (LQ) {
  "use strict";

  function esc(s) { return LQ.ui.modal.esc(s); }

  var el = null;
  var cur = null;

  function render() {
    var q = cur.questions[cur.i];
    var dots = cur.questions.map(function (_, k) {
      return '<span class="' + (k <= cur.i ? "on" : "") + '"></span>';
    }).join("");

    el.innerHTML =
      '<div class="checkin__top">' +
        '<span class="checkin__chapter">' + esc(cur.title || "心象測驗") + "</span>" +
        '<button type="button" class="checkin__skip" id="ck-skip">跳過</button>' +
      "</div>" +
      '<div class="checkin__dots">' + dots + "</div>" +
      /* body 只負責捲動，置中交給裡面的 inner。直接在會捲動的容器上用
         justify-content: center，內容一超出高度上緣就會被裁掉而且捲不回去。 */
      '<div class="checkin__body">' +
        '<div class="checkin__inner">' +
          '<p class="checkin__prompt">' + esc(q.prompt) + "</p>" +
          (q.type === "gauge" ? gaugeHTML(q) : dialHTML(q)) +
          '<p class="checkin__note" id="ck-note"></p>' +
          '<button type="button" class="btn btn--gold checkin__go" id="ck-go" disabled>確定</button>' +
        "</div>" +
      "</div>";

    document.getElementById("ck-skip").addEventListener("click", finish);
    document.getElementById("ck-go").addEventListener("click", next);

    if (q.type === "gauge") wireGauge(q);
    else wireDial(q);
  }

  /* ---- 羅盤：四選一 --------------------------------------------------- */

  function dialHTML(q) {
    return '<div class="dial">' +
      '<div class="dial__ring"></div>' +
      '<div class="dial__hub">◈</div>' +
      q.options.map(function (opt, i) {
        return '<button type="button" class="dial__opt" data-pos="' + i + '" data-i="' + i + '">' +
          esc(opt) + "</button>";
      }).join("") +
    "</div>";
  }

  function wireDial(q) {
    var buttons = Array.prototype.slice.call(document.querySelectorAll(".dial__opt"));
    var go = document.getElementById("ck-go");
    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        buttons.forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        cur.answer = Number(b.dataset.i);
        go.disabled = false;
        showNote(q.hint);
        LQ.audio.tap();
      });
    });
  }

  /* ---- 量規：1~5 拖曳 -------------------------------------------------- */

  function gaugeHTML(q) {
    return '<div class="gauge__wrap">' +
        '<div class="gauge__side">' +
          '<span class="gauge__label gauge__label--max">' + esc(q.maxLabel || "") + "</span>" +
          '<span class="gauge__label">' + esc(q.minLabel || "") + "</span>" +
        "</div>" +
        '<div class="gauge">' +
          '<div class="gauge__frame" id="ck-gframe">' +
            '<div class="gauge__fill" id="ck-gfill" style="height:0%"></div>' +
            '<div class="gauge__handle" id="ck-ghandle" style="bottom:0%"></div>' +
          "</div>" +
          '<div class="gauge__value" id="ck-gvalue">—</div>' +
        "</div>" +
      "</div>";
  }

  function wireGauge(q) {
    var frame = document.getElementById("ck-gframe");
    var fill = document.getElementById("ck-gfill");
    var handle = document.getElementById("ck-ghandle");
    var valueEl = document.getElementById("ck-gvalue");
    var go = document.getElementById("ck-go");
    var min = q.min || 1, max = q.max || 5;

    function setFromY(clientY) {
      var rect = frame.getBoundingClientRect();
      var pct = 1 - (clientY - rect.top) / rect.height;
      pct = Math.max(0, Math.min(1, pct));
      var val = Math.round(min + pct * (max - min));
      var snap = (val - min) / (max - min);
      fill.style.height = (snap * 100) + "%";
      handle.style.bottom = (snap * 100) + "%";
      valueEl.textContent = val;
      cur.answer = val;
      go.disabled = false;
    }

    /* 用 pointer capture 而不是往 document 掛 move/up：手指拖出量規外面
       （甚至移出視窗）照樣收得到事件，而且監聽器都掛在元件自己身上，
       換下一題整段 innerHTML 換掉就一起消失，不會殘留到下一題。 */
    var dragging = false;

    frame.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      dragging = true;
      try { frame.setPointerCapture(e.pointerId); } catch (err) { /* 沒有這個 pointer 就算了 */ }
      setFromY(e.clientY);
    });

    frame.addEventListener("pointermove", function (e) {
      if (dragging) setFromY(e.clientY);
    });

    function release() {
      if (!dragging) return;
      dragging = false;
      showNote(q.hint);
      LQ.audio.tap();
    }
    frame.addEventListener("pointerup", release);
    frame.addEventListener("pointercancel", release);
  }

  /* ---- 共用 ------------------------------------------------------------ */

  function showNote(text) {
    var note = document.getElementById("ck-note");
    if (!note || !text) return;
    note.textContent = text;
    note.classList.add("show");
  }

  function next() {
    cur.i += 1;
    cur.answer = undefined;
    if (cur.i >= cur.questions.length) { finish(); return; }
    render();
  }

  function finish() {
    if (!cur) return;
    el.hidden = true;
    el.innerHTML = "";
    var cb = cur.onDone;
    cur = null;
    if (cb) cb();
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.checkin = {
    /** u 是整關資料（要有 u.checkin），done 是播完/跳過之後呼叫 */
    play: function (u, done) {
      var cfg = u && u.checkin;
      if (!cfg || !cfg.questions || !cfg.questions.length) { done(); return; }
      el = document.getElementById("checkin");
      cur = { title: cfg.title, questions: cfg.questions, i: 0, onDone: done, answer: undefined };
      el.hidden = false;
      render();
    }
  };

})(window.LQ = window.LQ || {});
