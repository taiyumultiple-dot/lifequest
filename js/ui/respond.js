/* ==========================================================================
   角色回應（玩家寫完東西之後，遊戲裡的角色回他一段話）
   ---------------------------------------------------------------------------
   任何有「寫一段字」的畫面都可以掛這個：每一關結尾的反思、心象探索的
   反思、每日思辨。呼叫端只要給一個容器跟題目上下文，其他都在這裡處理。

   刻意的設計決定：

   1. **不評分、不判對錯。** 這是生命教育，不是作文課。角色的工作是接住
      玩家寫的東西，然後問一個能讓他多想一層的問題。

   2. **回應不進成長紀錄。** 存進去的永遠只有玩家自己寫的字。角色講的話
      是當下的陪伴，不是要留下來給老師看的評語。

   3. **沒有 AI 也要能用。** LQ.ai.companion 內部已經有離線備援，這裡不必
      判斷；只有在真的用了離線版時，才在角落標一個小字說明。

   用法：
     LQ.ui.respond.mount(containerEl, {
       unitId, unitName, virtue, question,   // 上下文
       answer                                 // 玩家剛寫的內容
     });
   ========================================================================== */
(function (LQ) {
  "use strict";

  function esc(s) { return LQ.ui.modal.esc(s); }
  function nl2br(s) { return esc(s).replace(/\n/g, "<br>"); }

  var MAX_TURNS = 3;   // 最多來回三次就收尾，不要變成沒完沒了的聊天

  function mount(host, ctx) {
    if (!host) return;

    var history = [];
    var turn = 0;

    function skeleton(who) {
      return '' +
        '<div class="respond">' +
          '<div class="respond__who">' +
            (who.face
              ? '<img class="respond__face" src="' + esc(who.face) + '" alt="">'
              : '<span class="respond__face respond__face--none">◈</span>') +
            '<div>' +
              '<b>' + esc(who.name) + '</b>' +
              (who.role ? '<small>' + esc(who.role) + '</small>' : '') +
            '</div>' +
            '<span class="respond__tag" id="rp-tag"></span>' +
          '</div>' +
          '<div class="respond__body" id="rp-body">' +
            '<span class="respond__dots"><i></i><i></i><i></i></span>' +
          '</div>' +
          '<div class="respond__more" id="rp-more" hidden></div>' +
        '</div>';
    }

    function ask(text) {
      turn += 1;
      history.push({ role: "user", text: text });

      LQ.ai.companion(ctx, history, text).then(function (res) {
        var body = document.getElementById("rp-body");
        var tag = document.getElementById("rp-tag");
        if (!body) return;                       // 玩家已經離開這一頁

        history.push({ role: "ai", text: res.text });
        body.innerHTML = '<p>' + nl2br(res.text) + '</p>';
        if (tag) tag.textContent = res.offline ? "離線回應" : "";

        renderMore();
        LQ.audio.tap();
      });
    }

    /** 追問區：還沒問滿就給一個輸入框，問滿了就收起來 */
    function renderMore() {
      var more = document.getElementById("rp-more");
      if (!more) return;

      if (turn >= MAX_TURNS) {
        more.hidden = false;
        more.innerHTML =
          '<p class="respond__end">今天先聊到這裡。你寫的那一段已經存進成長紀錄了，' +
          '下次回來還看得到。</p>';
        return;
      }

      more.hidden = false;
      more.innerHTML =
        '<textarea id="rp-input" rows="3" placeholder="想回他的話，就寫在這裡（不寫也可以）"></textarea>' +
        '<button type="button" class="btn btn--ghost btn--sm" id="rp-send">回他一句</button>';

      document.getElementById("rp-send").addEventListener("click", function () {
        var v = document.getElementById("rp-input").value.trim();
        if (!v) { LQ.ui.modal.toast("還沒寫東西喔", true); return; }
        document.getElementById("rp-body").innerHTML =
          '<span class="respond__dots"><i></i><i></i><i></i></span>';
        document.getElementById("rp-more").hidden = true;
        ask(v);
      });
    }

    var who = LQ.ai.voiceFor(ctx.unitId);
    host.innerHTML = skeleton(who);
    host.hidden = false;
    ask(ctx.answer);
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.respond = { mount: mount };

})(window.LQ = window.LQ || {});
