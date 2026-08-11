/* ==========================================================================
   數值：心力、記憶碎片、思考力、心之防線
   所有上限與加成都在這裡算，畫面只負責顯示。
   ========================================================================== */
(function (LQ) {
  "use strict";

  var BASE_STAMINA = 100;   // 心力上限基準
  var BASE_THINK = 100;     // 思考力上限基準
  var BASE_GUARD = 3;       // 心之防線基準
  var COST_TRY = 6;         // 每次提交推理消耗的思考力
  var COST_PEEK = 30;       // 查閱一塊碎片消耗的思考力
  var REGAIN_HIT = 9;       // 每一塊「齒紋吻合」回復的思考力

  /** 把已裝備的迷障加成加總起來 */
  function boons() {
    var d = LQ.state.d;
    var sum = { startThink: 0, peek: 0, time: 0, frag: 0 };

    d.equipped.forEach(function (id) {
      if (!id || !d.illusions[id]) return;
      var def = LQ.data.illusionById(id);
      if (!def) return;
      var lv = d.illusions[id].lv || 1;
      var v = def.boon.base + def.boon.per * (lv - 1);
      sum[def.boon.type] += v;
    });

    // 稱號也給加成
    var title = LQ.data.titleById(d.titleId);
    sum.startThink += title.boon.startThink;
    sum.frag += title.boon.frag;

    return sum;
  }

  var Economy = {
    COST_TRY: COST_TRY,
    COST_PEEK: COST_PEEK,
    REGAIN_HIT: REGAIN_HIT,
    boons: boons,

    staminaMax: function () { return BASE_STAMINA + LQ.state.d.bonus.stamina; },
    thinkMax: function () { return BASE_THINK + LQ.state.d.bonus.think; },
    guardMax: function () { return BASE_GUARD + LQ.state.d.bonus.guard; },

    /** 一場開始時的思考力（上限 + 裝備加成，但不超過上限的 1.5 倍）*/
    startThink: function () {
      var max = this.thinkMax();
      return Math.min(max + boons().startThink, Math.round(max * 1.5));
    },

    /** 查閱一塊碎片的實際花費 */
    peekCost: function () {
      return Math.max(8, COST_PEEK - boons().peek);
    },

    /** 這一關的實際倒數秒數 */
    seconds: function (base) {
      return base + boons().time;
    },

    /** 結算時記憶碎片的實際入帳（含加成 %）*/
    fragGain: function (base) {
      return Math.round(base * (1 + boons().frag / 100));
    },

    /** 心力夠不夠 */
    canAfford: function (cost) {
      return LQ.state.d.stamina >= cost;
    },

    /** 扣心力（不夠回 false）*/
    spendStamina: function (cost) {
      if (!this.canAfford(cost)) return false;
      LQ.state.d.stamina -= cost;
      LQ.state.save();
      return true;
    },

    /** 回心力（不超過上限）*/
    gainStamina: function (n) {
      var d = LQ.state.d;
      d.stamina = Math.min(this.staminaMax(), d.stamina + n);
      LQ.state.save();
    },

    /** 記憶碎片增減 */
    gainFrag: function (n) {
      LQ.state.d.frag = Math.max(0, LQ.state.d.frag + n);
      LQ.state.save();
    },

    spendFrag: function (n) {
      if (LQ.state.d.frag < n) return false;
      LQ.state.d.frag -= n;
      LQ.state.save();
      return true;
    },

    /**
     * 依表現給評級。
     * tries 是總嘗試次數，len 是鑰匙齒紋長度，peeks 是查閱次數。
     */
    rank: function (tries, len, peeks) {
      var score = tries + peeks * 2;
      if (score <= len + 1) return "S";
      if (score <= len + 4) return "A";
      if (score <= len + 8) return "B";
      return "C";
    }
  };

  LQ.economy = Economy;

})(window.LQ = window.LQ || {});
