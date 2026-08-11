/* ==========================================================================
   遊戲說明
   分頁式的說明面板。進入點有三個：
     ・第一次開遊戲會自動跳出一次
     ・設定頁的「遊戲說明」
     ・鑄鑰畫面右上角的「?」（學生玩到一半忘記規則時用）
   ========================================================================== */
(function (LQ) {
  "use strict";

  function esc(s) { return LQ.ui.modal.esc(s); }

  var TABS = [
    { id: "story", name: "故事" },
    { id: "forge", name: "怎麼玩" },
    { id: "stat",  name: "數值" },
    { id: "sys",   name: "系統" },
    { id: "teach", name: "給老師" }
  ];

  /* ---- 各分頁內容 --------------------------------------------------- */

  var PAGES = {

    story:
      '<p>可華在爸爸的車上遇到一片強光。再睜開眼，他已經不是十七歲了——' +
      "上班、被責備、回家、睡著，然後又是一模一樣的一天。</p>" +
      "<p>黑暗裡跳出一行字：<b>「探索？」</b>他按了下去，於是掉進一座<b>心靈迷宮</b>，" +
      "遇見了長大後的王小文。</p>" +
      '<div class="help__quote">「這裡算是……某種心靈迷宮吧。<br>' +
      "五扇門。要穿過這些關卡，你才回得了家。」<span>—— 王小文</span></div>" +
      "<p>五扇門分別對應生命教育的五大核心素養：<b>哲學思考、人學探索、終極關懷、" +
      "價值思辨、靈性修養</b>。加上序章，總共六關。</p>",

    forge:
      "<p>每一扇門的關鍵，是<b>鑄出開門的鑰匙</b>。</p>" +
      "<p>畫面上會有<b>九塊思考碎片</b>，每一塊是一句話。你要把其中幾塊" +
      "<b>排成正確的順序</b>——那個順序就是鑰匙的齒紋。</p>" +

      '<div class="help__demo">' +
        '<div class="help__demo-t">舉個例子</div>' +
        "<p>假設正解是這三塊，順序是 <b>③ ① ④</b>：</p>" +
        '<div class="help__row">' +
          '<span class="help__chip help__chip--ok">③</span>' +
          '<span class="help__chip help__chip--ok">①</span>' +
          '<span class="help__chip help__chip--ok">④</span>' +
        "</div>" +
        "<p>而你排成了 <b>① ③ ④</b>：</p>" +
        '<div class="help__row">' +
          '<span class="help__chip help__chip--near">①</span>' +
          '<span class="help__chip help__chip--near">③</span>' +
          '<span class="help__chip help__chip--ok">④</span>' +
        "</div>" +
        '<div class="help__judge">' +
          '<span><b class="ok">齒紋吻合 1</b>　第三格的 ④ 放對位置了</span>' +
          '<span><b class="near">錯位 2</b>　① 和 ③ 都用對了，但順序不對</span>' +
        "</div>" +
        "<p class=\"help__tip\">關鍵：<b>「錯位」代表這塊碎片是對的，只是位置要換</b>。" +
        "把它換到別的格子再試一次，就會越來越接近答案。</p>" +
      "</div>" +

      "<p><b>操作方式</b></p>" +
      "<ul>" +
        "<li>點下方的碎片 → 它會填進上面第一個空格</li>" +
        "<li>點上面已填的格子 → 把它拿回來</li>" +
        "<li>排滿之後按<b>「鑄入鑰匙」</b>送出（每次消耗思考力）</li>" +
        "<li>真的卡住，按<b>「查閱碎片」</b>會直接確定一格（消耗比較多）</li>" +
      "</ul>" +
      "<p class=\"help__tip\">排的不是隨便的順序——那是一整段話的<b>邏輯順序</b>。" +
      "先把每塊碎片讀過一遍，想想「哪一句話會先說」，會比亂猜快很多。</p>",

    stat:
      '<div class="help__stat"><b>◈ 心力</b>' +
        "<p>開一扇門、玩每日思辨或追跡都要花心力。用完了就去補給站買一杯熱可可，" +
        "或改天再來。</p></div>" +
      '<div class="help__stat"><b>思考力</b>' +
        "<p>每一場的「嘗試額度」。送出一次推理扣 6，查閱碎片扣 30；" +
        "但只要有齒紋吻合，就會回補回來——<b>想得越準，撐得越久</b>。<br>" +
        "歸零會扣一條心之防線。</p></div>" +
      '<div class="help__stat"><b>◆ 心之防線</b>' +
        "<p>你被說服動搖幾次還站得住。思考力歸零或時間到會扣一條，" +
        "扣完就得重來（但你已經知道的線索不會白費）。</p></div>" +
      '<div class="help__stat"><b>✦ 記憶碎片</b>' +
        "<p>迷宮裡的通用資源。通關、每日思辨、追跡都會拿到，" +
        "可以在補給站買永久強化，或用來強化迷障、解鎖稱號。</p></div>",

    sys:
      '<div class="help__stat"><b>迷障圖鑑</b>' +
        "<p>「迷障」是擋在思考前面的陷阱，例如〈以偏概全〉〈訴諸群眾〉〈非黑即白〉。" +
        "每破解一個就收進圖鑑，裡面會寫<b>它會怎麼低語</b>，以及<b>怎麼識破它</b>。<br>" +
        "收服後可以裝備成「<b>警覺</b>」（最多兩個），提供加成——" +
        "因為你認得出它，它就不再那麼有力量。</p></div>" +
      '<div class="help__stat"><b>每日思辨</b>' +
        "<p>每天一個生活情境（借筆記、群組裡的玩笑、分組落單……），" +
        "全世界同一天拿到同一題。當天第一次通過獎勵最多，連續七天還有額外獎勵。</p></div>" +
      '<div class="help__stat"><b>迷障追跡</b>' +
        "<p>一場接一場，時間越來越短。中途會浮現還沒收服的迷障，" +
        "解開就能帶回圖鑑。輸一場就結束，可以隨時見好就收。</p></div>" +
      '<div class="help__stat"><b>成長紀錄</b>' +
        "<p>每走完一關會問你一個沒有標準答案的問題。寫下的內容" +
        "<b>只存在這台裝置</b>，不會上傳。要交作業的話可以匯出成一份檔案。</p></div>",

    teach:
      "<p><b>一節課怎麼用</b></p>" +
      "<ul>" +
        "<li>一扇門大約 15–25 分鐘（劇情可跳過），適合當一節課的主活動</li>" +
        "<li>第一次上課建議全班一起走序章，把規則講清楚，再讓學生各自往下</li>" +
        "<li>結束前收「成長紀錄」——那才是這個遊戲真正的產出</li>" +
        "<li>鑄鑰題的正解是一條<b>論證鏈</b>，可以直接投影出來，" +
            "問學生「為什麼這句要放在這句後面？」</li>" +
      "</ul>" +
      "<p><b>換成自己的內容</b></p>" +
      "<p>設定頁的「載入內容包」可以上傳一份 JSON 換掉關卡；" +
      "或直接改專案裡的 <code>js/data/units.js</code>，檔案開頭有完整說明。</p>" +
      "<p><b>資料與隱私</b></p>" +
      "<p>全部存在瀏覽器本機，不需要登入、不會上傳。" +
      "換裝置可以用設定頁的匯出／匯入。</p>" +
      '<div class="helpline" style="margin-top:14px">' +
        "<b>會碰到敏感議題的關卡</b>" +
        "<p>第三扇門「說再見之前」談到死亡與失去，結算畫面會固定顯示求助資源。<br>" +
        "安心專線 <b>1925</b>｜生命線 <b>1995</b>｜張老師 <b>1980</b><br>" +
        "若有學生在反思裡透露自身狀況，建議課後個別關心。</p>" +
      "</div>"
  };

  /* ---- 開啟 --------------------------------------------------------- */

  function open(startTab, onClose) {
    var tab = startTab || "forge";

    LQ.ui.modal.modal({
      title: "遊戲說明",
      onClose: onClose,
      body:
        '<div class="help__tabs">' +
          TABS.map(function (t) {
            return '<button type="button" class="help__tab" data-tab="' + t.id + '">' +
                   esc(t.name) + "</button>";
          }).join("") +
        "</div>" +
        '<div class="help__body" id="help-body"></div>',
      acts: [{ label: "開始探索", kind: "btn--gold" }]
    });

    function show(id) {
      tab = id;
      document.getElementById("help-body").innerHTML = PAGES[id] || "";
      document.querySelectorAll("[data-tab]").forEach(function (b) {
        b.setAttribute("aria-current", b.dataset.tab === id ? "true" : "false");
      });
      var box = document.querySelector(".modal__box");
      if (box) box.scrollTop = 0;
    }

    document.querySelectorAll("[data-tab]").forEach(function (b) {
      b.addEventListener("click", function () { LQ.audio.tap(); show(b.dataset.tab); });
    });

    show(tab);
  }

  LQ.ui = LQ.ui || {};
  // 說明不會自己跳出來，一律由玩家自己去點：
  // 五扇門的「怎麼玩」、設定頁的「遊戲說明」、鑄鑰畫面右上角的「?」
  LQ.ui.help = { open: open };

})(window.LQ = window.LQ || {});
