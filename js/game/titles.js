/* ==========================================================================
   稱號：解鎖與裝備
   ========================================================================== */
(function (LQ) {
  "use strict";

  LQ.titles = {

    current: function () {
      return LQ.data.titleById(LQ.state.d.titleId);
    },

    owned: function (id) {
      return !!LQ.state.d.titles[id];
    },

    /** 解鎖（花記憶碎片）*/
    unlock: function (id) {
      var t = LQ.data.titleById(id);
      if (!t || this.owned(id)) return false;
      if (!LQ.economy.spendFrag(t.need)) return false;
      LQ.state.d.titles[id] = true;
      LQ.state.d.titleId = id;          // 解鎖後直接換上
      LQ.state.save();
      return true;
    },

    /** 換上已擁有的稱號 */
    equip: function (id) {
      if (!this.owned(id)) return false;
      LQ.state.d.titleId = id;
      LQ.state.save();
      return true;
    }
  };

})(window.LQ = window.LQ || {});
