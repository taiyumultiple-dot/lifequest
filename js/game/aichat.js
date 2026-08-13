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

  /* --- 角色回應（玩家寫完反思之後）---------------------------------
     跟上面的對話題庫不一樣的地方：這裡回話的是遊戲裡的某個角色，
     而且它要讓玩家覺得「這個人真的讀了我寫的東西」。做法不是硬誇，
     是先講出玩家這段寫法的**特徵**（有沒有講到具體的某一次、有沒有
     給理由、是不是只寫了幾個字），再用角色的口吻接一句，最後追問。 */

  /** 哪一關由誰回話。挑的是那一關主題上最有話講的人。 */
  var VOICE_OF = {
    p00: "xiaowen",    // 總說：把可華拉進迷宮的人
    u01: "xiaowen",    // 哲學思考：博士，最會把問題拆開
    u02: "xiaoping",   // 人學探索：標籤與自我，她最懂被貼標籤
    u03: "grandpa",    // 終極關懷：生病、失去與告別
    u04: "bojun",      // 價值思辨：會直接問「那你到底要選哪個」
    u05: "dad"         // 靈性修養：休息與罪惡感，爸爸自己走過
  };

  /* 追問要綁「這一關的題目」，不能用上面那套泛用主題題庫。
     實測過：玩家寫「分組報告時我不敢問為什麼」，泛用題庫會命中
     「報告」這個關鍵字然後問他分數，但他講的根本不是分數。
     所以每一關自己配一組追問，接著它自己的反思題往下問。 */
  var ASK_OF = {
    p00: [   // 「原本想問為什麼，最後說了都可以」
      "那句「都可以」說出口的前一秒，你心裡真正想說的是什麼？",
      "如果重來一次，你會怎麼開口？把那句話寫出來看看。",
      "你是怕被覺得難搞，還是覺得講了也改變不了？這兩個要處理的方式不一樣。"
    ],
    u01: [   // 「原本覺得不用想那麼多，其實值得多想」
      "你說「不用想那麼多」的時候，是真的不想想，還是想了會麻煩？",
      "如果多想一下，你怕會想到什麼？",
      "這件事你如果認真想清楚，第一個要問的問題會是什麼？"
    ],
    u02: [   // 「別人常拿來形容你、但你不同意的詞」
      "那個詞是誰先講的？後來為什麼大家都跟著用？",
      "你有反駁過嗎？如果沒有，是因為懶得解釋，還是怕解釋了更奇怪？",
      "如果只能用一句話讓別人改觀，你會說什麼？"
    ],
    u03: [   // 「一直想說但還沒說出口的一句話」
      "為什麼還沒說？是還沒有機會，還是說了怕改變什麼？",
      "如果對方明天就聽不到了，你今天會說嗎？",
      "這句話你希望他聽完之後，做什麼、或不做什麼？"
    ],
    u04: [   // 「和別人看法不一樣，你的理由」
      "你的理由裡，哪一個部分是對方也會同意的？從那裡開始講會比較好談。",
      "如果對方的理由也成立，你會改變想法嗎？還是你其實在乎的是別的事？",
      "這件事如果最後照對方的做，你最不能接受的是哪一點？"
    ],
    u05: [   // 「只能為自己做一件很小的事」
      "這件小事你上一次做是什麼時候？中間為什麼停了？",
      "做這件事的時候，你會有罪惡感嗎？那個聲音是誰的？",
      "如果今天真的做了，你希望明天的自己有什麼不一樣？"
    ]
  };

  /** 每個角色的招牌開場，語氣要區分得出來 */
  var VOICE_LINE = {
    xiaowen: ["這裡有一個可以再拆一層的地方。", "我先不給答案，我想先確認一件事。"],
    xiaoping: ["我看得懂這種感覺，我也常常這樣。", "你寫這段的時候，應該有點難吧。"],
    grandpa: ["我活到這個歲數，這種事看過不少次。", "不急，這種事本來就想不快。"],
    bojun: ["欸，我直接講喔。", "這個我有話說。"],
    dad: ["爸爸以前也是這樣過來的。", "我年輕的時候沒人跟我講這個。"],
    kehua: ["我也在想一樣的事。", "說實話，我沒有比你清楚。"]
  };

  /** 看玩家寫了什麼「形狀」，回一句真的針對他那段話的觀察 */
  function shapeNote(t) {
    var when = /今天|昨天|上禮拜|上週|那天|上次|前幾天|剛剛|早上|晚上/.test(t);
    var who = /他|她|朋友|同學|媽|爸|老師|哥|姐|弟|妹|阿嬤|阿公|爺爺|奶奶/.test(t);
    var why = /因為|所以|但是|可是|不過|其實|反而|才會/.test(t);

    if (t.length < 12) {
      return "你寫得很短。短不代表不真，但我猜你其實還有下半句沒寫。";
    }
    if (when && who) {
      return "你講了一個很具體的場景——有時間、有人。這種寫法騙不了自己，很好。";
    }
    if (why) {
      return "你有替自己的反應找理由，這比只寫「我就是不爽」多走了一步。";
    }
    if (who) {
      return "這件事裡有別人。有別人的事最難，因為你只能決定自己那一半。";
    }
    if (when) {
      return "你記得是哪一次。記得住的那一次，通常就是真正卡住的那一次。";
    }
    return "你寫的是一個狀態，還沒有落到某一次。落到某一次，它才會變得可以處理。";
  }

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
  /**
   * 四種解讀角度。「重新解讀」會依序換一個，
   * 所以同一組牌可以讀出四份不一樣的報告。
   */
  var ANGLE_TEXT = {
    "default": {
      title: function (a, c) { return "從「" + a + "」走到「" + c + "」的這一段路"; },
      lead: "下面先一張一張看它們各自在說什麼，再把三張合起來回答你的問題。",
      aspect: ["起點與來路", "此刻的狀態", "接下來的考驗"],
      apply: ["這對你問的事代表什麼", "現在的實際狀況", "往前走要注意什麼"],
      angle: ""
    },
    other: {
      title: function (a, c) { return "如果換成對方的位置，這三張是這樣排的"; },
      lead: "這一次換一個角度：把三張牌讀成「對方那一邊發生了什麼」。" +
            "這不是讀心，是把牌面的可能性放到對方身上看一遍。",
      aspect: ["對方帶著的", "對方現在的狀態", "對方要跨過的"],
      apply: ["對方那邊可能是什麼樣子", "他此刻的處境", "他要面對的部分"],
      angle: "從對方的角度讀。牌面反映的是可能性，不是事實。"
    },
    self: {
      title: function (a, c) { return "先不管別人，這三張在說你自己"; },
      lead: "這一次把焦點收回來：不看別人怎麼想，只看你自己的狀態與需求。",
      aspect: ["你一直以來的模式", "你現在真正的感受", "你需要練的"],
      apply: ["這對你自己代表什麼", "你此刻的狀態", "你可以為自己做的"],
      angle: "把焦點放在提問者自己身上，不談別人怎麼想。"
    },
    timing: {
      title: function (a, c) { return "什麼該現在做，什麼該再等一下"; },
      lead: "這一次看的是節奏：哪些事已經到了時候，哪些事再等一下比較好。",
      aspect: ["已經過去的階段", "現在這個階段", "還沒到的階段"],
      apply: ["這一段已經完成了什麼", "現在適合做什麼", "什麼還不到時候"],
      angle: "從時機與節奏讀：什麼該現在做、什麼該等。不要給具體日期。"
    }
  };

  function offlineTarot(question, cards, angle) {
    var q = String(question || "").trim();
    var A = ANGLE_TEXT[angle] || ANGLE_TEXT["default"];
    var POS_ASPECT = A.aspect;
    var POS_APPLY = A.apply;

    var opening =
      (q ? "針對你問的「" + q + "」，" : "沒有特定問題的情況下，") +
      "三張牌分別落在過去、現在、未來三個位置。" + A.lead;

    var out = cards.map(function (c, i) {
      return {
        cardName: c.name + (c.rev ? "逆位" : "正位") +
                  "（" + (c.rev ? "Reversed " : "") + c.en + "）",
        aspect: POS_ASPECT[i] + "｜" + c.theme,
        general: (c.rev
            ? "正位的" + c.name + "代表：" + (c.uprightRef || c.meaning) +
              "　逆位則轉向另一面——" + c.meaning
            : c.meaning) +
          (c.lesson ? "\n\n這張牌對應的課題是：" + c.lesson : ""),
        appliedLabel: POS_APPLY[i],
        applied: (q
            ? "放在「" + q + "」這件事上，這張牌指的是「" + c.theme + "」這個面向。"
            : "這張牌在這個位置指的是「" + c.theme + "」這個面向。") +
          (i === 0 ? "它說的是你一路帶到今天的東西——未必記得從哪天開始，但已經變成你的預設反應。"
           : i === 1 ? "它說的是你此刻真正卡住的地方，通常也是最不想承認的那一塊。"
           : "它不是預告會發生什麼，而是如果你要往前，這件事就是要練的。") +
          (c.life ? "　放進日常裡，它可能長這樣——" + c.life : "")
      };
    });

    var themes = cards.map(function (c) { return "「" + c.theme + "」"; }).join("、");

    var conclusion =
      (q ? "回到你的問題——" : "把三張合起來看——") +
      "三張的主題依序是" + themes + "。\n\n" +
      "第一張與第三張常常是相反的：你原本那一套在這件事上已經不夠用，" +
      "所以中間那張才會卡住。這不代表你哪裡做錯了，只代表你走到了需要多學一項的位置。\n\n" +
      (q ? "牌沒辦法替你回答「是」或「不是」——如果它能決定，你也不會拿來問。" +
           "它能做的是把這個問題拆開：你現在的猶豫，是因為還沒想清楚，" +
           "還是因為你其實已經知道答案、只是不想承認？"
         : "三張擺在一起，哪一張最讓你不舒服？那一張通常就是這次真正要看的。");

    var advice =
      "先做一件小的：把上面三張裡最讓你不舒服的那一句抄下來，" +
      "然後寫三行回應它。不用寫得漂亮，寫得真實就好。\n\n" +
      (q ? "另外，把你的問題拆成兩題分開回答——「我真正想要的是什麼」" +
           "以及「我在怕什麼」。這兩題答完，決定通常自己就會浮出來。\n\n" : "") +
      "最後一句實話：與其一直猜結果，不如把注意力收回到你自己能決定的事情上。" +
      "那些事情不多，但每一件都真的動得了。";

    return {
      offline: true,
      title: A.title(cards[0].theme, cards[2].theme),
      opening: opening,
      cards: out,
      conclusion: conclusion,
      advice: advice,
      ask: cards[1] ? cards[1].ask : ""
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

  /**
   * 離線版的角色回應。
   * @param {object} ch   角色資料（LQ.data.characters 裡的一筆）
   * @param {object} ctx  { unitId, unitName, virtue, question }
   * @param {string} text 玩家寫的東西
   * @param {number} turn 第幾輪（追問才不會重複）
   */
  function offlineCompanion(ch, ctx, text, turn) {
    var t = String(text || "").trim();
    if (!t) return "你還沒寫東西。想到什麼寫什麼，寫壞了也沒關係。";
    if (hit(t, CRISIS)) return CRISIS_REPLY;

    var n = typeof turn === "number" ? turn : 0;

    /* 追問優先用這一關自己的（接著它的反思題往下問）。
       沒有對應的關卡才退回泛用主題題庫。 */
    var asks = ASK_OF[ctx && ctx.unitId];
    if (!asks) {
      var topic = GENERAL;
      for (var i = 0; i < TOPICS.length; i++) {
        if (hit(t, TOPICS[i].keys)) { topic = TOPICS[i]; break; }
      }
      asks = topic.asks;
    }

    var lines = VOICE_LINE[ch.key] || VOICE_LINE.kehua;
    var open = lines[n % lines.length];
    var q = quoteBack(t);

    return (q ? q + "\n\n" : "") +
      open + "\n\n" +
      shapeNote(t) + "\n\n" +
      asks[n % asks.length];
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
    tarot: function (question, cards, angle) {
      return post({
        mode: "tarot",
        question: question || "",
        cards: cards,
        angle: angle || "default"
      }).then(function (data) {
        if (!data.opening || !data.cards || !data.conclusion) throw new Error("BAD_SHAPE");
        return {
          offline: false,
          title: data.title || "",
          opening: data.opening,
          cards: data.cards,
          conclusion: data.conclusion,
          advice: data.advice || "",
          ask: data.ask || ""
        };
      }).catch(function () {
        return offlineTarot(question, cards, angle);
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
    },

    /** 這一關由哪個角色回話 */
    voiceFor: function (unitId) {
      var key = VOICE_OF[unitId] || "xiaowen";
      var ch = (LQ.data && LQ.data.characters && LQ.data.characters[key]) || {};
      return {
        key: key, name: ch.name || "王小文",
        face: ch.face || "", role: ch.role || "", about: ch.about || ""
      };
    },

    /**
     * 角色回應玩家寫的反思。
     *
     * 線上走的是後端**既有的** mode:"chat"，不是新的 mode——Supabase 上那支
     * oracle-chat 函式的原始碼不在這個 repo 裡，加新 mode 就得重新部署。
     * 沿用 chat 的話，等金鑰一設好，這個功能立刻就有真 AI，不用動後端。
     * traits 那四格改放角色的設定，signName 放角色名字。
     *
     * @param {object} ctx { unitId, unitName, virtue, question }
     * @param {array}  history [{role:"user"|"ai", text}]
     * @param {string} text 玩家寫的東西
     */
    companion: function (ctx, history, text) {
      var v = AI.voiceFor(ctx.unitId);
      var ch = (LQ.data && LQ.data.characters && LQ.data.characters[v.key]) || {};

      return post({
        mode: "chat",
        date: LQ.state.today(),
        sign: v.key,
        signName: v.name,
        traits: {
          said: v.name + "（" + v.role + "）：" + (ch.about || ""),
          truth: "現在在回應一位高中生剛寫完的反思。題目是「" + (ctx.question || "") + "」。",
          lesson: "這一關的主題是「" + (ctx.virtue || "") + "」（" + (ctx.unitName || "") + "）。",
          stuck: "用這個角色的口吻，先接住他寫的內容，再問一個能讓他多想一層的問題。" +
                 "不要說教、不要打分數、不要給結論。三段以內。"
        },
        history: (history || []).slice(-6),
        message: text
      }).then(function (data) {
        if (!data.text) throw new Error("EMPTY");
        return { text: data.text, who: v, offline: false };
      }).catch(function () {
        /* history 進來時已經含這一句了，所以要減一，第一次回應才會用到
           該關最主要的那個追問（asks[0]）。 */
        var turn = (history || []).filter(function (m) { return m.role === "user"; }).length - 1;
        if (turn < 0) turn = 0;
        var chWithKey = { key: v.key, name: v.name };
        return { text: offlineCompanion(chWithKey, ctx, text, turn), who: v, offline: true };
      });
    }
  };

  LQ.ai = AI;

})(window.LQ = window.LQ || {});
