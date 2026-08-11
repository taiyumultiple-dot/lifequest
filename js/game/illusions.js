/* ==========================================================================
   迷障：收服、強化、裝備成「警覺」
   ========================================================================== */
(function (LQ) {
  "use strict";

  var MAX_LV = 5;
  var SLOTS = 2;            // 同行警覺格數

  var Illusions = {
    MAX_LV: MAX_LV,
    SLOTS: SLOTS,

    /** 已經收服了嗎 */
    has: function (id) {
      return !!LQ.state.d.illusions[id];
    },

    /** 目前等級（沒收服回 0）*/
    level: function (id) {
      var got = LQ.state.d.illusions[id];
      return got ? (got.lv || 1) : 0;
    },

    /** 收服一個迷障；本來就有的話回 false */
    capture: function (id) {
      if (!id || this.has(id)) return false;
      if (!LQ.data.illusionById(id)) return false;
      LQ.state.d.illusions[id] = { lv: 1, at: Date.now() };
      // 第一個收服的自動裝上，讓玩家馬上感覺得到加成
      if (!LQ.state.d.equipped[0]) LQ.state.d.equipped[0] = id;
      LQ.state.save();
      return true;
    },

    /** 升到下一級要多少記憶碎片 */
    upgradeCost: function (id) {
      var lv = this.level(id);
      if (!lv || lv >= MAX_LV) return null;
      return 200 * lv * lv;   // 200 / 800 / 1800 / 3200
    },

    /** 強化（成功回 true）*/
    upgrade: function (id) {
      var cost = this.upgradeCost(id);
      if (cost === null) return false;
      if (!LQ.economy.spendFrag(cost)) return false;
      LQ.state.d.illusions[id].lv += 1;
      LQ.state.save();
      return true;
    },

    /** 裝備到某一格；傳 null 表示卸下 */
    equip: function (slot, id) {
      if (slot < 0 || slot >= SLOTS) return false;
      if (id && !this.has(id)) return false;
      // 同一個迷障不能同時佔兩格
      if (id) {
        for (var i = 0; i < SLOTS; i++) {
          if (i !== slot && LQ.state.d.equipped[i] === id) LQ.state.d.equipped[i] = null;
        }
      }
      LQ.state.d.equipped[slot] = id || null;
      LQ.state.save();
      return true;
    },

    isEquipped: function (id) {
      return LQ.state.d.equipped.indexOf(id) !== -1;
    },

    /** 加成的白話說明 */
    boonText: function (def, lv) {
      var v = def.boon.base + def.boon.per * ((lv || 1) - 1);
      switch (def.boon.type) {
        case "startThink": return "起始思考力 +" + v;
        case "peek":       return "查閱碎片折價 " + v;
        case "time":       return "每關倒數 +" + v + " 秒";
        case "frag":       return "記憶碎片 +" + v + "%";
        default:           return "";
      }
    },

    /** 圖鑑清單：追跡限定的排在單元的後面 */
    all: function () {
      return LQ.data.illusions.slice();
    },

    /** 追跡時可能遇到的迷障：還沒收服的優先，全收完就隨機一個 */
    pickForHunt: function (rng) {
      var self = this;
      var pool = LQ.data.illusions.filter(function (x) { return !self.has(x.id); });
      if (!pool.length) pool = LQ.data.illusions.slice();
      return pool[Math.floor((rng || Math.random)() * pool.length)];
    }
  };

  LQ.illusions = Illusions;

})(window.LQ = window.LQ || {});
