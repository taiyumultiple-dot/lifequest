/* ==========================================================================
   星座・每日提問
   ---------------------------------------------------------------------------
   這一頁真正想教的東西在最下面：巴納姆效應。
   星座只是入口——先讓學生覺得「好準」，再告訴他為什麼會覺得準。
   所以那段說明是固定顯示的，不摺疊、不藏起來。
   ========================================================================== */
(function (LQ) {
  "use strict";

  function esc(s) { return LQ.ui.modal.esc(s); }

  /** 資料裡用 **粗體** 標重點，跳脫之後再轉成 <b> */
  function rich(s) {
    return LQ.ui.modal.nl2br(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  }

  /* ---- 畫面：選星座 ------------------------------------------------- */

  function renderPick(isChange) {
    LQ.render(
      /* 海報放最前面：它本身就是一張十二星座盤，剛好當成這一頁的開場 */
      '<div class="zhero">' +
        '<img src="' + LQ.data.scene("zodiac-wheel") +
          '" alt="角色十二星座盤，迷宮裡的六個角色圍著星盤">' +
      "</div>" +

      '<div class="sect"><h2>' + (isChange ? "換一個星座" : "先選你的星座") + "</h2></div>" +

      '<div class="card">' +
        '<p class="card__note">選好之後，每天會有一個提問等你。' +
        "提問跟星座無關——星座只是開場白，問題才是重點。</p>" +
      "</div>" +

      '<div class="zgrid">' +
        LQ.data.zodiac.map(function (z) {
          return '<button type="button" class="zcell" data-z="' + z.id + '">' +
            '<span class="zcell__g">' + esc(z.glyph) + "</span>" +
            "<b>" + esc(z.name) + "</b>" +
            "<small>" + esc(z.date) + "</small>" +
          "</button>";
        }).join("") +
      "</div>" +

      LQ.ui.oracle.backHTML("oracle")
    );

    document.querySelectorAll("[data-z]").forEach(function (b) {
      b.addEventListener("click", function () {
        LQ.audio.tap();
        LQ.state.d.oracle.zodiac = b.dataset.z;
        LQ.state.save();
        renderMain();
      });
    });
  }

  /* ---- 畫面：今日 --------------------------------------------------- */

  function todayAsk() {
    var pool = LQ.data.zodiacAsks;
    return pool[LQ.oracle.pickToday(pool.length, 1, "zodiac-ask")[0]];
  }

  function renderMain() {
    var z = LQ.data.zodiacById(LQ.state.d.oracle.zodiac);
    if (!z) { renderPick(false); return; }

    var ask = todayAsk();
    var b = LQ.data.zodiacBarnum;

    LQ.render(
      /* 細長版海報，只露出星盤中央，當作這一頁的抬頭 */
      '<div class="zband"><img src="' + LQ.data.scene("zodiac-wheel") + '" alt=""></div>' +

      '<div class="sect"><h2>' + esc(z.name) + "</h2><small>" + esc(z.date) + "</small></div>" +

      /* 今日提問擺最上面，因為那才是每天要做的事 */
      '<div class="card card--gold">' +
        '<div class="card__eyebrow">今天的提問</div>' +
        '<h3 class="card__title" style="font-size:17px;line-height:1.8">' + esc(ask) + "</h3>" +
        '<p style="font-size:12px;color:var(--ink-faint);margin:10px 0 0">' +
          "每天換一題。今天重開幾次都是同一題。</p>" +
      "</div>" +

      LQ.ui.oracle.reflectHTML(ask, "寫今天真的發生的事，不用寫感想。") +

      '<div class="sect" style="margin-top:22px"><h2>別人常這樣說你</h2></div>' +

      '<div class="card">' +
        '<div class="card__eyebrow">' + esc(z.glyph) + "　常見說法</div>" +
        '<p class="card__note" style="color:var(--ink-soft)">' + esc(z.said) + "</p>" +
      "</div>" +

      '<div class="card" style="margin-top:12px">' +
        '<div class="card__eyebrow">同一件事的另一面</div>' +
        '<p class="card__note" style="color:var(--ink);font-size:14.5px">' + esc(z.truth) + "</p>" +
      "</div>" +

      '<div class="card" style="margin-top:12px">' +
        '<div class="card__eyebrow">成長課題</div>' +
        '<p class="card__note">' + esc(z.lesson) + "</p>" +
      "</div>" +

      '<div class="card" style="margin-top:12px">' +
        '<div class="card__eyebrow">容易卡住的地方</div>' +
        '<p class="card__note">' + esc(z.stuck) + "</p>" +
      "</div>" +

      '<div class="card" style="margin-top:12px">' +
        '<div class="card__eyebrow">給你的問題</div>' +
        '<p class="card__note" style="color:var(--ink);font-size:14.5px">' + esc(z.ask) + "</p>" +
      "</div>" +

      /* 這一段是重點，不能藏 */
      '<div class="sect" style="margin-top:22px"><h2>然後，一個提醒</h2></div>' +
      '<div class="card card--gold">' +
        '<div class="card__eyebrow">思考練習</div>' +
        '<h3 class="card__title" style="font-size:16px">' + esc(b.title) + "</h3>" +
        '<p class="card__note" style="line-height:1.95">' + rich(b.body) + "</p>" +
        '<p class="card__note" style="color:var(--ice);margin-top:12px">' + esc(b.tryIt) + "</p>" +
      "</div>" +

      '<div style="display:flex;gap:8px;margin-top:16px">' +
        '<button type="button" class="btn btn--ghost btn--sm" id="zd-change">換星座</button>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-go="oracle" style="flex:1">← 回心象探索</button>' +
      "</div>"
    );

    LQ.oracle.markToday("zodiacDate");
    LQ.ui.oracle.bindReflect("星座・" + z.name, ask, function () { LQ.go("oracle"); });

    document.getElementById("zd-change").addEventListener("click", function () {
      LQ.audio.tap();
      renderPick(true);
    });
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.zodiac = {
    render: function () {
      if (LQ.state.d.oracle.zodiac) renderMain();
      else renderPick(false);
    }
  };

})(window.LQ = window.LQ || {});
