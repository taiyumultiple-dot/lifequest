/* ==========================================================================
   迷障圖鑑
   「迷障」是擋在思考前面的陷阱。破解過的迷障會被收進圖鑑，
   之後可以裝備成「警覺」——因為認得出它，它就不再那麼有力量。

   boon 是裝備後的加成：
     startThink 起始思考力 +N
     peek       查閱碎片折價 N
     time       每關倒數 +N 秒
     frag       結算記憶碎片 +N%
   實際數值 = base + per × (等級 - 1)，最高 5 級。
   ========================================================================== */
(function (LQ) {
  "use strict";

  LQ.data = LQ.data || {};

  LQ.data.illusions = [
    /* ---- 序章 ---- */
    {
      id: "i0001", unit: "p00", name: "日子就是這樣", glyph: "◌",
      whisper: "「不用想那麼多啦，大家都是這樣過的，習慣就好。」",
      counter: "習慣不是理由。問一次「為什麼是這樣」，日子就不再只是流過去。",
      boon: { type: "startThink", base: 5, per: 3 }
    },

    /* ---- 單元 01：哲學思考 ---- */
    {
      id: "i0101", unit: "u01", name: "放棄思考", glyph: "☹",
      whisper: "「想那麼多幹嘛？不想，就不會痛苦了。」",
      counter: "思考確實會帶來痛苦，但也帶來了理解、選擇與奇蹟。把它交出去，你就沒有自己的人生了。",
      boon: { type: "startThink", base: 6, per: 3 }
    },
    {
      id: "i0102", unit: "u01", name: "以偏概全", glyph: "◑",
      whisper: "「他整天只會唸書，一定很難交到朋友。」",
      counter: "你看見的是一小片，不是全部。問一句「我真的認識他嗎」，往往就破了。",
      boon: { type: "peek", base: 3, per: 2 }
    },
    {
      id: "i0103", unit: "u01", name: "是我想太多", glyph: "❔",
      whisper: "「算了，反正是我想太多。」",
      counter: "在乎不是缺點。把「我想太多」換成「我在意這件事」，話就說得出口了。",
      boon: { type: "time", base: 3, per: 2 }
    },
    {
      id: "i0104", unit: "u01", name: "大家都這樣", glyph: "☰",
      whisper: "「這麼多人都這麼說，你憑什麼不一樣？」",
      counter: "很多人相信，不等於是真的。人數不是理由，理由才是理由。",
      boon: { type: "frag", base: 8, per: 4 }
    },
    {
      id: "i0105", unit: "u01", name: "非黑即白", glyph: "◐",
      whisper: "「不是全對，就是全錯。」",
      counter: "事情不能只看一邊。允許「兩者都有一點」，才看得見真正的樣子。",
      boon: { type: "startThink", base: 5, per: 3 }
    },

    /* ---- 單元 02：人學探索 ---- */
    {
      id: "i0201", unit: "u02", name: "標籤即是我", glyph: "▤",
      whisper: "「你就是那種人，改不了的。」",
      counter: "標籤是別人為了省事貼上的。你比任何一個詞都長。",
      boon: { type: "peek", base: 3, per: 2 }
    },
    {
      id: "i0202", unit: "u02", name: "別人的眼光", glyph: "◉",
      whisper: "「他們會怎麼看你？」",
      counter: "先問「我想成為誰」，再問「別人怎麼看」。順序反了，人就丟了。",
      boon: { type: "time", base: 3, per: 2 }
    },
    {
      id: "i0203", unit: "u02", name: "我不夠好", glyph: "▽",
      whisper: "「再努力也就這樣了吧。」",
      counter: "把「我不夠好」拆成「我這件事還不熟」，它就從審判變成了進度。",
      boon: { type: "startThink", base: 6, per: 3 }
    },

    /* ---- 單元 03：終極關懷 ---- */
    {
      id: "i0301", unit: "u03", name: "別談那個", glyph: "✕",
      whisper: "「講這個不吉利，換個話題。」",
      counter: "不談，事情不會消失，只會變成一個人扛。談，才有人接得住。",
      boon: { type: "frag", base: 8, per: 4 }
    },
    {
      id: "i0302", unit: "u03", name: "假裝沒事", glyph: "☺",
      whisper: "「笑一下就好了，不要讓別人擔心。」",
      counter: "說「我現在不太好」不是麻煩別人，是給關係一個機會。",
      boon: { type: "startThink", base: 6, per: 3 }
    },
    {
      id: "i0303", unit: "u03", name: "說了也沒用", glyph: "…",
      whisper: "「反正說了也沒人懂。」",
      counter: "陪伴不等於解決。「我在」有時候比「你要想開一點」有力量得多。",
      boon: { type: "time", base: 4, per: 2 }
    },

    /* ---- 單元 04：價值思辨 ---- */
    {
      id: "i0401", unit: "u04", name: "反正都一樣", glyph: "≈",
      whisper: "「每個人想的都不一樣，那就沒有對錯啊。」",
      counter: "沒有標準答案，不代表所有答案一樣好。理由的品質是有差別的。",
      boon: { type: "peek", base: 4, per: 2 }
    },
    {
      id: "i0402", unit: "u04", name: "別人也這樣", glyph: "⇄",
      whisper: "「又不是只有我這樣做。」",
      counter: "別人做過，不會讓一件事變得對。你要的是理由，不是同伴。",
      boon: { type: "frag", base: 8, per: 4 }
    },
    {
      id: "i0403", unit: "u04", name: "先講贏再說", glyph: "⚑",
      whisper: "「重點是不能輸。」",
      counter: "討論的目的不是贏，是把事情想清楚。願意改變想法的人才真的在思考。",
      boon: { type: "startThink", base: 7, per: 3 }
    },

    /* ---- 單元 05：靈性修養與人格統整 ---- */
    {
      id: "i0501", unit: "u05", name: "永遠不夠", glyph: "∞",
      whisper: "「再多一點，你就會滿足了。」",
      counter: "如果終點會一直往後退，那問題不在距離，在方向。",
      boon: { type: "time", base: 4, per: 2 }
    },
    {
      id: "i0502", unit: "u05", name: "有用才有價值", glyph: "⚖",
      whisper: "「你要有成就，才配活得理直氣壯。」",
      counter: "如果一個人病了、老了、什麼都做不了，他的價值就變少了嗎？",
      boon: { type: "frag", base: 10, per: 5 }
    },
    {
      id: "i0503", unit: "u05", name: "停不下來", glyph: "↻",
      whisper: "「休息就是落後。」",
      counter: "停下來不是浪費。人要先安靜，才聽得見自己在說什麼。",
      boon: { type: "startThink", base: 6, per: 3 }
    },

    /* ---- 追跡限定（不屬於任何一關，只能在心緒追跡遇到）---- */
    {
      id: "i9001", unit: null, name: "反正來不及", glyph: "⏳",
      whisper: "「都這個時候了，現在做也沒意義。」",
      counter: "來不及做完的事，通常還來得及開始。",
      boon: { type: "time", base: 5, per: 2 }
    },
    {
      id: "i9002", unit: null, name: "我沒有選擇", glyph: "⛓",
      whisper: "「這不是我能決定的。」",
      counter: "能決定的常常比想像中多一點——至少，你能決定怎麼看它。",
      boon: { type: "peek", base: 4, per: 3 }
    },
    {
      id: "i9003", unit: null, name: "之後再說", glyph: "→",
      whisper: "「等我準備好再面對。」",
      counter: "「之後」不會自己到來。挑一件今天下課就做得到的小事。",
      boon: { type: "frag", base: 10, per: 5 }
    }
  ];

  /** 依 id 找一筆迷障 */
  LQ.data.illusionById = function (id) {
    var list = LQ.data.illusions;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  };

})(window.LQ = window.LQ || {});
