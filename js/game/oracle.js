/* ==========================================================================
   心象探索・共用邏輯
   ---------------------------------------------------------------------------
   塔羅、心理測驗、星座、價值羅盤四樣共用的東西都放這裡：
     ・每日抽選（同一天重開拿到同一個結果，跨日才會換）
     ・把反思寫進成長紀錄

   刻意的設計決定：
     這四樣都不消耗心力、也不發記憶碎片。
     一旦反思有獎勵，學生就會為了獎勵亂寫，那這個功能就白做了。
   ========================================================================== */
(function (LQ) {
  "use strict";

  /** 玩家專屬的抽牌基準。舊存檔沒有的話補一個。 */
  function seed() {
    var o = LQ.state.d.oracle;
    if (!o.seed) {
      o.seed = String(Date.now()) + "-" + Math.floor(Math.random() * 100000);
      LQ.state.save();
    }
    return o.seed;
  }

  var Oracle = {

    /**
     * 今天的亂數產生器。
     * 種子 = 用途 + 日期 + 玩家基準，所以：
     *   ・同一天同一個人，重開幾次都是同一個結果
     *   ・不同人不會全班抽到同一張
     *   ・跨日自動換
     * @param {string} kind 用途，例如 "tarot"、"zodiac"
     */
    rngToday: function (kind) {
      return LQ.keyforge.rngFromSeed(kind + "-" + LQ.state.today() + "-" + seed());
    },

    /**
     * 從陣列裡依日期抽 n 個不重複的項目（回傳索引）。
     * @param {number} total 總數
     * @param {number} n     要抽幾個
     * @param {string} kind  用途（當種子的一部分）
     * @param {string} salt  額外的種子鹽巴，同一天想抽第二組時用
     */
    pickToday: function (total, n, kind, salt) {
      var rng = LQ.keyforge.rngFromSeed(
        kind + "-" + LQ.state.today() + "-" + seed() + (salt ? "-" + salt : "")
      );
      var pool = [];
      for (var i = 0; i < total; i++) pool.push(i);
      // Fisher–Yates，用種子亂數洗，結果可重現
      for (var j = pool.length - 1; j > 0; j--) {
        var k = Math.floor(rng() * (j + 1));
        var t = pool[j]; pool[j] = pool[k]; pool[k] = t;
      }
      return pool.slice(0, n);
    },

    /** 隨機抽（不綁日期）——重抽一組牌的時候用 */
    pickRandom: function (total, n) {
      var pool = [];
      for (var i = 0; i < total; i++) pool.push(i);
      for (var j = pool.length - 1; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1));
        var t = pool[j]; pool[j] = pool[k]; pool[k] = t;
      }
      return pool.slice(0, n);
    },

    /** 今天是不是已經看過某個每日內容了 */
    seenToday: function (field) {
      return LQ.state.d.oracle[field] === LQ.state.today();
    },

    /** 記下「今天看過了」 */
    markToday: function (field) {
      LQ.state.d.oracle[field] = LQ.state.today();
      LQ.state.save();
    },

    /**
     * 把一則反思寫進成長紀錄。
     * 直接用既有的 addJournal，所以「匯出成 HTML」會一起帶出去。
     * @param {string} label 來源標籤，例如「心象牌・愚者」
     * @param {string} q     題目
     * @param {string} a     玩家寫的答案
     */
    reflect: function (label, q, a) {
      var text = String(a == null ? "" : a).trim();
      if (!text) return false;
      LQ.state.addJournal("oracle", label, q, text);
      return true;
    }
  };

  LQ.oracle = Oracle;

})(window.LQ = window.LQ || {});
