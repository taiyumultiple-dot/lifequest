/* ==========================================================================
   存檔與全域狀態
   主存檔放在瀏覽器的 localStorage，沒有帳號也能玩。
   注意：玩家登入之後，main.js 會在每次 save() 之後排一次 cloud.schedulePush()，
   把「整份存檔」（含 journal 反思內容）同步到 Supabase 的個人資料列。
   所以任何對玩家宣稱「不會上傳」的文案都是錯的——改文案前先看這裡。
   ========================================================================== */
(function (LQ) {
  "use strict";

  var KEY = "lifequest_save_v1";
  var VERSION = 1;

  /** 全新玩家的初始存檔 */
  function blank() {
    return {
      v: VERSION,
      createdAt: Date.now(),
      updatedAt: Date.now(),

      // --- 資源 ---
      stamina: 100,            // 心力（開一扇門要花）
      frag: 0,                 // 記憶碎片（通用貨幣）

      // --- 商店買到的永久加成（直接存加成量，方便日後調整價格）---
      bonus: { stamina: 0, think: 0, guard: 0 },

      // --- 進度 ---
      units: {},               // { p00: { cleared, rank, tries, at } }
      seenIntro: {},           // 哪些單元的章前劇情看過了（可跳過）

      // --- 迷障 ---
      illusions: {},           // { i0101: { lv: 1, at } }
      equipped: [null, null],  // 同行警覺兩格

      // --- 稱號 ---
      titleId: "t01",
      titles: { t01: true },

      // --- 每日 ---
      daily: { date: "", cleared: false, plays: 0, firstDone: false },
      checkin: [],             // 打過卡的日期字串，最多留 7 筆

      // --- 追跡 ---
      huntBest: 0,

      // --- 成長紀錄（反思答案）---
      journal: [],

      // --- 心象探索（塔羅／測驗／星座／價值羅盤）---
      oracle: {
        seed: String(Date.now()) + "-" + Math.floor(Math.random() * 100000), // 每個人的抽牌基準，避免全班同一張
        zodiac: "",              // 玩家選的星座 id
        tarot: { date: "", spread: "", cards: null },  // 今日抽的牌（同一天重開是同一組）
        zodiacDate: "",          // 今日星座提問已看過的日期
        psych: {},               // { testId: { top, scores, at } }
        values: null             // { rank: [id,id,id], at }
      },

      // --- 偏好 ---
      sound: true,          // 音效
      music: true,          // 背景音樂（只有 config 有設定音樂時才有作用）
      musicVol: 0.4         // 背景音樂音量 0~1
    };
  }

  /** 舊版存檔升級（之後改結構時在這裡補） */
  function migrate(save) {
    if (!save || typeof save !== "object") return blank();
    if (!save.v) save.v = VERSION;
    // 缺欄位就從空白存檔補上，避免改版後舊存檔壞掉
    var base = blank();
    Object.keys(base).forEach(function (k) {
      if (save[k] === undefined || save[k] === null) save[k] = base[k];
    });
    Object.keys(base.bonus).forEach(function (k) {
      if (typeof save.bonus[k] !== "number") save.bonus[k] = 0;
    });
    if (!Array.isArray(save.equipped) || save.equipped.length !== 2) save.equipped = [null, null];
    if (!Array.isArray(save.checkin)) save.checkin = [];
    if (!Array.isArray(save.journal)) save.journal = [];
    // 心象探索是後來才加的，舊存檔可能有 oracle 但少了裡面某幾格
    if (typeof save.oracle !== "object") save.oracle = base.oracle;
    Object.keys(base.oracle).forEach(function (k) {
      if (save.oracle[k] === undefined || save.oracle[k] === null) save.oracle[k] = base.oracle[k];
    });
    save.v = VERSION;
    return save;
  }

  var data = blank();
  var listeners = [];

  var State = {

    /** 讀存檔（開場呼叫一次） */
    load: function () {
      try {
        var raw = localStorage.getItem(KEY);
        data = raw ? migrate(JSON.parse(raw)) : blank();
      } catch (e) {
        console.warn("[存檔] 讀取失敗，改用新存檔：", e);
        data = blank();
      }
      return data;
    },

    /** 寫存檔 */
    save: function () {
      data.updatedAt = Date.now();
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch (e) {
        console.warn("[存檔] 寫入失敗（可能是無痕模式或空間不足）：", e);
      }
      listeners.forEach(function (fn) { try { fn(data); } catch (e) { console.error(e); } });
      return data;
    },

    /** 取得整份存檔（直接改物件內容後記得呼叫 save）*/
    get d() { return data; },

    /** 狀態變動時想跟著更新畫面的，註冊在這裡 */
    onChange: function (fn) { listeners.push(fn); },

    /** 全部刪除、重新開始 */
    wipe: function () {
      try { localStorage.removeItem(KEY); } catch (e) { /* 忽略 */ }
      data = blank();
      return this.save();
    },

    /** 匯出成可下載的 JSON 字串 */
    exportJSON: function () {
      return JSON.stringify(data, null, 2);
    },

    /**
     * 直接採用另一份存檔（雲端拉回來的時候用）。
     * 會跑一次 migrate，所以舊格式也接得回來。
     */
    adopt: function (obj) {
      if (!obj || typeof obj !== "object") return false;
      data = migrate(obj);
      this.save();
      return true;
    },

    /** 從 JSON 字串匯入（成功回 true）*/
    importJSON: function (text) {
      try {
        var obj = JSON.parse(text);
        if (!obj || typeof obj !== "object") return false;
        data = migrate(obj);
        this.save();
        return true;
      } catch (e) {
        return false;
      }
    },

    // ---- 常用小工具 --------------------------------------------------

    /** 今天的日期字串（用本地時間，這樣跨日的時機才符合玩家直覺）*/
    today: function () {
      var d = new Date();
      return d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
    },

    /** 某一關的紀錄 */
    unit: function (id) {
      return data.units[id] || null;
    },

    /** 這一關是不是已經通關 */
    isCleared: function (id) {
      var u = data.units[id];
      return !!(u && u.cleared);
    },

    /** 記錄通關 */
    clearUnit: function (id, rank, tries) {
      var prev = data.units[id];
      data.units[id] = {
        cleared: true,
        rank: rank,
        tries: (prev && prev.tries != null) ? Math.min(prev.tries, tries) : tries,
        at: Date.now()
      };
      this.save();
    },

    /** 寫一則反思進成長紀錄 */
    addJournal: function (unitId, unitName, question, answer) {
      data.journal.unshift({
        unitId: unitId, unitName: unitName,
        q: question, a: answer,
        at: Date.now()
      });
      if (data.journal.length > 200) data.journal.length = 200;
      this.save();
    }
  };

  LQ.state = State;

})(window.LQ = window.LQ || {});
