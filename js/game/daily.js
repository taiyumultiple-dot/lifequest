/* ==========================================================================
   每日思辨 + 七日打卡
   題目由日期決定，所以同一天打開的人拿到的是同一題。
   ========================================================================== */
(function (LQ) {
  "use strict";

  var COST = 5;              // 每次挑戰消耗的心力
  var REWARD_FIRST = 500;    // 當天第一次通關
  var REWARD_AGAIN = 10;     // 之後每次通關
  var CHECKIN_BONUS = 500;   // 集滿七天的額外獎勵

  var Daily = {
    COST: COST,
    REWARD_FIRST: REWARD_FIRST,
    REWARD_AGAIN: REWARD_AGAIN,
    CHECKIN_BONUS: CHECKIN_BONUS,

    /** 今天的題目 */
    todaySet: function (dateStr) {
      var date = dateStr || LQ.state.today();
      var sets = LQ.data.dailySets;
      var rng = LQ.keyforge.rngFromSeed("daily-" + date);
      var pick = sets[Math.floor(rng() * sets.length)];
      return { date: date, set: pick };
    },

    /** 把存檔裡的每日狀態對齊到今天（跨日就重置）*/
    sync: function () {
      var d = LQ.state.d;
      var today = LQ.state.today();
      if (d.daily.date !== today) {
        d.daily = { date: today, cleared: false, plays: 0, firstDone: false };
        LQ.state.save();
      }
      return d.daily;
    },

    /** 今天打過卡了嗎 */
    checkedInToday: function () {
      return LQ.state.d.checkin.indexOf(LQ.state.today()) !== -1;
    },

    /** 打卡；回傳這次拿到的額外獎勵（沒有就 0）*/
    checkIn: function () {
      var d = LQ.state.d;
      var today = LQ.state.today();
      if (d.checkin.indexOf(today) !== -1) return 0;

      d.checkin.push(today);
      var bonus = 0;
      if (d.checkin.length >= 7) {
        bonus = CHECKIN_BONUS;
        d.checkin = [];               // 集滿七格就重新開始一輪
      }
      LQ.state.save();
      return bonus;
    },

    /** 已經蓋了幾個章（0~7）*/
    stamps: function () {
      return LQ.state.d.checkin.length;
    },

    /** 通關結算，回傳實際入帳的記憶碎片 */
    settle: function () {
      var day = this.sync();
      var base = day.firstDone ? REWARD_AGAIN : REWARD_FIRST;
      day.cleared = true;
      day.firstDone = true;
      day.plays += 1;
      LQ.state.save();
      var gain = LQ.economy.fragGain(base);
      LQ.economy.gainFrag(gain);
      return gain;
    }
  };

  LQ.daily = Daily;

})(window.LQ = window.LQ || {});
