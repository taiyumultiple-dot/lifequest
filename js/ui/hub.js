/* ==========================================================================
   首頁：五扇門
   ========================================================================== */
(function (LQ) {
  "use strict";

  function esc(s) { return LQ.ui.modal.esc(s); }

  /** 找出玩家「現在該去哪一關」 */
  function nextUnit() {
    var list = LQ.data.units;
    for (var i = 0; i < list.length; i++) {
      if (!LQ.state.isCleared(list[i].id) && LQ.levelflow.unlocked(list[i])) return list[i];
    }
    return null;
  }

  function goalLine() {
    var u = nextUnit();
    if (!u) return "五扇門都走過了。回頭看看那些你寫下的句子吧。";
    if (u.id === "p00") return "先從序章開始。你得想起自己是怎麼走到這裡的。";
    return "下一扇是「" + u.name + "」，主題是" + u.virtue + "。";
  }

  function doorHTML(u) {
    var cleared = LQ.state.isCleared(u.id);
    var open = LQ.levelflow.unlocked(u);
    var rec = LQ.state.unit(u.id);

    var cls = "door" + (cleared ? " door--clear" : "") + (open ? "" : " door--locked");
    var meta = [];
    if (cleared) meta.push('<span class="tag tag--jade">已通過 · ' + esc(rec.rank) + "</span>");
    if (u.virtue) meta.push('<span class="tag tag--gold">' + esc(u.virtue) + "</span>");
    if (!open) meta.push('<span class="tag">尚未解鎖</span>');
    else if (u.cost) meta.push('<span class="tag">心力 ' + u.cost + "</span>");

    return '<button type="button" class="' + cls + '" data-unit="' + u.id + '"' +
        (open ? "" : " disabled") + ">" +
      '<div class="door__row">' +
        '<div class="door__key"><i>' + (open ? (cleared ? "✓" : "⚿") : "🔒") + "</i><b>" +
          esc(u.no.replace("第", "").replace("扇門", "")) + "</b></div>" +
        '<div class="door__body">' +
          '<div class="door__eyebrow">' + esc(u.no) + "</div>" +
          '<div class="door__name">' + esc(u.name) + "</div>" +
          '<p class="door__desc">' + esc(u.desc) + "</p>" +
          '<div class="door__meta">' + meta.join("") + "</div>" +
        "</div>" +
      "</div></button>";
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.hub = {
    render: function () {
      var cleared = LQ.data.units.filter(function (u) { return LQ.state.isCleared(u.id); }).length;

      LQ.render(
        '<div class="hero">' +
          '<img class="hero__img" src="' + LQ.data.scene("gate-hall") + '" alt="矗立著五扇高聳大門的心靈迷宮">' +
          '<div class="hero__veil"></div>' +
          '<div class="hero__txt">' +
            '<div class="hero__mark">LIFE EDUCATION QUEST</div>' +
            '<h1 class="hero__title">五門・心靈迷宮</h1>' +
            '<p class="hero__line">穿過這五扇門，你才回得了家。</p>' +
          "</div>" +
        "</div>" +

        '<div class="goal">' +
          '<img class="goal__face" src="assets/characters/xiaowen-avatar.webp" alt="王小文">' +
          "<div><div class=\"goal__t\">目前的目標</div>" +
          '<p class="goal__d">' + esc(goalLine()) + "</p></div>" +
        "</div>" +

        '<div class="sect"><h2>門扉</h2><small>' + cleared + " / " + LQ.data.units.length + " 已通過</small></div>" +
        '<div class="doors">' + LQ.data.units.map(doorHTML).join("") + "</div>" +

        '<div class="sect"><h2>其他去處</h2></div>' +
        '<div class="rows">' +
          '<button type="button" class="row" data-go="daily"><i>◷</i>' +
            "<div><b>每日思辨</b><p>一天一個生活情境，想清楚就有記憶碎片。</p></div>" +
            '<span class="row__val">' + (LQ.state.d.daily.firstDone && LQ.state.d.daily.date === LQ.state.today() ? "今日已通" : "未完成") + "</span></button>" +
          '<button type="button" class="row" data-go="codex"><i>◈</i>' +
            "<div><b>迷障圖鑑</b><p>你破解過的思考陷阱，都收在這裡。</p></div>" +
            '<span class="row__val">' + Object.keys(LQ.state.d.illusions).length + " / " + LQ.data.illusions.length + "</span></button>" +
          '<button type="button" class="row" data-go="lessons"><i>▤</i>' +
            "<div><b>課本單元</b><p>六個單元對應五大素養，每個單元都連著一扇門。</p></div>" +
            '<span class="row__val">' + LQ.lessons.overall() + "%</span></button>" +
          '<button type="button" class="row" data-go="oracle"><i>✦</i>' +
            "<div><b>心象探索</b><p>心象牌、自我探索測驗、星座提問、價值羅盤。不預測未來，只給你一個角度。</p></div>" +
            '<span class="row__val">四樣</span></button>' +
          '<button type="button" class="row" data-go="journal"><i>✎</i>' +
            "<div><b>成長紀錄</b><p>你在每一關結束時寫下的句子。</p></div>" +
            '<span class="row__val">' + LQ.state.d.journal.length + " 則</span></button>" +
          '<button type="button" class="row" id="hub-help"><i>?</i>' +
            "<div><b>怎麼玩</b><p>鑄鑰規則圖解、數值說明、給老師的課堂建議。</p></div>" +
            '<span class="row__val">說明</span></button>' +
        "</div>"
      );

      document.getElementById("hub-help").addEventListener("click", function () {
        LQ.audio.tap();
        LQ.ui.help.open("forge");
      });

      document.querySelectorAll("[data-unit]").forEach(function (b) {
        b.addEventListener("click", function () {
          LQ.audio.tap();
          LQ.levelflow.enterUnit(b.dataset.unit);
        });
      });
    }
  };

})(window.LQ = window.LQ || {});
