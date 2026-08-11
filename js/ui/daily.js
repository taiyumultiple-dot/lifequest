/* ==========================================================================
   每日思辨 + 七日打卡
   ========================================================================== */
(function (LQ) {
  "use strict";

  function esc(s) { return LQ.ui.modal.esc(s); }

  LQ.ui = LQ.ui || {};
  LQ.ui.daily = {
    render: function () {
      var day = LQ.daily.sync();
      var today = LQ.daily.todaySet();
      var stamps = LQ.daily.stamps();

      // 心象探索的兩個每日入口
      var o = LQ.state.d.oracle;
      var drewToday = !!(o.tarot && o.tarot.date === LQ.state.today());
      var askedToday = LQ.oracle.seenToday("zodiacDate");
      var zodiac = o.zodiac ? LQ.data.zodiacById(o.zodiac) : null;

      var week = "";
      for (var i = 0; i < 7; i++) {
        var done = i < stamps;
        week += '<div class="day' + (done ? " day--done" : "") + '">' +
                "<b>第 " + (i + 1) + " 天</b><i>" + (done ? "✦" : "○") + "</i></div>";
      }

      LQ.render(
        '<div class="sect"><h2>每日思辨</h2><small>' + esc(today.date) + "</small></div>" +

        '<div class="card card--gold">' +
          '<div class="card__eyebrow">今天的情境</div>' +
          '<h3 class="card__title">' + esc(today.set.title) + "</h3>" +
          '<p class="card__note">' + esc(today.set.prompt) + "</p>" +
          '<div style="display:flex;gap:8px;margin:12px 0 0;flex-wrap:wrap">' +
            '<span class="tag">心力 ' + LQ.daily.COST + "</span>" +
            '<span class="tag tag--gold">首通 ' + LQ.daily.REWARD_FIRST + " 碎片</span>" +
            '<span class="tag">之後每次 ' + LQ.daily.REWARD_AGAIN + "</span>" +
          "</div>" +
          '<button type="button" class="btn btn--gold btn--block" id="dy-start" style="margin-top:14px">' +
            (day.firstDone ? "再想一次" : "開始今天的思辨") + "</button>" +
          (day.firstDone ? '<p style="font-size:12px;color:var(--jade);text-align:center;margin:9px 0 0">今天已經通過了，章也蓋了。</p>' : "") +
        "</div>" +

        '<div class="sect"><h2>七日打卡</h2><small>' + stamps + " / 7</small></div>" +
        '<div class="week">' + week + "</div>" +
        '<p style="font-size:12.5px;color:var(--ink-faint);margin-top:10px">' +
          "每天完成一次每日思辨就蓋一個章。集滿七天，額外拿 " + LQ.daily.CHECKIN_BONUS + " 記憶碎片。</p>" +

        '<div class="sect"><h2>迷障追跡</h2></div>' +
        '<div class="card">' +
          '<p class="card__note">連續破解越來越難的思考陷阱，累積分數；' +
          "途中會浮現還沒收服的迷障，解開它就能收進圖鑑。</p>" +
          '<div style="display:flex;gap:8px;margin:12px 0;flex-wrap:wrap">' +
            '<span class="tag">心力 30</span>' +
            '<span class="tag tag--gold">最佳 ' + LQ.state.d.huntBest + " 分</span>" +
          "</div>" +
          '<button type="button" class="btn btn--ice btn--block" id="dy-hunt">啟動迷障追跡</button>' +
        "</div>" +

        /* 每天都可以做、但不花心力也不給碎片的兩樣 */
        '<div class="sect"><h2>今天的另外兩件事</h2><small>不花心力</small></div>' +
        '<div class="rows">' +
          '<button type="button" class="row" data-go="tarot"><i>✦</i>' +
            "<div><b>今日一張</b><p>抽一張心象牌，讀它問你的那句話。</p></div>" +
            '<span class="row__val">' + (drewToday ? "已抽" : "未抽") + "</span></button>" +
          '<button type="button" class="row" data-go="zodiac"><i>☾</i>' +
            "<div><b>星座・今日提問</b><p>" +
            (zodiac ? esc(zodiac.name) + "。每天換一題。" : "先選你的星座，之後每天一題。") +
            "</p></div>" +
            '<span class="row__val">' + (askedToday ? "已看" : "未看") + "</span></button>" +
        "</div>"
      );

      document.getElementById("dy-start").addEventListener("click", function () {
        LQ.audio.tap();
        LQ.levelflow.enterDaily();
      });
      document.getElementById("dy-hunt").addEventListener("click", function () {
        LQ.audio.tap();
        LQ.hunt.start();
      });
    }
  };

})(window.LQ = window.LQ || {});
