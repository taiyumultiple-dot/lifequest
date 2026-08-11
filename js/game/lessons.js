/* ==========================================================================
   課本單元・邏輯
   ---------------------------------------------------------------------------
   一個單元有兩半：**讀**（課本段落）與**玩**（對應的那扇門）。
   進度就是這兩半的加權平均，所以只讀不玩、或只玩不讀，都不會是 100%。

   段落沒有內容的單元（還沒匯入課本），進度就只看關卡那一半。
   ========================================================================== */
(function (LQ) {
  "use strict";

  var PACK_KEY = "lifequest_lessons_v1";

  /* 內建的六單元。匯入自訂課本會蓋掉 LQ.data.lessons，
     所以先留一份，按「還原成內建」時才換得回來（不必重新整理）。 */
  var BUILTIN = null;

  /** 存檔裡課本單元那一格（舊存檔沒有就補上）*/
  function box() {
    var d = LQ.state.d;
    if (!d.lessons || typeof d.lessons !== "object") {
      d.lessons = { answers: {}, done: {}, marks: [] };
    }
    if (!d.lessons.answers) d.lessons.answers = {};
    if (!d.lessons.done) d.lessons.done = {};
    if (!Array.isArray(d.lessons.marks)) d.lessons.marks = [];
    return d.lessons;
  }

  var Lessons = {

    box: box,

    /** 全部單元 */
    all: function () { return LQ.data.lessons; },

    /**
     * 這個單元讀完幾段了。
     * @returns {{done:number, total:number}}
     */
    readProgress: function (lesson) {
      var done = box().done[lesson.id] || {};
      var total = lesson.sections.length;
      var n = 0;
      lesson.sections.forEach(function (s) { if (done[s.id]) n++; });
      return { done: n, total: total };
    },

    /** 對應的關卡通關了沒 */
    played: function (lesson) {
      return !!(lesson.unitId && LQ.state.isCleared(lesson.unitId));
    },

    /**
     * 單元總進度 0~100。
     * 有課本段落：讀佔一半、玩佔一半。
     * 沒有課本段落：只看玩的那一半。
     */
    percent: function (lesson) {
      var play = this.played(lesson) ? 1 : 0;
      var r = this.readProgress(lesson);
      if (!r.total) return Math.round(play * 100);
      return Math.round(((r.done / r.total) * 0.5 + play * 0.5) * 100);
    },

    /** 整本課本讀到哪 */
    overall: function () {
      var list = LQ.data.lessons;
      if (!list.length) return 0;
      var sum = 0;
      var self = this;
      list.forEach(function (l) { sum += self.percent(l); });
      return Math.round(sum / list.length);
    },

    /** 把某一段標記成讀完 */
    markSection: function (lessonId, sectionId) {
      var b = box();
      if (!b.done[lessonId]) b.done[lessonId] = {};
      b.done[lessonId][sectionId] = Date.now();
      LQ.state.save();
    },

    sectionDone: function (lessonId, sectionId) {
      var d = box().done[lessonId];
      return !!(d && d[sectionId]);
    },

    /** 記下一題的作答（scale 與 choice 用；open 另外進成長紀錄）*/
    answer: function (lessonId, questionId, value) {
      var b = box();
      b.answers[lessonId + "/" + questionId] = { v: value, at: Date.now() };
      LQ.state.save();
    },

    getAnswer: function (lessonId, questionId) {
      var a = box().answers[lessonId + "/" + questionId];
      return a ? a.v : null;
    },

    /* --- 書籤 -------------------------------------------------------- */

    marked: function (lessonId) { return box().marks.indexOf(lessonId) !== -1; },

    toggleMark: function (lessonId) {
      var b = box();
      var i = b.marks.indexOf(lessonId);
      if (i === -1) b.marks.push(lessonId); else b.marks.splice(i, 1);
      LQ.state.save();
      return this.marked(lessonId);
    },

    /* --- 課本內容包 --------------------------------------------------- */

    /**
     * 開場套用使用者匯入的課本內容（如果有的話）。
     * 作法跟 main.js 的 applyContentPack 一樣，格式相同就直接取代。
     */
    applyPack: function () {
      if (!BUILTIN) BUILTIN = LQ.data.lessons;
      try {
        var raw = localStorage.getItem(PACK_KEY);
        if (!raw) return false;
        var arr = JSON.parse(raw);
        if (!Array.isArray(arr) || !arr.length) return false;
        LQ.data.lessons = arr.map(normalize);
        console.log("[課本] 已套用匯入的單元，共 " + arr.length + " 個");
        return true;
      } catch (e) {
        console.warn("[課本] 讀取失敗，改用內建內容：", e);
        return false;
      }
    },

    /** 匯入一份課本 JSON（成功回 true）*/
    importPack: function (text) {
      if (!BUILTIN) BUILTIN = LQ.data.lessons;
      try {
        var arr = JSON.parse(text);
        // 也接受單一課的格式（lesson-01.json 那種），自動包成陣列
        if (arr && !Array.isArray(arr) && Array.isArray(arr.sections)) arr = [arr];
        if (!Array.isArray(arr) || !arr.length) return false;
        var ok = arr.every(function (l) { return l && Array.isArray(l.sections); });
        if (!ok) return false;
        localStorage.setItem(PACK_KEY, JSON.stringify(arr));
        LQ.data.lessons = arr.map(normalize);
        return true;
      } catch (e) {
        return false;
      }
    },

    /** 還原成內建的六單元（記憶體與 localStorage 一起還原，不必重新整理）*/
    resetPack: function () {
      try { localStorage.removeItem(PACK_KEY); } catch (e) { /* 忽略 */ }
      if (BUILTIN) LQ.data.lessons = BUILTIN;
    },

    hasPack: function () {
      try { return !!localStorage.getItem(PACK_KEY); } catch (e) { return false; }
    }
  };

  /** 補齊缺少的欄位，避免匯入的 JSON 少寫幾格就讓畫面壞掉 */
  function normalize(l, i) {
    return {
      id: l.id || ("l" + (i + 1)),
      no: l.no || ("單元 " + String(i + 1).padStart(2, "0")),
      name: l.name || l.title || ("第 " + (i + 1) + " 單元"),
      virtue: l.virtue || "",
      glyph: l.glyph || "◈",
      unitId: l.unitId || null,
      desc: l.desc || l.subtitle || "",
      lessonTitle: l.lessonTitle || l.title || "",
      lessonSubtitle: l.lessonSubtitle || l.subtitle || "",
      sections: Array.isArray(l.sections) ? l.sections : []
    };
  }

  LQ.lessons = Lessons;

})(window.LQ = window.LQ || {});
