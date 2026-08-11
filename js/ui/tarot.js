/* ==========================================================================
   心象牌
   ---------------------------------------------------------------------------
   牌不預測，牌只提問。翻開之後真正重要的是最下面那一欄（ask）。

   同一天、同一個牌陣，重開會拿到同一組牌（種子綁日期），
   這樣「今天的牌」才有份量——想換就得等明天，或者自己按重抽。
   ========================================================================== */
(function (LQ) {
  "use strict";

  function esc(s) { return LQ.ui.modal.esc(s); }
  function nl2br(s) { return LQ.ui.modal.nl2br(s); }

  /** 每個牌陣讀完之後的統整提問（放這裡，資料檔保持乾淨）*/
  var FINAL_ASK = {
    one:   null,   // 一張牌就用那張牌自己的提問
    three: "三張擺在一起，哪一張最讓你不舒服？為什麼是它？",
    five:  "五個面向裡，哪一個你最不想回答？那一個通常就是最需要回答的。"
  };

  var REV_RATE = 0.4;          // 逆位機率

  var view = { spread: null, cards: null, flipped: null };

  function spreadById(id) {
    var s = LQ.data.tarotSpreads;
    for (var i = 0; i < s.length; i++) if (s[i].id === id) return s[i];
    return null;
  }

  /** 抽一組牌。daily = true 時綁日期（同一天結果相同）*/
  function makeDraw(spread, daily) {
    var total = LQ.data.tarot.length;
    var idx = daily
      ? LQ.oracle.pickToday(total, spread.cards, "tarot-" + spread.id)
      : LQ.oracle.pickRandom(total, spread.cards);
    var rng = daily ? LQ.oracle.rngToday("tarot-rev-" + spread.id) : Math.random;
    return idx.map(function (i) {
      return { n: LQ.data.tarot[i].n, rev: rng() < REV_RATE };
    });
  }

  function saveDraw(spread, cards) {
    LQ.state.d.oracle.tarot = { date: LQ.state.today(), spread: spread.id, cards: cards };
    LQ.state.save();
    return cards;
  }

  /** 今天這個牌陣已經抽過就沿用，沒有才抽新的 */
  function ensureDraw(spread) {
    var t = LQ.state.d.oracle.tarot;
    if (t && t.date === LQ.state.today() && t.spread === spread.id &&
        Array.isArray(t.cards) && t.cards.length === spread.cards) {
      return t.cards;
    }
    return saveDraw(spread, makeDraw(spread, true));
  }

  /* ---- 畫面：選牌陣 ------------------------------------------------- */

  function renderPick() {
    var t = LQ.state.d.oracle.tarot;
    var drewToday = t && t.date === LQ.state.today() && t.cards;

    LQ.render(
      '<div class="sect"><h2>塔羅・心象牌</h2><small>大阿爾克那 22 張</small></div>' +

      '<div class="card">' +
        '<p class="card__note">這些牌不會告訴你未來會發生什麼。' +
        "牌面是一個曖昧的意象，你在解釋它的時候，其實是在說自己的事。<br><br>" +
        "所以翻開之後，最重要的不是牌義，是最下面那一句<b>它問你的話</b>。</p>" +
      "</div>" +

      '<div class="sect"><h2>選一個牌陣</h2></div>' +
      '<div class="rows">' +
        LQ.data.tarotSpreads.map(function (s) {
          var isCurrent = drewToday && t.spread === s.id;
          return '<button type="button" class="row" data-spread="' + s.id + '"><i>✦</i>' +
            "<div><b>" + esc(s.name) + "</b><p>" + esc(s.desc) + "</p></div>" +
            '<span class="row__val">' + (isCurrent ? "今日已抽" : s.cards + " 張") + "</span></button>";
        }).join("") +
      "</div>" +

      '<p style="font-size:12.5px;color:var(--ink-faint);margin-top:14px;line-height:1.9">' +
        "同一天抽同一個牌陣，拿到的會是同一組牌。想換，等明天，或者按「重新抽」。</p>" +

      LQ.ui.oracle.backHTML("oracle")
    );

    document.querySelectorAll("[data-spread]").forEach(function (b) {
      b.addEventListener("click", function () {
        LQ.audio.tap();
        openSpread(b.dataset.spread);
      });
    });
  }

  /* ---- 畫面：牌桌 --------------------------------------------------- */

  function openSpread(id) {
    var spread = spreadById(id);
    if (!spread) { renderPick(); return; }
    view.spread = spread;
    view.cards = ensureDraw(spread);
    view.flipped = view.cards.map(function () { return false; });
    renderTable();
  }

  function renderTable() {
    var spread = view.spread;

    var slots = view.cards.map(function (c, i) {
      return '<div class="tcard" id="tc-' + i + '">' + backFace(spread, i) + "</div>";
    }).join("");

    LQ.render(
      '<div class="sect"><h2>' + esc(spread.name) + "</h2><small>" +
        view.cards.length + " 張</small></div>" +
      '<p style="font-size:13px;color:var(--ink-soft);margin-bottom:14px;line-height:1.9">' +
        esc(spread.desc) + "<br>" +
        '<span style="color:var(--ink-faint)">點一下卡片翻開。不用急著全部翻完。</span></p>' +

      '<div class="tcards">' + slots + "</div>" +

      '<div id="tarot-after"></div>' +

      '<div style="display:flex;gap:8px;margin-top:16px">' +
        '<button type="button" class="btn btn--ghost btn--sm" id="tr-again">重新抽一次</button>' +
        '<button type="button" class="btn btn--ghost btn--sm" id="tr-back" style="flex:1">← 換一個牌陣</button>' +
      "</div>"
    );

    bindFlips();

    document.getElementById("tr-back").addEventListener("click", function () {
      LQ.audio.tap();
      renderPick();
    });
    document.getElementById("tr-again").addEventListener("click", function () {
      LQ.ui.modal.confirm(
        "重新抽一次？",
        "現在這組牌會被換掉，換掉就回不來了。\n（每天的牌本來就會自己換，不重抽也可以。）",
        function () {
          LQ.audio.tap();
          view.cards = saveDraw(view.spread, makeDraw(view.spread, false));
          view.flipped = view.cards.map(function () { return false; });
          renderTable();
        },
        "重新抽"
      );
    });
  }

  /** 蓋著的牌 */
  function backFace(spread, i) {
    return '<button type="button" class="tcard__back" data-flip="' + i + '">' +
        '<span class="tcard__slot">' + esc(spread.slots[i] || ("第 " + (i + 1) + " 張")) + "</span>" +
        '<span class="tcard__mark">✦</span>' +
        '<span class="tcard__hint">點一下翻開</span>' +
      "</button>";
  }

  /** 翻開的牌 */
  function frontFace(spread, i) {
    var c = view.cards[i];
    var card = LQ.data.tarotById(c.n);
    if (!card) return '<div class="tcard__face">這張牌讀不到，抱歉。</div>';

    return '<div class="tcard__face">' +
        '<div class="tcard__slot">' + esc(spread.slots[i] || ("第 " + (i + 1) + " 張")) + "</div>" +
        '<div class="tcard__glyph"' + (c.rev ? ' style="transform:rotate(180deg)"' : "") + ">" +
          esc(card.glyph) + "</div>" +
        '<div class="tcard__name">' + esc(card.name) +
          '<span>' + esc(card.en) + "</span></div>" +
        '<div class="tcard__tags">' +
          '<span class="tag' + (c.rev ? "" : " tag--gold") + '">' + (c.rev ? "逆位" : "正位") + "</span>" +
          '<span class="tag">' + esc(card.theme) + "</span>" +
        "</div>" +
        '<p class="tcard__text">' + nl2br(c.rev ? card.reversed : card.upright) + "</p>" +
        '<div class="tcard__row"><b>生命課題</b><p>' + esc(card.lesson) + "</p></div>" +
        '<div class="tcard__row"><b>可能長這樣</b><p>' + esc(card.life) + "</p></div>" +
        '<div class="tcard__ask"><b>它問你</b><p>' + esc(card.ask) + "</p></div>" +
      "</div>";
  }

  function bindFlips() {
    document.querySelectorAll("[data-flip]").forEach(function (b) {
      b.addEventListener("click", function () {
        var i = Number(b.dataset.flip);
        if (view.flipped[i]) return;
        view.flipped[i] = true;
        LQ.audio.tap();
        var box = document.getElementById("tc-" + i);
        box.innerHTML = frontFace(view.spread, i);
        box.classList.add("tcard--open");
        maybeFinish();
      });
    });
  }

  /** 全部翻完才出現反思區 */
  function maybeFinish() {
    var allDone = view.flipped.every(function (f) { return f; });
    if (!allDone) return;

    var spread = view.spread;
    var q = FINAL_ASK[spread.id];
    var label;

    if (!q) {
      // 一張牌的牌陣，就用那張牌自己的提問
      var card = LQ.data.tarotById(view.cards[0].n);
      q = card ? card.ask : "今天這張牌讓你想到什麼？";
      label = "心象牌・" + (card ? card.name : spread.name);
    } else {
      label = "心象牌・" + spread.name;
    }

    var after = document.getElementById("tarot-after");
    after.innerHTML = LQ.ui.oracle.reflectHTML(q, "寫給自己看的，不用給任何人交代。");
    LQ.ui.oracle.bindReflect(label, q, function () { LQ.go("oracle"); });
    LQ.audio.good();
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.tarot = { render: renderPick };

})(window.LQ = window.LQ || {});
