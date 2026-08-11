/* ==========================================================================
   迷障圖鑑：查看、強化、裝備成「警覺」
   ========================================================================== */
(function (LQ) {
  "use strict";

  function esc(s) { return LQ.ui.modal.esc(s); }

  function cell(def) {
    var got = LQ.illusions.has(def.id);
    var on = LQ.illusions.isEquipped(def.id);
    var cls = "codex__cell " + (got ? (on ? "codex__cell--got codex__cell--on" : "codex__cell--got") : "codex__cell--locked");
    return '<button type="button" class="' + cls + '" data-ill="' + def.id + '">' +
      "<i>" + (got ? esc(def.glyph) : "？") + "</i>" +
      "<b>" + (got ? esc(def.name) : "未識破") + "</b>" +
      "<small>" + (got ? ("Lv." + LQ.illusions.level(def.id) + (on ? "・警覺中" : "")) : "破解後解鎖") + "</small>" +
    "</button>";
  }

  /** 點一個迷障：看說明、強化、裝備 */
  function open(id) {
    var def = LQ.data.illusionById(id);
    if (!def) return;
    if (!LQ.illusions.has(id)) {
      LQ.ui.modal.modal({
        title: "還沒識破",
        body: "<p>這個迷障你還沒遇過。<br>走過對應的門，或在迷障追跡裡遇見它，就能收進圖鑑。</p>",
        acts: [{ label: "知道了", kind: "btn--ghost" }]
      });
      return;
    }

    var lv = LQ.illusions.level(id);
    var cost = LQ.illusions.upgradeCost(id);
    var acts = [{ label: "關閉", kind: "btn--ghost" }];

    if (cost !== null) {
      acts.push({
        label: "強化 " + cost + " 碎片", kind: "btn--ice", close: false,
        onClick: function () {
          if (LQ.illusions.upgrade(id)) {
            LQ.audio.coin();
            LQ.ui.modal.closeModal();
            LQ.ui.modal.toast(def.name + " 提升到 Lv." + LQ.illusions.level(id));
            LQ.ui.codex.render();
          } else {
            LQ.ui.modal.toast("記憶碎片不足", true);
          }
        }
      });
    }
    acts.push({
      label: LQ.illusions.isEquipped(id) ? "卸下警覺" : "裝備成警覺", kind: "btn--gold",
      onClick: function () {
        if (LQ.illusions.isEquipped(id)) {
          var s = LQ.state.d.equipped.indexOf(id);
          LQ.illusions.equip(s, null);
          LQ.ui.modal.toast("已卸下");
        } else {
          var slot = LQ.state.d.equipped[0] ? (LQ.state.d.equipped[1] ? 0 : 1) : 0;
          LQ.illusions.equip(slot, id);
          LQ.ui.modal.toast("已裝備到第 " + (slot + 1) + " 格");
        }
        LQ.ui.codex.render();
      }
    });

    LQ.ui.modal.modal({
      title: def.name + "　Lv." + lv,
      body:
        '<p style="color:var(--ember);font-size:15px">' + esc(def.whisper) + "</p>" +
        '<div class="card" style="margin:12px 0">' +
          '<div class="card__eyebrow">怎麼識破它</div>' +
          '<p class="card__note" style="color:var(--ink)">' + esc(def.counter) + "</p>" +
        "</div>" +
        '<p style="font-size:13px"><span class="tag tag--gold">' +
          esc(LQ.illusions.boonText(def, lv)) + "</span></p>",
      acts: acts
    });
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.codex = {
    render: function () {
      var d = LQ.state.d;
      var total = LQ.data.illusions.length;
      var got = Object.keys(d.illusions).length;

      var slots = d.equipped.map(function (id, i) {
        var def = id ? LQ.data.illusionById(id) : null;
        return '<div class="stat" style="text-align:center">' +
          "<small>警覺 " + (i + 1) + "</small>" +
          (def ? "<b style=\"font-size:16px\">" + esc(def.name) + "</b><p>" +
                 esc(LQ.illusions.boonText(def, LQ.illusions.level(id))) + "</p>"
               : "<b style=\"font-size:16px;color:var(--ink-faint)\">空</b><p>點下方圖鑑裝備</p>") +
        "</div>";
      }).join("");

      LQ.render(
        '<div class="sect"><h2>迷障圖鑑</h2><small>' + got + " / " + total + "</small></div>" +
        '<p style="font-size:13px;color:var(--ink-soft);margin-bottom:12px">' +
          "迷障是擋在思考前面的陷阱。你破解過的，就再也騙不了你——" +
          "把它裝備成「警覺」，它反而會幫你。</p>" +

        '<div class="stats">' + slots + "</div>" +

        '<div class="sect"><h2>全部迷障</h2></div>' +
        '<div class="codex">' + LQ.data.illusions.map(cell).join("") + "</div>"
      );

      document.querySelectorAll("[data-ill]").forEach(function (b) {
        b.addEventListener("click", function () { LQ.audio.tap(); open(b.dataset.ill); });
      });
    }
  };

})(window.LQ = window.LQ || {});
