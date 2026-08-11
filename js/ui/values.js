/* ==========================================================================
   價值羅盤
   ---------------------------------------------------------------------------
   12 → 6 → 3 → 排序 → 一個會刺到第一名的情境。
   重點不在最後那三張是什麼，而在「刪掉的過程有多難」。
   所以每一步都會把被刪掉的那些列出來，不讓它們悄悄消失。
   ========================================================================== */
(function (LQ) {
  "use strict";

  function esc(s) { return LQ.ui.modal.esc(s); }

  var run = { stage: 0, keep6: [], keep3: [], rank: [] };

  function card(id) { return LQ.data.valueById(id); }

  /* ---- 共用：價值卡格子 --------------------------------------------- */

  function grid(ids, chosen, showOrder) {
    return '<div class="vgrid">' + ids.map(function (id) {
      var v = card(id);
      var at = chosen.indexOf(id);
      var on = at !== -1;
      return '<button type="button" class="vcard' + (on ? " vcard--on" : "") + '" data-v="' + id + '">' +
        (showOrder && on ? '<span class="vcard__no">' + (at + 1) + "</span>" : "") +
        '<span class="vcard__g">' + esc(v.glyph) + "</span>" +
        "<b>" + esc(v.name) + "</b>" +
        "<small>" + esc(v.desc) + "</small>" +
      "</button>";
    }).join("") + "</div>";
  }

  /** 被刪掉的那些，列出來給玩家看一眼 */
  function droppedHTML(all, kept) {
    var out = all.filter(function (id) { return kept.indexOf(id) === -1; });
    if (!out.length) return "";
    return '<div class="card" style="margin-top:14px">' +
        '<div class="card__eyebrow">這一輪你放掉的</div>' +
        '<p class="card__note">' + out.map(function (id) {
          var v = card(id);
          return esc(v.glyph + " " + v.name);
        }).join("、") + "</p>" +
      "</div>";
  }

  /* ---- 開場 --------------------------------------------------------- */

  function renderIntro() {
    var saved = LQ.state.d.oracle.values;

    LQ.render(
      '<div class="sect"><h2>價值羅盤</h2><small>12 → 6 → 3</small></div>' +

      '<div class="card card--gold">' +
        '<p class="card__note" style="color:var(--ink);font-size:14.5px">' +
          "價值觀不是用問卷測出來的，是用<b>放棄什麼</b>看出來的。<br><br>" +
          "人在什麼都不用犧牲的時候，會說自己重視所有好東西。" +
          "只有被逼著在兩個好東西之間選一個，真正的順序才會浮出來。</p>" +
        '<p class="card__note" style="margin-top:12px">' +
          "所以接下來只做一件事：一直逼你放掉。<br>" +
          "12 張留 6 張，6 張留 3 張，最後排出順序。</p>" +
      "</div>" +

      (saved ? savedHTML(saved) : "") +

      '<button type="button" class="btn btn--gold btn--block" id="vl-start" style="margin-top:16px">' +
        (saved ? "重做一次" : "開始") + "</button>" +

      LQ.ui.oracle.backHTML("oracle")
    );

    document.getElementById("vl-start").addEventListener("click", function () {
      LQ.audio.tap();
      run = { stage: 1, keep6: [], keep3: [], rank: [] };
      renderStage();
    });
  }

  function savedHTML(saved) {
    return '<div class="card" style="margin-top:12px">' +
        '<div class="card__eyebrow">你上次排出來的順序</div>' +
        saved.rank.map(function (id, i) {
          var v = card(id);
          return '<div style="display:flex;gap:10px;align-items:baseline;margin:7px 0">' +
            '<b style="color:var(--gold);font-size:15px">' + (i + 1) + "</b>" +
            "<div><b>" + esc(v.glyph + " " + v.name) + "</b>" +
            '<p style="font-size:12.5px;color:var(--ink-faint);margin:2px 0 0">' +
              esc(v.cost) + "</p></div>" +
          "</div>";
        }).join("") +
      "</div>";
  }

  /* ---- 三個階段 ----------------------------------------------------- */

  var STAGES = [
    null,
    { need: 6, from: "all",   title: "留下 6 張",
      note: "這 12 張你大概都想要。但只能留 6 張——刪掉的不是你不在乎，是你比較放得下。" },
    { need: 3, from: "keep6", title: "再留 3 張",
      note: "這一輪會比上一輪難。慢慢來。" },
    { need: 3, from: "keep3", title: "排出順序", order: true,
      note: "依序點下去：第一個點的是最重要的。點錯可以按重排。" }
  ];

  function poolOf(stage) {
    if (stage.from === "all") return LQ.data.values.map(function (v) { return v.id; });
    if (stage.from === "keep6") return run.keep6;
    return run.keep3;
  }

  function chosenOf(stage) {
    if (stage.from === "all") return run.keep6;
    if (stage.from === "keep6") return run.keep3;
    return run.rank;
  }

  function setChosen(stage, arr) {
    if (stage.from === "all") run.keep6 = arr;
    else if (stage.from === "keep6") run.keep3 = arr;
    else run.rank = arr;
  }

  function renderStage() {
    var stage = STAGES[run.stage];
    var pool = poolOf(stage);
    var chosen = chosenOf(stage);
    var ready = chosen.length === stage.need;

    LQ.render(
      '<div class="sect"><h2>' + esc(stage.title) + "</h2><small>" +
        chosen.length + " / " + stage.need + "</small></div>" +

      '<div class="card" style="margin-bottom:14px">' +
        '<p class="card__note">' + esc(stage.note) + "</p>" +
      "</div>" +

      grid(pool, chosen, !!stage.order) +

      '<div style="display:flex;gap:8px;margin-top:16px">' +
        '<button type="button" class="btn btn--ghost btn--sm" id="vl-reset">重排</button>' +
        '<button type="button" class="btn ' + (ready ? "btn--gold" : "btn--ghost") +
          ' btn--sm" id="vl-next" style="flex:1"' + (ready ? "" : " disabled") + ">" +
          (ready ? (run.stage === 3 ? "看結果" : "下一步") : "還要選 " + (stage.need - chosen.length) + " 張") +
        "</button>" +
      "</div>" +

      LQ.ui.oracle.backHTML("values", "放棄，回開頭")
    );

    document.querySelectorAll("[data-v]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.dataset.v;
        var arr = chosenOf(stage).slice();
        var at = arr.indexOf(id);
        if (at !== -1) arr.splice(at, 1);
        else if (arr.length < stage.need) arr.push(id);
        else { LQ.ui.modal.toast("已經選滿 " + stage.need + " 張了", true); return; }
        LQ.audio.tap();
        setChosen(stage, arr);
        renderStage();
      });
    });

    document.getElementById("vl-reset").addEventListener("click", function () {
      LQ.audio.tap();
      setChosen(stage, []);
      renderStage();
    });

    var next = document.getElementById("vl-next");
    if (ready) next.addEventListener("click", function () {
      LQ.audio.tap();
      if (run.stage === 3) finish();
      else { run.stage += 1; renderStage(); }
    });
  }

  /* ---- 結果 --------------------------------------------------------- */

  function finish() {
    var rank = run.rank.slice();
    LQ.state.d.oracle.values = { rank: rank, at: Date.now() };
    LQ.state.save();

    var top = card(rank[0]);
    var dil = LQ.data.valueDilemmas[rank[0]];
    var all = LQ.data.values.map(function (v) { return v.id; });

    LQ.render(
      '<div class="sect"><h2>你的順序</h2><small>這一次的</small></div>' +

      '<div class="card card--gold">' +
        rank.map(function (id, i) {
          var v = card(id);
          return '<div style="display:flex;gap:12px;align-items:baseline;margin:' +
              (i ? "14px" : "0") + ' 0 0">' +
            '<b style="color:var(--gold);font-size:20px;font-family:var(--font-title)">' +
              (i + 1) + "</b>" +
            "<div style=\"flex:1\"><b style=\"font-size:15.5px\">" +
              esc(v.glyph + " " + v.name) + "</b>" +
            '<p style="font-size:13px;color:var(--ink-soft);margin:3px 0 0">' + esc(v.desc) + "</p>" +
            '<p style="font-size:12.5px;color:var(--ink-faint);margin:5px 0 0">代價：' +
              esc(v.cost) + "</p></div>" +
          "</div>";
        }).join("") +
      "</div>" +

      droppedHTML(all, rank) +

      '<div class="sect" style="margin-top:22px"><h2>那就試一下</h2></div>' +
      '<div class="card">' +
        '<p style="font-size:12px;color:var(--ink-faint);margin:0 0 10px">' +
          "說自己重視什麼很容易。下面這一題，是專門用來刺你第一名的。</p>" +
        '<p class="card__note" style="color:var(--ink);font-size:14.5px;line-height:1.95">' +
          esc(dil.scene) + "</p>" +
        '<p style="font-size:13px;color:var(--ice);margin:12px 0 0;line-height:1.85">' +
          esc(dil.tension) + "</p>" +
      "</div>" +

      LQ.ui.oracle.reflectHTML(dil.ask, "沒有標準答案，但答案要是你真的做得到的。") +

      '<div style="display:flex;gap:8px;margin-top:16px">' +
        '<button type="button" class="btn btn--ghost btn--sm" id="vl-redo">重做一次</button>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-go="oracle" style="flex:1">← 回心象探索</button>' +
      "</div>"
    );

    LQ.ui.oracle.bindReflect("價值羅盤・" + top.name, dil.ask, function () { LQ.go("oracle"); });

    document.getElementById("vl-redo").addEventListener("click", function () {
      LQ.audio.tap();
      run = { stage: 1, keep6: [], keep3: [], rank: [] };
      renderStage();
    });

    LQ.audio.good();
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.values = { render: renderIntro };

})(window.LQ = window.LQ || {});
