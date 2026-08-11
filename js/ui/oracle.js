/* ==========================================================================
   心象探索・總覽
   四樣自我探索工具的入口，另外提供共用的「反思輸入框」給其他三支畫面用。
   ========================================================================== */
(function (LQ) {
  "use strict";

  function esc(s) { return LQ.ui.modal.esc(s); }

  /**
   * 存檔會不會上傳，要對學生講清楚。
   * 這句話要跟 levelflow.js、journal.js 的說法一致。
   */
  var PRIVACY = "沒登入就只留在這台裝置。登入之後會同步到你自己的帳號，" +
                "換手機也還在——同學和老師在遊戲裡看不到。";

  /**
   * 共用的反思輸入區塊（HTML）。
   * 版型刻意跟每一關結束時的「帶走一句話」一樣，學生不用重新學。
   */
  function reflectHTML(q, hint) {
    return '<div class="card" style="margin-top:14px">' +
        '<div class="card__eyebrow">寫下來</div>' +
        '<p class="card__note" style="color:var(--ink);font-size:14.5px;margin-bottom:10px">' +
          esc(q) + "</p>" +
        '<textarea id="or-input" rows="4" placeholder="' +
          esc(hint || "不用寫得漂亮，寫得真實就好。") + '"></textarea>' +
        '<div style="display:flex;gap:8px;margin-top:10px">' +
          '<button type="button" class="btn btn--ghost btn--sm" id="or-skip">先不寫</button>' +
          '<button type="button" class="btn btn--gold btn--sm" id="or-save" style="flex:1">存進成長紀錄</button>' +
        "</div>" +
        '<p style="font-size:11.5px;color:var(--ink-faint);margin:9px 0 0">' + PRIVACY + "</p>" +
      "</div>";
  }

  /**
   * 綁定反思區塊的兩顆按鈕。
   * @param {string}   label 來源標籤，會顯示在成長紀錄裡
   * @param {string}   q     題目
   * @param {function} after 存完或跳過之後要做的事
   */
  function bindReflect(label, q, after) {
    var skip = document.getElementById("or-skip");
    var save = document.getElementById("or-save");
    if (!skip || !save) return;

    skip.addEventListener("click", function () {
      LQ.audio.tap();
      if (after) after(false);
    });
    save.addEventListener("click", function () {
      var v = document.getElementById("or-input").value;
      if (!LQ.oracle.reflect(label, q, v)) {
        LQ.ui.modal.toast("還沒寫東西喔", true);
        return;
      }
      LQ.audio.good();
      LQ.ui.modal.toast("已存進成長紀錄");
      if (after) after(true);
    });
  }

  /** 回上一層的按鈕 */
  function backHTML(to, text) {
    return '<button type="button" class="btn btn--ghost btn--sm" data-go="' + to + '" ' +
           'style="margin-top:16px">← ' + esc(text || "回心象探索") + "</button>";
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.oracle = {

    // 給其他三支畫面用的共用零件
    reflectHTML: reflectHTML,
    bindReflect: bindReflect,
    backHTML: backHTML,
    PRIVACY: PRIVACY,

    render: function () {
      var o = LQ.state.d.oracle;
      var doneTests = Object.keys(o.psych || {}).length;
      var z = o.zodiac ? LQ.data.zodiacById(o.zodiac) : null;
      var drewToday = o.tarot && o.tarot.date === LQ.state.today();

      LQ.render(
        '<div class="sect"><h2>心象探索</h2><small>四種看自己的方式</small></div>' +

        '<div class="card card--gold">' +
          '<div class="card__eyebrow">先講清楚</div>' +
          '<p class="card__note">這裡的牌、測驗和星座<b>都不預測未來</b>。' +
          "它們的作用是給你一個角度，讓你把本來說不出口的事情說出來。<br><br>" +
          "牌面是曖昧的，所以你在解釋它的時候，其實是在講你自己的事——" +
          "這是心理學上很紮實的用法，也正好是這個遊戲想做的。</p>" +
        "</div>" +

        '<div class="sect"><h2>四樣工具</h2></div>' +
        '<div class="rows">' +

          '<button type="button" class="row" data-go="tarot"><i>✦</i>' +
            "<div><b>心象牌</b><p>22 張大阿爾克那。抽一張，讀它問你的那句話。</p></div>" +
            '<span class="row__val">' + (drewToday ? "今日已抽" : "抽一張") + "</span></button>" +

          '<button type="button" class="row" data-go="psych"><i>◈</i>' +
            "<div><b>自我探索測驗</b><p>四份測驗，做完不貼標籤，只給你看自己的傾向。</p></div>" +
            '<span class="row__val">' + doneTests + " / " + LQ.data.psychTests.length + "</span></button>" +

          '<button type="button" class="row" data-go="zodiac"><i>☾</i>' +
            "<div><b>星座・每日提問</b><p>別人常這樣說你。你同意嗎？</p></div>" +
            '<span class="row__val">' + (z ? esc(z.name) : "未選") + "</span></button>" +

          '<button type="button" class="row" data-go="values"><i>⚖</i>' +
            "<div><b>價值羅盤</b><p>12 張價值卡，一路刪到剩 3 張。你會看到自己真正的順序。</p></div>" +
            '<span class="row__val">' + (o.values ? "已完成" : "未完成") + "</span></button>" +

        "</div>" +

        '<p style="font-size:12.5px;color:var(--ink-faint);margin-top:14px;line-height:1.9">' +
          "寫下來的句子都會進「成長紀錄」，可以一起匯出。<br>" + PRIVACY + "</p>"
      );
    }
  };

})(window.LQ = window.LQ || {});
