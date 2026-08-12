/* ==========================================================================
   塔羅・心象牌（AI 解牌）
   ---------------------------------------------------------------------------
   流程：寫下你的問題 → 從整副牌裡挑三張 → 翻開 → 看完整的解牌報告。

   三個位置沿用原本「三張・走過的路」的講法：
     你帶著什麼 / 你正在面對 / 你可以練習
   刻意不是「過去現在未來」——這副牌不預測未來，牌面是曖昧的意象，
   玩家在解釋它的時候其實是在說自己的事。報告的提示詞也照這個規矩寫。

   報告由 AI 產生，素材是 js/data/tarot.js 裡那 22 張牌自己的欄位
   （theme / upright / reversed / lesson / ask / life），不是去外面抓來的。
   連不到 AI 時會用本機版本，內容比較短但不會壞掉。
   ========================================================================== */
(function (LQ) {
  "use strict";

  function esc(s) { return LQ.ui.modal.esc(s); }
  function nl2br(s) { return LQ.ui.modal.nl2br(s); }

  var REV_RATE = 0.4;            // 逆位機率
  var NEED = 3;                  // 要選幾張
  var SLOTS = ["過去", "現在", "未來"];

  /* view.deck 是這一輪洗好的牌（22 張的順序），chosen 是玩家點的位置 */
  var view = { question: "", deck: [], chosen: [], cards: [], report: null, busy: false };

  function reset() {
    view = { question: "", deck: [], chosen: [], cards: [], report: null, busy: false };
  }

  /* ---- 1. 寫下問題 -------------------------------------------------- */

  function renderAsk() {
    LQ.render(
      '<div class="sect"><h2>塔羅・心象牌</h2><small>大阿爾克那 22 張</small></div>' +

      '<div class="card">' +
        '<p class="card__note">先把心裡的問題寫下來——寫得越具體，解出來的東西越像你的事。</p>' +
        '<div class="rules">' +
          '<div><b>牌是隨機的</b><p>洗好之後由你自己挑。同一個問題再問一次，' +
            "抽到的牌會不一樣，所以它不是預言。</p></div>" +
          '<div><b>解讀是電腦寫的</b><p>電腦把你的問題跟抽到的牌兜在一起，' +
            "寫成一段話。它是娛樂與自我對話的工具，不是答案。</p></div>" +
          '<div><b>決定還是你自己做</b><p>電腦不知道你的真實處境。' +
            "真的很困擾的事，請找懂你狀況的人談——家人、朋友，或學校的輔導老師。</p></div>" +
        "</div>" +
      "</div>" +

      '<div class="card card--gold" style="margin-top:14px">' +
        '<div class="card__eyebrow">你想問什麼</div>' +
        '<textarea id="tr-q" rows="3" placeholder="例如：我要不要跟他把話講開？／我最近一直很累，是怎麼回事？"></textarea>' +
        '<div style="display:flex;gap:8px;margin-top:12px">' +
          '<button type="button" class="btn btn--ghost btn--sm" id="tr-skip">沒有特定問題</button>' +
          '<button type="button" class="btn btn--gold btn--sm" id="tr-go" style="flex:1">開始抽牌</button>' +
        "</div>" +
        '<p style="font-size:11.5px;color:var(--ink-faint);margin:10px 0 0;line-height:1.85">' +
          "問題只會送去解牌，不會存進成長紀錄，也不會給老師看到。</p>" +
      "</div>" +

      LQ.ui.oracle.backHTML("oracle", "回心象探索（星座・測驗・價值羅盤）")
    );

    function start(q) {
      LQ.audio.tap();
      view.question = q;
      shuffle();
      renderPickCards();
    }

    document.getElementById("tr-go").addEventListener("click", function () {
      var q = (document.getElementById("tr-q").value || "").trim();
      if (!q) { LQ.ui.modal.toast("先寫下你想問的事", true); return; }
      start(q);
    });
    document.getElementById("tr-skip").addEventListener("click", function () {
      start("");
    });
  }

  /* ---- 2. 選三張 ---------------------------------------------------- */

  function shuffle() {
    var idx = LQ.oracle.pickRandom(LQ.data.tarot.length, LQ.data.tarot.length);
    view.deck = idx.map(function (i) {
      return { n: LQ.data.tarot[i].n, rev: Math.random() < REV_RATE };
    });
    view.chosen = [];
    view.cards = [];
    view.report = null;
  }

  function renderPickCards() {
    LQ.render(
      '<div class="sect"><h2>選三張</h2><small id="tr-count">0 / ' + NEED + "</small></div>" +

      (view.question
        ? '<div class="tq"><span>你問的是</span><b>' + esc(view.question) + "</b></div>"
        : '<div class="tq"><span>沒有特定問題</span><b>那就讓牌先開口。</b></div>') +

      '<p style="font-size:13px;color:var(--ink-soft);margin:0 0 14px;line-height:1.9">' +
        "牌已經洗好蓋起來了。不用想哪一張比較好——" +
        "<span style=\"color:var(--ink-faint)\">你伸手的那一下，就是這副牌要問你的第一個問題。</span></p>" +

      /* 排成扇形。角度由 index 對稱分佈，中間那張立正、兩側往外傾。 */
      '<div class="tfan">' +
        view.deck.map(function (c, i) {
          // 整個扇面固定張開 76 度，張數再多也不會超出畫面
          var mid = (view.deck.length - 1) / 2;
          var deg = view.deck.length > 1 ? (i - mid) * (76 / (view.deck.length - 1)) : 0;
          return '<button type="button" class="tfan__c" data-pick="' + i + '" ' +
            'style="--deg:' + deg.toFixed(2) + "deg;z-index:" + i + '">' +
            '<span class="tfan__mark">✦</span></button>';
        }).join("") +
      "</div>" +

      '<div style="display:flex;gap:8px;margin-top:18px">' +
        '<button type="button" class="btn btn--ghost btn--sm" id="tr-reshuffle">重新洗牌</button>' +
        '<button type="button" class="btn btn--gold btn--sm" id="tr-open" style="flex:1" disabled>' +
          "再選 " + NEED + " 張</button>" +
      "</div>"
    );

    document.querySelectorAll("[data-pick]").forEach(function (b) {
      b.addEventListener("click", function () {
        var i = Number(b.dataset.pick);
        var at = view.chosen.indexOf(i);

        if (at !== -1) {                       // 再點一次取消
          view.chosen.splice(at, 1);
          b.classList.remove("tfan__c--on");
          b.querySelector(".tfan__no") && b.querySelector(".tfan__no").remove();
        } else {
          if (view.chosen.length >= NEED) {
            LQ.ui.modal.toast("已經選滿三張了", true);
            return;
          }
          view.chosen.push(i);
          b.classList.add("tfan__c--on");
          var tag = document.createElement("span");
          tag.className = "tfan__no";
          tag.textContent = view.chosen.length;
          b.appendChild(tag);
        }

        LQ.audio.tap();
        refreshPickState();
      });
    });

    document.getElementById("tr-reshuffle").addEventListener("click", function () {
      LQ.audio.tap();
      shuffle();
      renderPickCards();
    });

    document.getElementById("tr-open").addEventListener("click", function () {
      if (view.chosen.length !== NEED) return;
      LQ.audio.good();
      view.cards = view.chosen.map(function (i) { return view.deck[i]; });
      renderTable();
    });
  }

  /** 選滿三張才讓「翻牌」可以按，順便更新編號 */
  function refreshPickState() {
    var n = view.chosen.length;
    document.getElementById("tr-count").textContent = n + " / " + NEED;

    var btn = document.getElementById("tr-open");
    btn.disabled = n !== NEED;
    btn.textContent = n === NEED ? "翻開這三張" : ("再選 " + (NEED - n) + " 張");

    // 取消之後，後面的編號要往前遞補
    document.querySelectorAll("[data-pick]").forEach(function (b) {
      var tag = b.querySelector(".tfan__no");
      if (!tag) return;
      tag.textContent = view.chosen.indexOf(Number(b.dataset.pick)) + 1;
    });
  }

  /* ---- 3. 翻牌 ------------------------------------------------------ */

  function renderTable() {
    LQ.render(
      '<div class="sect"><h2>你選的三張</h2><small>' +
        (view.question ? "扣著你的問題讀" : "先讀牌，再想問題") + "</small></div>" +

      (view.question
        ? '<div class="tq"><span>你問的是</span><b>' + esc(view.question) + "</b></div>"
        : "") +

      '<div class="tcards">' +
        view.cards.map(function (c, i) {
          return '<div class="tcard" id="tc-' + i + '">' +
            '<div class="tcard__back tcard__back--wait">' +
              '<span class="tcard__slot">' + esc(SLOTS[i]) + "</span>" +
              '<span class="tcard__mark">✦</span>' +
            "</div></div>";
        }).join("") +
      "</div>" +

      '<div id="tarot-after"></div>' +

      '<div style="display:flex;gap:8px;margin-top:16px">' +
        '<button type="button" class="btn btn--ghost btn--sm" id="tr-restart">換一個問題</button>' +
      "</div>"
    );

    document.getElementById("tr-restart").addEventListener("click", function () {
      LQ.audio.tap();
      reset();
      renderAsk();
    });

    // 一張一張翻，中間留一點時間，讓它像真的在翻牌
    view.cards.forEach(function (c, i) {
      setTimeout(function () {
        var box = document.getElementById("tc-" + i);
        if (!box) return;
        box.innerHTML = frontFace(i);
        box.classList.add("tcard--open");
        LQ.audio.tap();
        if (i === view.cards.length - 1) showReportButton();
      }, 420 * (i + 1));
    });
  }

  function frontFace(i) {
    var c = view.cards[i];
    var card = LQ.data.tarotById(c.n);
    if (!card) return '<div class="tcard__face">這張牌讀不到，抱歉。</div>';

    return '<div class="tcard__face">' +
        '<div class="tcard__slot">' + esc(SLOTS[i]) + "</div>" +
        '<div class="tcard__glyph"' + (c.rev ? ' style="transform:rotate(180deg)"' : "") + ">" +
          esc(card.glyph) + "</div>" +
        '<div class="tcard__name">' + esc(card.name) +
          "<span>" + esc(card.en) + "</span></div>" +
        '<div class="tcard__tags">' +
          '<span class="tag' + (c.rev ? "" : " tag--gold") + '">' + (c.rev ? "逆位" : "正位") + "</span>" +
          '<span class="tag">' + esc(card.theme) + "</span>" +
        "</div>" +
        '<p class="tcard__text">' + nl2br(c.rev ? card.reversed : card.upright) + "</p>" +
        '<div class="tcard__ask"><b>它問你</b><p>' + esc(card.ask) + "</p></div>" +
      "</div>";
  }

  /* ---- 4. 解牌報告 --------------------------------------------------- */

  function showReportButton() {
    var after = document.getElementById("tarot-after");
    if (!after) return;

    after.innerHTML =
      '<div class="card card--gold" style="margin-top:18px;text-align:center">' +
        '<div class="card__eyebrow">三張都翻開了</div>' +
        '<p class="card__note" style="margin-bottom:12px">' +
          "接下來把三張牌合起來讀，扣著你的問題給你一份完整的解牌。</p>" +
        '<button type="button" class="btn btn--gold btn--block" id="tr-report">看解牌報告</button>' +
      "</div>";

    document.getElementById("tr-report").addEventListener("click", function () {
      if (view.busy) return;
      view.busy = true;
      LQ.audio.tap();

      after.innerHTML =
        '<div class="card" style="margin-top:18px;text-align:center">' +
          '<p class="card__note" id="tr-wait">正在把三張牌讀成一段話……</p>' +
          '<div class="bubble bubble--wait" style="justify-content:center;background:none;border:none">' +
            "<i></i><i></i><i></i></div>" +
        "</div>";

      var payload = view.cards.map(function (c, i) {
        var card = LQ.data.tarotById(c.n);
        return {
          slot: SLOTS[i],
          name: card.name, en: card.en, rev: c.rev, theme: card.theme,
          meaning: c.rev ? card.reversed : card.upright,
          lesson: card.lesson, ask: card.ask, life: card.life
        };
      });

      LQ.ai.tarot(view.question, payload).then(function (r) {
        view.busy = false;
        view.report = r;
        renderReport(r);
      });
    });
  }

  /**
   * 解牌報告。刻意寫成一篇有標題的散文，而不是一格一格的卡片——
   * 三張牌要讀成一條線（回顧過往 → 來到現在 → 往前看 → 收尾），
   * 分格會把那條線切斷。
   */
  function renderReport(r) {
    var after = document.getElementById("tarot-after");
    if (!after) return;

    var d = String(LQ.state.today()).split("-");
    var stamp = d.length === 3 ? d[0] + " / " + d[1] + " / " + d[2] : "";

    var names = view.cards.map(function (c, i) {
      var card = LQ.data.tarotById(c.n);
      return '<div class="rcard">' +
          '<div class="rcard__glyph"' + (c.rev ? ' style="transform:rotate(180deg)"' : "") + ">" +
            esc(card.glyph) + "</div>" +
          "<b>" + esc(card.name) + "</b>" +
          "<small>" + esc(SLOTS[i]) + "・" + (c.rev ? "逆位" : "正位") + "</small>" +
        "</div>";
    }).join("");

    var para = function (t) {
      return t ? "<p>" + nl2br(esc(t)) + "</p>" : "";
    };

    after.innerHTML =
      '<div class="report">' +
        '<div class="report__cards">' + names + "</div>" +

        '<div class="report__head">' +
          '<span class="report__date">' + esc(stamp) + "</span>" +
          '<span class="report__src">' + (r.offline ? "離線版解讀" : "AI 解讀") + "</span>" +
        "</div>" +

        (view.question
          ? '<div class="tq"><span>你的問題</span><b>' + esc(view.question) + "</b></div>"
          : "") +

        '<h2 class="report__title">' + esc(r.title || "三張牌的話") + "</h2>" +

        '<div class="report__body">' +
          para(r.past) + para(r.present) + para(r.future) + para(r.summary) +
        "</div>" +

        '<div style="display:flex;gap:8px;margin-top:18px">' +
          '<button type="button" class="btn btn--ghost btn--sm" id="tr-redo" style="flex:1">' +
            "重新解讀</button>" +
          '<button type="button" class="btn btn--ghost btn--sm" id="tr-newq">換一個問題</button>' +
        "</div>" +

        '<p class="report__note">解牌是娛樂與自我對話的工具，不是預言，也沒辦法考量你真實的處境。' +
          "真的要做決定的時候，請找懂你狀況的人談。</p>" +
      "</div>" +
      '<div id="tarot-reflect"></div>';

    var q = r.ask || "讀完這三張牌，你最想記住哪一句？";
    document.getElementById("tarot-reflect").innerHTML =
      LQ.ui.oracle.reflectHTML(q, "寫給自己看的，不用給任何人交代。");
    LQ.ui.oracle.bindReflect("心象牌・三張", q, function () { LQ.go("oracle"); });

    // 同一組牌重新解一次（牌不變，換一種讀法）
    document.getElementById("tr-redo").addEventListener("click", function () {
      LQ.audio.tap();
      view.report = null;
      showReportButton();
      document.getElementById("tr-report").click();
    });
    document.getElementById("tr-newq").addEventListener("click", function () {
      LQ.audio.tap();
      reset();
      renderAsk();
    });

    LQ.audio.good();
    var el = document.querySelector(".report");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.tarot = {
    render: function () { reset(); renderAsk(); }
  };

})(window.LQ = window.LQ || {});
