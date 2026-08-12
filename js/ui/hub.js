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

        /* 這一頁只留「門」。原本底下那串「其他去處」已經移到「每日」，
           課本、心象、說明也各自有自己的導覽鈕，不必在這裡再列一次。 */
        '<p class="hub__foot">其他玩法收在下面的「每日」，' +
          "課本、心象探索、說明各有自己的按鈕。</p>"
      );

      document.querySelectorAll("[data-unit]").forEach(function (b) {
        b.addEventListener("click", function () {
          LQ.audio.tap();
          LQ.levelflow.enterUnit(b.dataset.unit);
        });
      });
    }
  };

})(window.LQ = window.LQ || {});
