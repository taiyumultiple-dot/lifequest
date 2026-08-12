/* ==========================================================================
   星座・今日運勢 + AI 對話
   ---------------------------------------------------------------------------
   這一頁真正想教的東西在最下面：巴納姆效應。
   星座只是入口——先讓學生覺得「好準」，再告訴他為什麼會覺得準。
   所以那段說明是固定顯示的，不摺疊、不藏起來。

   今日運勢是 AI 依「星座 + 今天日期」生成的，不是抓來的資料庫，
   也刻意不寫「你會遇到貴人」這種預言句（見 aichat.js 與後端的提示詞）。
   對話才是這一頁的主體：學生講今天發生的事，AI 幫他把話問回自己身上。
   ========================================================================== */
(function (LQ) {
  "use strict";

  function esc(s) { return LQ.ui.modal.esc(s); }

  /** 資料裡用 **粗體** 標重點，跳脫之後再轉成 <b> */
  function rich(s) {
    return LQ.ui.modal.nl2br(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  }

  /** 2026-08-12 → 2026.08.12（星期三）*/
  function prettyDate(iso) {
    var p = String(iso).split("-");
    if (p.length !== 3) return iso;
    var wd = ["日", "一", "二", "三", "四", "五", "六"];
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return p[0] + "." + p[1] + "." + p[2] + "（星期" + wd[d.getDay()] + "）";
  }

  /* ---- 對話狀態（只活在這一頁，換頁就重來）------------------------- */

  var chat = [];        // [{role:"user"|"ai", text}]
  var busy = false;

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
            '<span class="zcell__pic">' +
              '<img src="' + LQ.data.zodiacImage(z.id) + '" alt="" loading="lazy">' +
              '<i class="zcell__g">' + esc(z.glyph) + "</i>" +
            "</span>" +
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
    var today = LQ.state.today();

    LQ.render(
      /* 這一頁的抬頭換成「你自己那一張」星座圖 */
      '<div class="zhero zhero--sign">' +
        '<img src="' + LQ.data.zodiacImage(z.id) + '" alt="' + esc(z.name) + '">' +
        '<div class="zhero__cap"><span>' + esc(z.glyph) + "</span><b>" + esc(z.name) +
          "</b><small>" + esc(z.date) + "</small></div>" +
      "</div>" +

      /* 今天的日期 + 今日運勢（AI 生成，載入前先放骨架）*/
      '<div class="zdate"><b>' + esc(prettyDate(today)) + "</b>" +
        '<span id="zd-src">今日運勢</span></div>' +

      '<div class="card card--gold" id="zd-luck">' +
        '<div class="card__eyebrow">今日運勢</div>' +
        '<p class="card__note" id="zd-luck-body">正在讀今天的星象……</p>' +
      "</div>" +

      /* 這一頁的主體：跟 AI 聊今天發生的事 */
      '<div class="sect" style="margin-top:22px"><h2>跟星象聊聊今天</h2>' +
        "<small>講你真的遇到的事</small></div>" +

      '<div class="chat" id="zd-chat"></div>' +

      '<div class="chat__bar">' +
        '<textarea id="zd-say" rows="2" placeholder="今天發生了什麼？直接寫下來就好。"></textarea>' +
        '<button type="button" class="btn btn--gold" id="zd-send">送出</button>' +
      "</div>" +

      '<p class="chat__warn">' +
        "這是 AI，不是老師也不是醫生，它說的話你可以不同意。" +
        "如果遇到真的很難的事——被傷害、想不開——請去找你信任的大人或學校輔導老師。</p>" +

      '<div style="display:flex;gap:8px;margin-top:12px">' +
        '<button type="button" class="btn btn--ghost btn--sm" id="zd-save-chat" style="flex:1">' +
          "把這段存進成長紀錄</button>" +
        '<button type="button" class="btn btn--ghost btn--sm" id="zd-clear">清空對話</button>' +
      "</div>" +

      '<div class="sect" style="margin-top:22px"><h2>別人常這樣說你</h2></div>' +

      /* 原本是五張並排的卡片，看起來像表格。
         改成一段可以從頭讀到尾的話：先引述、再翻面、最後兩個小提醒。 */
      '<div class="zsay">' +
        '<blockquote class="zsay__quote">' +
          '<span class="zsay__glyph">' + esc(z.glyph) + "</span>" +
          esc(z.said) +
        "</blockquote>" +

        '<p class="zsay__turn"><b>其實——</b>' + esc(z.truth) + "</p>" +

        '<div class="zsay__notes">' +
          '<div><span>成長課題</span><p>' + esc(z.lesson) + "</p></div>" +
          '<div><span>容易卡住</span><p>' + esc(z.stuck) + "</p></div>" +
        "</div>" +
      "</div>" +

      '<div class="card card--gold" style="margin-top:14px">' +
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

    document.getElementById("zd-change").addEventListener("click", function () {
      LQ.audio.tap();
      chat = [];
      renderPick(true);
    });

    /* --- 今日運勢：非同步補上，失敗就用離線版 --- */
    var srcTag = document.getElementById("zd-src");
    srcTag.textContent = LQ.ai.available() ? "今日運勢" : "今日運勢（離線版）";

    LQ.ai.horoscope(z, today).then(function (h) {
      var box = document.getElementById("zd-luck");
      if (!box) return;                       // 使用者已經離開這一頁
      if (h.offline) srcTag.textContent = "今日運勢（離線版）";
      box.innerHTML =
        '<div class="card__eyebrow">今日運勢' +
          (h.keywords && h.keywords.length
            ? "　" + h.keywords.map(function (k) { return "#" + esc(k); }).join(" ")
            : "") +
        "</div>" +
        (h.headline ? '<h3 class="card__title" style="font-size:17px;line-height:1.8">' +
          esc(h.headline) + "</h3>" : "") +
        '<p class="card__note" style="line-height:1.95">' + esc(h.body) + "</p>" +
        (h.tip ? '<p class="card__note" style="color:var(--ice);margin-top:10px">' +
          esc(h.tip) + "</p>" : "");
    });

    /* --- 對話 --- */

    renderChat();

    // 開場白：把今天的提問當成 AI 的第一句，接上原本每日一題的設計
    if (!chat.length) {
      chat.push({ role: "ai", text: "今天想聊什麼都可以。先問你一題：\n" + ask });
      renderChat();
    }

    function send() {
      if (busy) return;
      var box = document.getElementById("zd-say");
      var text = (box.value || "").trim();
      if (!text) { LQ.ui.modal.toast("先寫點東西再送", true); return; }

      LQ.audio.tap();
      chat.push({ role: "user", text: text });
      box.value = "";
      busy = true;
      renderChat(true);

      LQ.ai.chat(z, today, chat, text).then(function (r) {
        busy = false;
        chat.push({ role: "ai", text: r.text });
        renderChat();
      });
    }

    document.getElementById("zd-send").addEventListener("click", send);
    document.getElementById("zd-say").addEventListener("keydown", function (e) {
      // Enter 送出、Shift+Enter 換行（跟一般聊天室一致）
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    });

    document.getElementById("zd-clear").addEventListener("click", function () {
      LQ.audio.tap();
      chat = [];
      renderMain();
    });

    document.getElementById("zd-save-chat").addEventListener("click", function () {
      var mine = chat.filter(function (m) { return m.role === "user"; })
                     .map(function (m) { return m.text; }).join("\n");
      if (!mine.trim()) { LQ.ui.modal.toast("這段還沒有你寫的內容", true); return; }
      if (!LQ.oracle.reflect("星座・" + z.name, ask, mine)) {
        LQ.ui.modal.toast("存不進去", true);
        return;
      }
      LQ.audio.good();
      LQ.ui.modal.toast("已存進成長紀錄");
    });
  }

  /** 把 chat 陣列畫成泡泡。thinking 為真時多一顆「思考中」 */
  function renderChat(thinking) {
    var box = document.getElementById("zd-chat");
    if (!box) return;

    box.innerHTML = chat.map(function (m) {
      return '<div class="bubble bubble--' + (m.role === "user" ? "me" : "ai") + '">' +
        LQ.ui.modal.nl2br(esc(m.text)) + "</div>";
    }).join("") +
    (thinking ? '<div class="bubble bubble--ai bubble--wait"><i></i><i></i><i></i></div>' : "");

    box.scrollTop = box.scrollHeight;
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.zodiac = {
    render: function () {
      if (LQ.state.d.oracle.zodiac) renderMain();
      else renderPick(false);
    }
  };

})(window.LQ = window.LQ || {});
