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

  /* --- 離線版的對話引擎 ----------------------------------------------
     沒有金鑰的時候（或網路斷了），這裡要頂上。做法不是硬掰答案，
     而是做這個遊戲本來就在做的事：把對方講的話接住，然後問一個
     好問題。題庫是照主題分的，回覆會先引一句對方自己寫的話，
     讓它讀起來像有在聽，而不是罐頭。 */

  /** 危險訊號。這一組一定要在離線版也有，不能只寫在後端的提示詞裡。 */
  var CRISIS = ["自殺", "想死", "不想活", "活不下去", "自殘", "割腕", "跳下去",
                "結束生命", "被打", "被揍", "家暴", "被摸", "性騷", "猥褻",
                "霸凌", "被排擠很久", "撐不下去"];

  var CRISIS_REPLY =
    "謝謝你把這件事說出來，這不容易。\n\n" +
    "我是遊戲裡的一個角色，這件事需要真的在你身邊的人幫忙——" +
    "請去找你信任的大人，或學校的輔導老師，今天就去。\n\n" +
    "如果現在很急，可以打這幾支，24 小時都有人接：\n" +
    "・1995 生命線\n・1925 安心專線\n・113 保護專線\n\n" +
    "你先去找人，其他的等你安全了再說。";

  /** 主題題庫。keys 是關鍵字，echo 是接話的句型，asks 是追問。 */
  var TOPICS = [
    {
      id: "friend",
      keys: ["朋友", "同學", "室友", "講開", "誤會", "吵架", "冷戰", "已讀", "群組",
             "排擠", "邊緣", "絕交", "道歉", "他不理", "她不理"],
      echo: "聽起來這件事卡在「人」的那一邊——不是事情難，是關係難。",
      asks: [
        "你希望對方知道的那句話，是什麼？如果他今天就會聽，你會怎麼開頭？",
        "你們之間是從哪一次開始怪怪的？那次發生了什麼？",
        "如果不講開，最壞會怎樣？如果講開了，你最怕的是什麼？",
        "你是在等他先開口嗎？如果他也在等，那要等到什麼時候？"
      ]
    },
    {
      id: "study",
      keys: ["考試", "成績", "分數", "作業", "報告", "讀書", "補習", "段考", "模擬考",
             "退回", "重寫", "念不完", "背不起來", "上課"],
      echo: "課業這種事，難的常常不是題目，是那個「我是不是不夠好」的感覺。",
      asks: [
        "這件事讓你難受的，是分數本身，還是分數代表的那個評價？",
        "如果這次成績沒有人會知道，你還會這麼在意嗎？",
        "你現在卡住的那一段，是不會，還是不想開始？兩個差很多。",
        "有沒有一個人，你希望他看到你的努力？他知道嗎？"
      ]
    },
    {
      id: "family",
      keys: ["爸", "媽", "父母", "家裡", "家人", "爺爺", "奶奶", "外婆", "外公",
             "弟弟", "妹妹", "哥哥", "姐姐", "阿公", "阿嬤"],
      echo: "家裡的事最難講，因為你沒辦法離開現場，也沒辦法真的生氣到底。",
      asks: [
        "你希望他們懂的是哪一件事？你有真的講過嗎，還是你覺得講了也沒用？",
        "如果今天換你當他，你會怎麼說那句話？",
        "這件事裡，你最想要的是被理解，還是被放過？",
        "你在家裡通常扮演什麼角色？那個角色累嗎？"
      ]
    },
    {
      id: "mood",
      keys: ["累", "煩", "難過", "生氣", "不爽", "委屈", "焦慮", "壓力", "哭",
             "空", "沒動力", "提不起勁", "低潮", "煩躁", "討厭自己"],
      echo: "你先說出來了，這件事本身就有用——很多人會直接跳過這一步。",
      asks: [
        "這個情緒如果會說話，它想跟你要什麼？",
        "今天最累的是身體還是腦袋？你怎麼知道的？",
        "這種感覺是今天才有的，還是已經一陣子了？",
        "如果現在有人問你「你還好嗎」，誠實的版本你會怎麼回答？"
      ]
    },
    {
      id: "self",
      keys: ["志願", "科系", "未來", "選擇", "決定", "不知道要", "迷惘", "方向",
             "我是誰", "適合", "興趣", "夢想", "以後"],
      echo: "這種問題沒有標準答案，但你會問，代表你已經開始認真了。",
      asks: [
        "如果沒有人會失望，你會選哪一個？",
        "你現在猶豫的兩個選項，各自最吸引你的是什麼？",
        "十年後的你回頭看今天，會希望你先做哪一件事？",
        "你是在選一條路，還是在躲另一條路？"
      ]
    },
    {
      id: "body",
      keys: ["睡不著", "熬夜", "失眠", "頭痛", "肚子痛", "生病", "沒力", "累到",
             "手機", "滑到"],
      echo: "身體常常比腦袋誠實，它先撐不住的時候，通常是在替你講話。",
      asks: [
        "最近幾點睡？那個時間是你選的，還是它自己變成這樣的？",
        "身體不舒服的時候，你通常怎麼對待它？忽略它還是照顧它？",
        "如果今天可以拿回一小時，你想拿來做什麼？"
      ]
    }
  ];

  /** 沒有命中任何主題時用的 */
  var GENERAL = {
    echo: "我讀完了。你寫的這件事，聽起來還沒有真的過去。",
    asks: [
      "這件事裡，最讓你在意的是哪一個部分？",
      "如果只能留下一句話給明天的自己，你會寫什麼？",
      "你希望這件事最後怎麼收尾？那個結局需要你先做什麼？",
      "剛剛寫的時候，有沒有哪一句你差點沒寫出來？"
    ]
  };

  function hit(text, keys) {
    for (var i = 0; i < keys.length; i++) if (text.indexOf(keys[i]) !== -1) return true;
    return false;
  }

  /** 從對方寫的東西裡挑一小段引用回去，讓回覆看起來有在聽 */
  function quoteBack(text) {
    var parts = String(text).split(/[。！？\n，,.!?]/).filter(function (s) {
      return s.trim().length >= 6;
    });
    if (!parts.length) return "";
    var longest = parts.sort(function (a, b) { return b.length - a.length; })[0].trim();
    if (longest.length > 24) longest = longest.substring(0, 24) + "…";
    return "你說「" + longest + "」。";
  }

  /**
   * 離線版的回覆。turn 用來換題目，同一輪對話不會一直問同一句。
   */
  function offlineReply(text, turn) {
    var t = String(text || "").trim();
    if (!t) return "你想從哪一件事開始說？";

    if (hit(t, CRISIS)) return CRISIS_REPLY;

    var topic = GENERAL;
    for (var i = 0; i < TOPICS.length; i++) {
      if (hit(t, TOPICS[i].keys)) { topic = TOPICS[i]; break; }
    }

    var n = typeof turn === "number" ? turn : 0;
    var ask = topic.asks[n % topic.asks.length];
    var q = quoteBack(t);

    return (q ? q + "\n\n" : "") + topic.echo + "\n\n" + ask;
  }

  /**
   * 沒有 AI 時的解牌。不硬掰預言，而是把三張牌的素材與玩家的問題
   * 織成一份讀得下去的長文（每張牌都有自己的位置與轉折句）。
   */
  function offlineTarot(question, cards) {
    var q = String(question || "").trim();
    var c0 = cards[0], c1 = cards[1], c2 = cards[2];

    var title = "從「" + c0.theme + "」走到「" + c2.theme + "」的這一段路";

    var past =
      "回顧過往，" + c0.name + (c0.rev ? "逆位" : "正位") + "落在「過去」這個位置，" +
      "說的是你一路帶到今天的那個東西——「" + c0.theme + "」。\n\n" +
      c0.meaning + "\n\n" +
      "它對應的課題是：" + c0.lesson + "　放進高中生活裡，它常常長這樣——" + c0.life +
      "　你未必記得它從哪一天開始，但它已經變成你面對事情的預設反應了。";

    var present =
      "來到現在，" + c1.name + (c1.rev ? "逆位" : "正位") + "指出你此刻真正卡住的地方：「" +
      c1.theme + "」。\n\n" + c1.meaning + "\n\n" +
      (q ? "回到你問的「" + q + "」——這張牌沒有要替你回答要或不要。" +
           "它在問的是：你現在的猶豫，是因為還沒想清楚，還是因為你已經知道答案、只是不想承認？\n\n"
         : "") +
      "這個位置的提醒是：" + c1.lesson;

    var future =
      "往前看，" + c2.name + (c2.rev ? "逆位" : "正位") + "談的是「" + c2.theme + "」。" +
      "這不是預告會發生什麼事，而是一個考驗：如果你要往前，這件事就是你要練的。\n\n" +
      c2.meaning + "\n\n" +
      "它的課題是：" + c2.lesson + "　你可以先從一件小事開始——" + c2.life +
      "　這種事不會一次到位，但做過一次跟沒做過，差別很大。";

    var summary =
      "總結來說，這三張連起來是一條線：你帶著「" + c0.theme + "」走到今天，" +
      "現在卡在「" + c1.theme + "」，而牌指的方向是「" + c2.theme + "」。\n\n" +
      "第一張與第三張常常是相反的——你原本那一套在這件事上不夠用了，" +
      "所以中間那張才會卡住。這不代表你哪裡做錯，只代表你走到了需要多學一項的位置。\n\n" +
      "三張擺在一起，哪一張最讓你不舒服？那一張通常就是這次真正要看的。" +
      "願你在想清楚之前，先對自己有點耐心。";

    return {
      offline: true,
      title: title,
      past: past,
      present: present,
      future: future,
      summary: summary,
      ask: c1 ? c1.ask : ""
    };
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
        if (!data.title || !data.present) throw new Error("BAD_SHAPE");
        return {
          offline: false,
          title: data.title,
          past: data.past || "",
          present: data.present,
          future: data.future || "",
          summary: data.summary || "",
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
        if (!data.text) throw new Error("EMPTY");
        return { text: data.text, offline: false };
      }).catch(function () {
        // 換算成「這是第幾輪」，離線題庫才不會一直問同一句
        var turn = (history || []).filter(function (m) { return m.role === "user"; }).length;
        return { text: offlineReply(text, turn), offline: true };
      });
    }
  };

  LQ.ai = AI;

})(window.LQ = window.LQ || {});
