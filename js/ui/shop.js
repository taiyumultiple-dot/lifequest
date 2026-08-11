/* ==========================================================================
   補給站
   ========================================================================== */
(function (LQ) {
  "use strict";

  function esc(s) { return LQ.ui.modal.esc(s); }

  /** 買過幾次（永久加成用來算漲價）*/
  function bought(item) {
    if (item.kind !== "perm") return 0;
    var got = LQ.state.d.bonus[item.field] || 0;
    return Math.round(got / item.amount);
  }

  function price(item) {
    return Math.round(item.cost * Math.pow(item.growth || 1, bought(item)));
  }

  function soldOut(item) {
    return item.max != null && bought(item) >= item.max;
  }

  function buy(item) {
    if (soldOut(item)) { LQ.ui.modal.toast("這個已經買到上限了", true); return; }

    if (item.kind === "use" && item.restore) {
      if (LQ.state.d.stamina >= LQ.economy.staminaMax()) {
        LQ.ui.modal.toast("心力已經滿了", true); return;
      }
    }
    var p = price(item);
    if (!LQ.economy.spendFrag(p)) { LQ.ui.modal.toast("記憶碎片不足", true); return; }

    if (item.kind === "perm") {
      LQ.state.d.bonus[item.field] += item.amount;
      // 心力上限變高時，順便把新增的量補滿，才不會覺得白買
      if (item.field === "stamina") LQ.state.d.stamina += item.amount;
      LQ.state.save();
    } else if (item.restore) {
      LQ.economy.gainStamina(item.restore);
    }

    LQ.audio.coin();
    LQ.ui.modal.toast("買下了「" + item.name + "」");
    LQ.refreshTopbar();
    LQ.ui.shop.render();
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.shop = {
    render: function () {
      var d = LQ.state.d;

      LQ.render(
        '<div class="sect"><h2>補給站</h2><small>記憶碎片 ' + d.frag + "</small></div>" +
        '<p style="font-size:13px;color:var(--ink-soft);margin-bottom:14px">' +
          "在迷宮裡撿到的記憶碎片可以換成撐得更久的力氣。<br>" +
          "先把心力與思考力顧好，再去走更深的門。</p>" +

        '<div class="goods">' +
          LQ.data.shop.map(function (item) {
            var p = price(item);
            var out = soldOut(item);
            var lvText = item.kind === "perm"
              ? ("已購 " + bought(item) + " 次" + (item.max != null ? "／上限 " + item.max : ""))
              : "一次性消耗品";
            return '<div class="good">' +
              '<div class="good__ico">' + esc(item.glyph) + "</div>" +
              '<div class="good__body">' +
                "<b>" + esc(item.name) + "</b>" +
                "<p>" + esc(item.desc) + "</p>" +
                "<em>" + esc(lvText) + "・" + esc(item.note) + "</em>" +
              "</div>" +
              '<button type="button" class="btn btn--gold btn--sm" data-buy="' + item.id + '"' +
                (out ? " disabled" : "") + ">" + (out ? "已滿" : p + " ✦") + "</button>" +
            "</div>";
          }).join("") +
        "</div>"
      );

      document.querySelectorAll("[data-buy]").forEach(function (b) {
        b.addEventListener("click", function () { buy(LQ.data.shopById(b.dataset.buy)); });
      });
    }
  };

})(window.LQ = window.LQ || {});
