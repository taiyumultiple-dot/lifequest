/* ==========================================================================
   補給站商品
   kind: "perm" 永久加成（可重複買，價格逐次上漲）
         "use"  一次性消耗品
   ========================================================================== */
(function (LQ) {
  "use strict";

  LQ.data = LQ.data || {};

  LQ.data.shop = [
    {
      id: "rest", kind: "perm", glyph: "◈",
      name: "好好睡一覺",
      desc: "心力上限永久 +30。",
      note: "走得久，比走得快重要。",
      cost: 500, growth: 1.6, field: "stamina", amount: 30
    },
    {
      id: "cocoa", kind: "use", glyph: "☕",
      name: "一杯熱可可",
      desc: "立刻恢復 40 點心力。",
      note: "爺爺說，想不清楚的時候先喝點熱的。",
      cost: 140, growth: 1, restore: 40
    },
    {
      id: "desk", kind: "perm", glyph: "▤",
      name: "整理書桌",
      desc: "思考力上限永久 +20。",
      note: "桌面乾淨的時候，腦袋也比較清楚。",
      cost: 500, growth: 1.6, field: "think", amount: 20
    },
    {
      id: "lamp", kind: "perm", glyph: "✦",
      name: "一盞好檯燈",
      desc: "思考力上限永久 +50。",
      note: "適合中後段那幾扇特別難開的門。",
      cost: 1400, growth: 1.7, field: "think", amount: 50
    },
    {
      id: "anchor", kind: "perm", glyph: "⚓",
      name: "定心錨",
      desc: "心之防線上限 +1（最多 +2）。",
      note: "被說服動搖的時候，還有一次站穩的機會。",
      cost: 2000, growth: 2.4, field: "guard", amount: 1, max: 2
    }
  ];

  LQ.data.shopById = function (id) {
    var list = LQ.data.shop;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  };

})(window.LQ = window.LQ || {});
