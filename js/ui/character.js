/* ==========================================================================
   人物：能力值、稱號、角色介紹
   ========================================================================== */
(function (LQ) {
  "use strict";

  function esc(s) { return LQ.ui.modal.esc(s); }

  var ORDER = ["kehua", "xiaowen", "bojun", "xiaoping", "dad", "grandpa"];

  function openTitles() {
    var d = LQ.state.d;
    var body = LQ.data.titles.map(function (t) {
      var owned = LQ.titles.owned(t.id);
      var on = d.titleId === t.id;
      var action = on ? "使用中" : (owned ? "換上" : (t.need + " 碎片"));
      return '<button type="button" class="row" data-title="' + t.id + '" style="margin-bottom:8px">' +
        "<i>" + (on ? "✦" : owned ? "◇" : "🔒") + "</i>" +
        "<div><b>" + esc(t.name) + "</b><p>" + esc(t.desc) + "<br>" +
        "起始思考力 +" + t.boon.startThink + "　記憶碎片 +" + t.boon.frag + "%</p></div>" +
        '<span class="row__val">' + esc(action) + "</span></button>";
    }).join("");

    LQ.ui.modal.modal({
      title: "稱號",
      body: body,
      acts: [{ label: "關閉", kind: "btn--ghost" }]
    });

    document.querySelectorAll("[data-title]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.dataset.title;
        if (LQ.titles.owned(id)) {
          LQ.titles.equip(id);
          LQ.ui.modal.toast("已換上「" + LQ.data.titleById(id).name + "」");
        } else if (LQ.titles.unlock(id)) {
          LQ.audio.coin();
          LQ.ui.modal.toast("解鎖「" + LQ.data.titleById(id).name + "」");
        } else {
          LQ.ui.modal.toast("記憶碎片不足", true);
          return;
        }
        LQ.ui.modal.closeModal();
        LQ.refreshTopbar();
        LQ.ui.character.render();
      });
    });
  }

  function openPerson(key) {
    var c = LQ.data.characters[key];
    LQ.ui.modal.modal({
      title: c.name + "　" + (c.role || ""),
      body:
        (c.art ? '<img src="' + c.art + '" alt="" style="width:64%;margin:0 auto 12px;">' : "") +
        '<p style="margin-bottom:10px">' +
          (c.traits || []).map(function (t) { return '<span class="tag tag--gold" style="margin-right:5px">' + esc(t) + "</span>"; }).join("") +
        "</p>" +
        "<p>" + esc(c.about || "") + "</p>",
      acts: [{ label: "關閉", kind: "btn--ghost" }]
    });
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.character = {
    render: function () {
      var d = LQ.state.d;
      var t = LQ.titles.current();
      var b = LQ.economy.boons();

      LQ.render(
        '<div class="sect"><h2>人物</h2></div>' +

        '<div class="card card--gold" style="display:flex;gap:14px;align-items:center">' +
          '<img src="assets/characters/kehua.webp" alt="陳可華" style="width:82px;flex:none">' +
          "<div><div class=\"card__eyebrow\">目前的你</div>" +
            '<h3 class="card__title" style="margin-bottom:2px">' + esc(t.name) + "</h3>" +
            '<p class="card__note">陳可華｜' + esc(t.desc) + "</p>" +
            '<button type="button" class="btn btn--ghost btn--sm" id="ch-titles" style="margin-top:10px">稱號管理</button>' +
          "</div>" +
        "</div>" +

        '<div class="sect"><h2>能力</h2></div>' +
        '<div class="stats">' +
          '<div class="stat"><small>心力</small><b>' + d.stamina + " / " + LQ.economy.staminaMax() + "</b>" +
            "<p>開門與追跡都要花心力。</p></div>" +
          '<div class="stat"><small>思考力上限</small><b>' + LQ.economy.thinkMax() + "</b>" +
            "<p>越高，可以嘗試的次數就越多。</p></div>" +
          '<div class="stat"><small>心之防線</small><b>' + LQ.economy.guardMax() + "</b>" +
            "<p>被說服動搖幾次還能站得住。</p></div>" +
          '<div class="stat"><small>起始加成</small><b>+' + b.startThink + "</b>" +
            "<p>來自稱號與已裝備的警覺。</p></div>" +
        "</div>" +

        '<div class="sect"><h2>身邊的人</h2><small>點一下看介紹</small></div>' +
        '<div class="folk">' +
          ORDER.map(function (k) {
            var c = LQ.data.characters[k];
            return '<button type="button" class="folk__card" data-person="' + k + '">' +
              '<img src="' + c.face + '" alt="">' +
              "<b>" + esc(c.name) + "</b><em>" + esc(c.role) + "</em>" +
              "<p>" + esc((c.traits || []).join("・")) + "</p></button>";
          }).join("") +
        "</div>"
      );

      document.getElementById("ch-titles").addEventListener("click", openTitles);
      document.querySelectorAll("[data-person]").forEach(function (b2) {
        b2.addEventListener("click", function () { LQ.audio.tap(); openPerson(b2.dataset.person); });
      });
    }
  };

})(window.LQ = window.LQ || {});
