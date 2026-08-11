/* ==========================================================================
   探索者稱號
   花記憶碎片升級，每一階給一點小加成。
   need 是升到這一階需要的記憶碎片；t01 是初始稱號，不用花錢。
   ========================================================================== */
(function (LQ) {
  "use strict";

  LQ.data = LQ.data || {};

  LQ.data.titles = [
    {
      id: "t01", name: "初次踏入者", need: 0,
      desc: "你剛掉進這座迷宮，還不知道自己在找什麼。",
      boon: { startThink: 0, frag: 0 }
    },
    {
      id: "t02", name: "願意多想的人", need: 600,
      desc: "你開始願意在原地多站三秒鐘，而不是直接走過去。",
      boon: { startThink: 5, frag: 5 }
    },
    {
      id: "t03", name: "傾聽者", need: 1600,
      desc: "你發現「我在」比「你應該」更有力量。",
      boon: { startThink: 10, frag: 10 }
    },
    {
      id: "t04", name: "陪伴者", need: 3200,
      desc: "你能陪別人待在沒有答案的地方，而不急著把他拉走。",
      boon: { startThink: 16, frag: 16 }
    },
    {
      id: "t05", name: "理解者", need: 5600,
      desc: "你看得見一個人行為背後的理由，即使你不同意。",
      boon: { startThink: 24, frag: 24 }
    },
    {
      id: "t06", name: "凝視生命的人", need: 9000,
      desc: "你走完了五扇門，並且知道問題比答案更值得帶走。",
      boon: { startThink: 34, frag: 34 }
    }
  ];

  LQ.data.titleById = function (id) {
    var list = LQ.data.titles;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  };

})(window.LQ = window.LQ || {});
