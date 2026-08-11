/* ==========================================================================
   自我探索測驗
   ---------------------------------------------------------------------------
   結果頁刻意把四個向度的分數全部畫出來，而不是只給一個名稱。
   這樣學生看到的是「我這次比較偏這邊」，而不是「我就是這種人」。
   ========================================================================== */
(function (LQ) {
  "use strict";

  function esc(s) { return LQ.ui.modal.esc(s); }

  var run = { test: null, i: 0, picks: null };

  /* ---- 畫面：測驗清單 ----------------------------------------------- */

  function renderList() {
    var done = LQ.state.d.oracle.psych || {};

    LQ.render(
      '<div class="sect"><h2>自我探索測驗</h2><small>' +
        Object.keys(done).length + " / " + LQ.data.psychTests.length + " 已做過</small></div>" +

      '<div class="card">' +
        '<p class="card__note">這幾份測驗<b>不會給你一個型號</b>。' +
        "做完之後你會看到四個方向各拿了幾分——因為人不是一個類型，" +
        "是四個方向按不同比例組成的。<br><br>" +
        "隔一段時間再做一次，比例會變。那不是測驗不準，那是你動了。</p>" +
      "</div>" +

      '<div class="sect"><h2>選一份</h2></div>' +
      '<div class="rows">' +
        LQ.data.psychTests.map(function (t) {
          var rec = done[t.id];
          var val = rec ? esc(t.results[rec.top].name) : t.qs.length + " 題";
          return '<button type="button" class="row" data-test="' + t.id + '"><i>' +
            esc(t.glyph) + "</i>" +
            "<div><b>" + esc(t.name) + "</b><p>" + esc(t.eyebrow) + "｜" + esc(t.intro) + "</p></div>" +
            '<span class="row__val">' + val + "</span></button>";
        }).join("") +
      "</div>" +

      LQ.ui.oracle.backHTML("oracle")
    );

    document.querySelectorAll("[data-test]").forEach(function (b) {
      b.addEventListener("click", function () {
        LQ.audio.tap();
        start(b.dataset.test);
      });
    });
  }

  /* ---- 畫面：作答 --------------------------------------------------- */

  function start(id) {
    var t = LQ.data.psychTestById(id);
    if (!t) { renderList(); return; }
    run.test = t;
    run.i = 0;
    run.picks = [];
    renderQuestion();
  }

  function renderQuestion() {
    var t = run.test;
    var q = t.qs[run.i];
    var pct = Math.round((run.i / t.qs.length) * 100);

    LQ.render(
      '<div class="sect"><h2>' + esc(t.name) + "</h2><small>" +
        (run.i + 1) + " / " + t.qs.length + "</small></div>" +

      '<div class="bar bar--gold" style="margin-bottom:16px"><i style="width:' + pct + '%"></i></div>' +

      (run.i === 0
        ? '<div class="card" style="margin-bottom:14px"><p class="card__note">' +
          esc(t.note) + "　選最接近的那個就好，不用想太久。</p></div>"
        : "") +

      '<div class="card card--gold">' +
        '<div class="card__eyebrow">第 ' + (run.i + 1) + " 題</div>" +
        '<h3 class="card__title" style="font-size:17px;line-height:1.7">' + esc(q.q) + "</h3>" +
        '<div class="choices">' +
          q.opts.map(function (o, i) {
            return '<button type="button" class="choice" data-opt="' + i + '">' + esc(o.t) + "</button>";
          }).join("") +
        "</div>" +
      "</div>" +

      '<div style="display:flex;gap:8px;margin-top:16px">' +
        (run.i > 0
          ? '<button type="button" class="btn btn--ghost btn--sm" id="ps-prev">← 上一題</button>'
          : "") +
        '<button type="button" class="btn btn--ghost btn--sm" id="ps-quit" style="flex:1">先不做了</button>' +
      "</div>"
    );

    document.querySelectorAll("[data-opt]").forEach(function (b) {
      b.addEventListener("click", function () {
        LQ.audio.tap();
        run.picks[run.i] = q.opts[Number(b.dataset.opt)].k;
        run.i += 1;
        if (run.i >= t.qs.length) finish();
        else renderQuestion();
      });
    });

    var prev = document.getElementById("ps-prev");
    if (prev) prev.addEventListener("click", function () {
      LQ.audio.tap();
      run.i -= 1;
      renderQuestion();
    });
    document.getElementById("ps-quit").addEventListener("click", function () {
      LQ.audio.tap();
      renderList();
    });
  }

  /* ---- 畫面：結果 --------------------------------------------------- */

  function tally() {
    var t = run.test;
    var scores = {};
    t.order.forEach(function (k) { scores[k] = 0; });
    run.picks.forEach(function (k) {
      if (scores[k] !== undefined) scores[k] += 1;
    });
    // 平手時照 order 的順序取第一個，結果才不會每次重整就跳來跳去
    var top = t.order[0];
    t.order.forEach(function (k) {
      if (scores[k] > scores[top]) top = k;
    });
    return { scores: scores, top: top };
  }

  function finish() {
    var t = run.test;
    var r = tally();

    LQ.state.d.oracle.psych[t.id] = { top: r.top, scores: r.scores, at: Date.now() };
    LQ.state.save();

    var res = t.results[r.top];
    var total = t.qs.length;

    var bars = t.order.map(function (k) {
      var n = r.scores[k];
      var pct = Math.round((n / total) * 100);
      var isTop = k === r.top;
      return '<div style="margin-bottom:11px">' +
        '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px">' +
          "<b style=\"color:" + (isTop ? "var(--gold)" : "var(--ink-soft)") + '">' +
            esc(t.results[k].glyph) + "　" + esc(t.results[k].name) + "</b>" +
          '<small style="color:var(--ink-faint)">' + n + " / " + total + "</small>" +
        "</div>" +
        '<div class="bar ' + (isTop ? "bar--gold" : "bar--ice") + '"><i style="width:' + pct + '%"></i></div>' +
      "</div>";
    }).join("");

    LQ.render(
      '<div class="sect"><h2>' + esc(t.name) + "</h2><small>結果</small></div>" +

      '<div class="card card--gold">' +
        '<div class="card__eyebrow">這次你比較偏向</div>' +
        '<h3 class="card__title">' + esc(res.glyph) + "　" + esc(res.name) + "</h3>" +
        '<p class="card__note" style="color:var(--ink);font-size:14.5px">' + esc(res.sum) + "</p>" +
      "</div>" +

      '<div class="card" style="margin-top:12px">' +
        '<div class="card__eyebrow">四個方向</div>' + bars +
        '<p style="font-size:12px;color:var(--ink-faint);margin:4px 0 0;line-height:1.8">' +
          "沒有哪一條該是滿的。這只是你這一次的答案。</p>" +
      "</div>" +

      '<div class="card" style="margin-top:12px">' +
        '<div class="card__eyebrow">它幫得上你的地方</div>' +
        '<p class="card__note">' + esc(res.strength) + "</p>" +
      "</div>" +

      '<div class="card" style="margin-top:12px">' +
        '<div class="card__eyebrow">它的代價</div>' +
        '<p class="card__note">' + esc(res.watch) + "</p>" +
      "</div>" +

      LQ.ui.oracle.reflectHTML(res.ask, "誠實一點，這頁沒有人在評分。") +

      '<div style="display:flex;gap:8px;margin-top:16px">' +
        '<button type="button" class="btn btn--ghost btn--sm" id="ps-again">再做一次</button>' +
        '<button type="button" class="btn btn--ghost btn--sm" id="ps-list" style="flex:1">← 其他測驗</button>' +
      "</div>"
    );

    LQ.ui.oracle.bindReflect("測驗・" + t.name + "（" + res.name + "）", res.ask, function () {
      LQ.go("oracle");
    });

    document.getElementById("ps-again").addEventListener("click", function () {
      LQ.audio.tap();
      start(t.id);
    });
    document.getElementById("ps-list").addEventListener("click", function () {
      LQ.audio.tap();
      renderList();
    });

    LQ.audio.good();
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.psych = { render: renderList };

})(window.LQ = window.LQ || {});
