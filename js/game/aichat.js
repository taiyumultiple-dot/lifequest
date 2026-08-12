/* ==========================================================================
   AI 連線（星座今日運勢 + 對話）
   ---------------------------------------------------------------------------
   金鑰**絕對不能**放在這裡。這支檔案會被任何人打開來看，寫進來就等於公開。
   所以真正呼叫 Gemini 的動作一律在後端做，這裡只負責把話送出去、把回覆收回來。

   端點怎麼決定（由上往下，第一個成立的就用）：

     1. js/config.js 的 ai.endpoint 有填 → 用那個
     2. 在 localhost 開發 → /api/oracle-chat
        （生命教育平台的 server.ts 提供，遊戲被它 serve 時是同源）
     3. 有設定 Supabase → {supabaseUrl}/functions/v1/oracle-chat
        （線上 GitHub Pages 走這條；金鑰存在 Supabase 的 secret 裡）
     4. 都沒有 → 離線模式：改用本機組出來的內容，畫面照常運作

   第 4 條很重要：沒有後端的時候這一頁不能壞掉，只是變成沒有 AI 的版本。
   ========================================================================== */
(function (LQ) {
  "use strict";

  var TIMEOUT = 20000;          // 20 秒沒回應就當作失敗，改走離線版
  var CACHE_KEY = "lq-horoscope";   // 今日運勢的本機快取（不進雲端存檔）

  function cfg() {
    return (LQ.config && LQ.config.ai) || {};
  }

  function sb() {
    return (LQ.config && LQ.config.supabaseUrl) ? LQ.config : null;
  }

  function isLocal() {
    var h = location.hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  }

  /** 這台裝置上，AI 要打去哪裡 */
  function endpoint() {
    if (cfg().endpoint) return { url: cfg().endpoint, headers: {} };
    if (isLocal()) return { url: "/api/oracle-chat", headers: {} };
    var s = sb();
    if (s) {
      return {
        url: s.supabaseUrl.replace(/\/+$/, "") + "/functions/v1/oracle-chat",
        headers: { apikey: s.supabaseKey, Authorization: "Bearer " + s.supabaseKey }
      };
    }
    return null;
  }

  function post(body) {
    var ep = endpoint();
    if (!ep) return Promise.reject(new Error("NO_ENDPOINT"));

    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT);

    var headers = { "Content-Type": "application/json" };
    for (var k in ep.headers) if (ep.headers.hasOwnProperty(k)) headers[k] = ep.headers[k];

    return fetch(ep.url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      clearTimeout(timer);
      return r.json().then(function (data) {
        if (!r.ok || data.error) throw new Error(data.error || ("HTTP " + r.status));
        return data;
      });
    }, function (e) {
      clearTimeout(timer);
      throw e;
    });
  }

  /* --- 離線備援 ------------------------------------------------------
     沒有後端時用的版本。刻意寫得跟 AI 版不一樣：它不假裝預言，
     只是把這個星座本來就有的素材，配上今天的日期重新排一次。 */

  function offlineHoroscope(z, date) {
    // 用日期當種子，同一天打開幾次都一樣
    var seed = 0;
    for (var i = 0; i < date.length; i++) seed = (seed * 31 + date.charCodeAt(i)) % 100000;
    for (var j = 0; j < z.id.length; j++) seed = (seed * 31 + z.id.charCodeAt(j)) % 100000;

    var moods = ["適合把話講清楚", "適合先聽再說", "適合做一件小事", "適合休息一下", "適合問一個問題"];
    var focus = ["關係", "自己", "步調", "選擇", "身體"];

    return {
      offline: true,
      headline: moods[seed % moods.length],
      body: z.truth,
      keywords: [focus[seed % focus.length], focus[(seed + 2) % focus.length]],
      tip: z.lesson
    };
  }

  /**
   * 沒有 AI 時的解牌。不硬掰運勢，只是把每張牌本來就有的欄位
   * 按位置排好，並老實說這是離線版。
   */
  function offlineTarot(question, cards) {
    return {
      offline: true,
      opening: (question
          ? "你問的是：「" + question + "」\n\n"
          : "") +
        "現在連不到 AI，所以這份報告是用每張牌自己的說明排出來的，" +
        "沒有針對你的問題重寫。下面三段照「你帶著什麼、你正在面對、你可以練習」的順序讀，" +
        "讀完再回頭看你的問題，通常就會知道自己卡在哪一段。",
      cards: cards.map(function (c) {
        return {
          position: c.slot,
          cardName: c.name + "（" + (c.rev ? "逆位" : "正位") + "）",
          text: c.meaning + "\n\n生命課題：" + c.lesson +
                "\n可能長這樣：" + c.life +
                "\n\n它問你：" + c.ask
        };
      }),
      together: "三張擺在一起，哪一張最讓你不舒服？為什麼是它？" +
                "最不想面對的那一張，通常就是這次真正要看的那一張。",
      advice: "挑上面三個「它問你」裡面最刺的那一句，今天之內回答它——" +
              "寫下來也好，跟一個人說也好，做完一件小事也好。",
      ask: ""
    };
  }

  function offlineReply(text) {
    var t = (text || "").trim();
    if (!t) return "你想從哪一件事開始說？";
    return "現在連不到 AI，所以我先把你寫的留著。\n\n" +
           "你剛剛說的那件事裡，最讓你在意的是哪一個部分？" +
           "如果只能挑一句話帶走，你會挑哪一句？";
  }

  /* --- 今日運勢 ------------------------------------------------------ */

  function readCache(sign, date) {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (c && c.sign === sign && c.date === date) return c.data;
    } catch (e) { /* 壞掉就當作沒有 */ }
    return null;
  }

  function writeCache(sign, date, data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ sign: sign, date: date, data: data }));
    } catch (e) { /* 存不進去也無所謂 */ }
  }

  var AI = {

    /** 這台裝置有沒有可能連得到 AI（畫面用來決定要不要顯示「離線」標示）*/
    available: function () { return !!endpoint(); },

    endpointName: function () {
      var ep = endpoint();
      if (!ep) return "離線";
      if (ep.url.indexOf("/functions/v1/") !== -1) return "Supabase";
      if (ep.url.indexOf("/api/") === 0) return "本機後端";
      return "自訂";
    },

    /**
     * 今日運勢。同一天同一個星座只會真的去要一次，之後讀快取。
     * 失敗一律回離線版，不會讓畫面卡住。
     */
    horoscope: function (z, date) {
      var hit = readCache(z.id, date);
      if (hit) return Promise.resolve(hit);

      return post({
        mode: "horoscope",
        date: date,
        sign: z.id,
        signName: z.name,
        traits: { said: z.said, truth: z.truth, lesson: z.lesson, stuck: z.stuck }
      }).then(function (data) {
        var out = {
          headline: data.headline || "",
          body: data.body || "",
          keywords: data.keywords || [],
          tip: data.tip || ""
        };
        writeCache(z.id, date, out);
        return out;
      }).catch(function () {
        return offlineHoroscope(z, date);
      });
    },

    /**
     * 塔羅解牌報告。cards 是三張牌的完整資料（含位置與牌義）。
     * 失敗時回本機版：把三張牌自己的欄位串成一份短一點但誠實的報告。
     */
    tarot: function (question, cards) {
      return post({
        mode: "tarot",
        question: question || "",
        cards: cards
      }).then(function (data) {
        if (!data.opening || !data.cards) throw new Error("BAD_SHAPE");
        return {
          offline: false,
          opening: data.opening,
          cards: data.cards,
          together: data.together || "",
          advice: data.advice || "",
          ask: data.ask || ""
        };
      }).catch(function () {
        return offlineTarot(question, cards);
      });
    },

    /**
     * 對話。history 是 [{role:"user"|"ai", text}]，只送最近幾輪。
     */
    chat: function (z, date, history, text) {
      return post({
        mode: "chat",
        date: date,
        sign: z.id,
        signName: z.name,
        traits: { said: z.said, truth: z.truth, lesson: z.lesson, stuck: z.stuck },
        history: (history || []).slice(-8),
        message: text
      }).then(function (data) {
        return { text: data.text || offlineReply(text), offline: false };
      }).catch(function () {
        return { text: offlineReply(text), offline: true };
      });
    }
  };

  LQ.ai = AI;

})(window.LQ = window.LQ || {});
