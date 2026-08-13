/* ==========================================================================
   設定：音效、內容包、存檔管理、求助資源
   ========================================================================== */
(function (LQ) {
  "use strict";

  function esc(s) { return LQ.ui.modal.esc(s); }

  function download(name, text, mime) {
    var blob = new Blob([text], { type: (mime || "application/json") + ";charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
  }

  /** 讓使用者挑一個檔案，回傳文字內容 */
  function pickFile(accept, cb) {
    var input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.addEventListener("change", function () {
      var f = input.files && input.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { cb(String(r.result)); };
      r.readAsText(f, "utf-8");
    });
    input.click();
  }

  /** 載入內容包：用一份 JSON 覆蓋六個關卡的內容 */
  function loadPack() {
    LQ.ui.modal.modal({
      title: "載入內容包",
      body:
        "<p>可以用一份 JSON 覆蓋關卡內容（格式同 <code>js/data/units.js</code> 裡的 units 陣列）。<br>" +
        "載入的內容存在這台裝置，重新整理後仍然有效；按「還原成內建內容」就會恢復。</p>" +
        '<textarea id="pk-text" rows="6" placeholder="也可以直接把 JSON 貼在這裡"></textarea>',
      acts: [
        { label: "選檔案", kind: "btn--ghost", close: false, onClick: function () {
            pickFile(".json,application/json", function (text) {
              document.getElementById("pk-text").value = text;
            });
          } },
        { label: "套用", kind: "btn--gold", onClick: function () {
            var text = document.getElementById("pk-text").value.trim();
            applyPack(text);
          } }
      ]
    });
  }

  function applyPack(text) {
    if (!text) { LQ.ui.modal.toast("沒有內容", true); return; }
    try {
      var obj = JSON.parse(text);
      var arr = Array.isArray(obj) ? obj : obj.units;
      if (!Array.isArray(arr) || !arr.length) throw new Error("找不到 units 陣列");
      // 粗略檢查必要欄位，避免載入後整個遊戲壞掉
      arr.forEach(function (u, i) {
        if (!u.id || !u.name || !u.forge || !Array.isArray(u.forge.fragments) ||
            !Array.isArray(u.forge.solution)) {
          throw new Error("第 " + (i + 1) + " 關缺少必要欄位（id / name / forge.fragments / forge.solution）");
        }
      });
      localStorage.setItem("lifequest_pack_v1", JSON.stringify(arr));
      LQ.ui.modal.toast("已套用，重新整理後生效");
      setTimeout(function () { location.reload(); }, 900);
    } catch (e) {
      LQ.ui.modal.modal({
        title: "內容包格式有問題",
        body: "<p>" + esc(e.message) + "</p>",
        acts: [{ label: "知道了", kind: "btn--ghost" }]
      });
    }
  }

  function helpModal() {
    LQ.ui.modal.modal({
      title: "需要幫忙的時候",
      body:
        "<p>如果你最近很不好受，或想起了一些難過的事——那不是你的錯，也不用一個人撐。</p>" +
        '<div class="helpline" style="margin-top:0">' +
          "<b>可以打給誰</b>" +
          "<p>安心專線 <b>1925</b>　24 小時、免費<br>" +
          "生命線 <b>1995</b><br>" +
          "張老師 <b>1980</b></p>" +
        "</div>" +
        "<p style=\"margin-top:12px\">也可以直接去學校輔導室，或找一個你信任的大人。" +
        "說「我最近不太好」就可以了，不用先想好怎麼講。</p>",
      acts: [{ label: "知道了", kind: "btn--ghost" }]
    });
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.settings = {
    render: function () {
      var d = LQ.state.d;
      var usingPack = !!localStorage.getItem("lifequest_pack_v1");

      LQ.render(
        '<div class="sect"><h2>設定</h2></div>' +

        '<div class="rows">' +
          '<button type="button" class="row" id="st-sound"><i>' + (d.sound ? "♪" : "✕") + "</i>" +
            "<div><b>音效</b><p>按鍵與判定的提示音。</p></div>" +
            '<span class="row__val">' + (d.sound ? "已開啟" : "已關閉") + "</span></button>" +

          // 只有在 config.js 設定了音樂來源時才顯示這兩列
          (LQ.bgm.available()
            ? '<button type="button" class="row" id="st-music"><i>' + (d.music ? "♫" : "✕") + "</i>" +
                "<div><b>背景音樂</b><p>" +
                (LQ.bgm.modeName() === "youtube"
                  ? "由 YouTube 播放器播放，需要網路，可能會出現廣告。"
                  : "播放 assets/audio 裡的音檔，離線也能聽。") +
                "</p></div>" +
                '<span class="row__val">' + (d.music ? "已開啟" : "已關閉") + "</span></button>" +
              (d.music
                ? '<div class="row"><i>◐</i><div><b>音樂音量</b></div>' +
                  '<div class="vol" id="st-vol">' +
                    [["小", 0.2], ["中", 0.4], ["大", 0.7]].map(function (v) {
                      var on = Math.abs((d.musicVol == null ? 0.4 : d.musicVol) - v[1]) < 0.08;
                      return '<button type="button" data-vol="' + v[1] + '" aria-current="' +
                             (on ? "true" : "false") + '">' + v[0] + "</button>";
                    }).join("") +
                  "</div></div>"
                : "")
            : "") +
        "</div>" +

        '<div class="sect"><h2>說明</h2></div>' +
        '<div class="rows">' +
          '<button type="button" class="row" id="st-guide"><i>?</i>' +
            "<div><b>遊戲說明</b><p>故事背景、鑄鑰玩法圖解、數值與系統、給老師的課堂建議。</p></div>" +
            '<span class="row__val">查看</span></button>' +

          '<button type="button" class="row" id="st-help"><i>✚</i>' +
            "<div><b>需要幫忙的時候</b><p>安心專線與求助管道。</p></div>" +
            '<span class="row__val">查看</span></button>' +
        "</div>" +

        '<div class="sect"><h2>內容</h2></div>' +
        '<div class="rows">' +
          '<button type="button" class="row" id="st-pack"><i>▤</i>' +
            "<div><b>載入內容包</b><p>用一份 JSON 換掉關卡內容，程式不用動。</p></div>" +
            '<span class="row__val">' + (usingPack ? "使用中" : "內建") + "</span></button>" +
          (usingPack ?
            '<button type="button" class="row" id="st-unpack"><i>↺</i>' +
              "<div><b>還原成內建內容</b><p>回到程式裡附的六個關卡。</p></div>" +
              '<span class="row__val">還原</span></button>' : "") +
        "</div>" +

        '<div class="sect"><h2>帳號</h2></div>' +
        '<div class="rows">' +
          (LQ.cloud.isSignedIn()
            ? '<div class="row"><i>✓</i>' +
                "<div><b>" + esc(LQ.cloud.displayName() || "已登入") + "</b>" +
                "<p>進度會自動同步到雲端，換裝置也接得回來。</p></div></div>" +
              '<button type="button" class="row" id="st-sync"><i>↻</i>' +
                "<div><b>立刻同步</b><p>把這台裝置的進度馬上上傳一次。</p></div>" +
                '<span class="row__val">上傳</span></button>' +
              '<button type="button" class="row" id="st-signout"><i>→</i>' +
                "<div><b>登出</b><p>登出後這台裝置的進度會保留，但不再同步。</p></div>" +
                '<span class="row__val">登出</span></button>'
            : '<button type="button" class="row" id="st-signin"><i>☁</i>' +
                "<div><b>用 Google 帳號登入</b><p>" +
                (LQ.cloud.available()
                  ? "登入後進度會跟著帳號走，換手機、換電腦都接得回來。"
                  : "要用網址開啟（而不是直接雙擊檔案）才能登入。") +
                "</p></div>" +
                '<span class="row__val">' + (LQ.cloud.available() ? "登入" : "無法使用") + "</span></button>") +
        "</div>" +

        '<div class="sect"><h2>存檔</h2><small>' +
          (LQ.cloud.isSignedIn() ? "本機＋雲端" : "只存在這台裝置") + "</small></div>" +
        '<div class="rows">' +
          '<button type="button" class="row" id="st-export"><i>↓</i>' +
            "<div><b>匯出存檔</b><p>下載一份備份，換裝置時可以帶著走。</p></div>" +
            '<span class="row__val">下載</span></button>' +
          '<button type="button" class="row" id="st-import"><i>↑</i>' +
            "<div><b>匯入存檔</b><p>從備份檔還原進度。目前的進度會被覆蓋。</p></div>" +
            '<span class="row__val">選檔案</span></button>' +
          '<button type="button" class="row" id="st-wipe"><i style="color:var(--ember)">⚠</i>' +
            "<div><b>刪除所有資料</b><p>進度、碎片、圖鑑與成長紀錄都會消失，無法復原。</p></div>" +
            '<span class="row__val" style="color:var(--ember)">刪除</span></button>' +
        "</div>" +

        '<div class="sect"><h2>關於</h2></div>' +
        '<div class="card"><p class="card__note">' +
          "《五門・心靈迷宮》是一款生命教育互動推理遊戲。<br>" +
          "故事與角色改編自泰宇生命教育教材的章首動畫腳本。<br><br>" +
          "遊戲全程在你的瀏覽器裡執行，不需要登入，也不會把任何資料送出去。" +
        "</p></div>"
      );

      document.getElementById("st-sound").addEventListener("click", function () {
        d.sound = !d.sound;
        LQ.state.save();
        if (d.sound) LQ.audio.good();
        LQ.ui.settings.render();
      });

      var mBtn = document.getElementById("st-music");
      if (mBtn) {
        mBtn.addEventListener("click", function () {
          d.music = !d.music;
          LQ.state.save();
          LQ.bgm.refresh();
          LQ.ui.settings.render();
        });
      }
      var vol = document.getElementById("st-vol");
      if (vol) {
        vol.querySelectorAll("[data-vol]").forEach(function (b) {
          b.addEventListener("click", function () {
            d.musicVol = Number(b.dataset.vol);
            LQ.state.save();
            LQ.bgm.refresh();
            LQ.ui.settings.render();
          });
        });
      }

      document.getElementById("st-guide").addEventListener("click", function () {
        LQ.ui.help.open("story");
      });
      document.getElementById("st-help").addEventListener("click", helpModal);
      document.getElementById("st-pack").addEventListener("click", loadPack);

      var un = document.getElementById("st-unpack");
      if (un) un.addEventListener("click", function () {
        LQ.ui.modal.confirm("還原成內建內容？", "會回到程式裡附的六個關卡。你的進度不會被刪掉。", function () {
          localStorage.removeItem("lifequest_pack_v1");
          location.reload();
        }, "還原");
      });

      var inBtn = document.getElementById("st-signin");
      if (inBtn) inBtn.addEventListener("click", function () {
        if (!LQ.cloud.available()) {
          LQ.ui.modal.toast("這個開啟方式無法登入", true); return;
        }
        LQ.ui.login.show(function () { LQ.ui.settings.render(); LQ.refreshTopbar(); });
      });

      var syncBtn = document.getElementById("st-sync");
      if (syncBtn) syncBtn.addEventListener("click", function () {
        LQ.cloud.push().then(function (ok) {
          LQ.ui.modal.toast(ok ? "已上傳" : "上傳失敗：" + LQ.cloud.lastError(), !ok);
        });
      });

      var outBtn = document.getElementById("st-signout");
      if (outBtn) outBtn.addEventListener("click", function () {
        LQ.ui.modal.confirm("要登出嗎？",
          "這台裝置的進度會保留，但不會再同步到雲端。", function () {
            LQ.cloud.signOut().then(function () {
              LQ.ui.login.forgetChoice();
              LQ.ui.modal.toast("已登出");
              LQ.ui.settings.render();
              LQ.refreshTopbar();
            });
          }, "登出");
      });

      document.getElementById("st-export").addEventListener("click", function () {
        download("五門心靈迷宮-存檔.json", LQ.state.exportJSON());
        LQ.ui.modal.toast("已下載存檔");
      });

      document.getElementById("st-import").addEventListener("click", function () {
        pickFile(".json,application/json", function (text) {
          LQ.ui.modal.confirm("要匯入嗎？", "目前這台裝置上的進度會被覆蓋。", function () {
            if (LQ.state.importJSON(text)) {
              LQ.ui.modal.toast("匯入成功");
              setTimeout(function () { location.reload(); }, 700);
            } else {
              LQ.ui.modal.toast("檔案格式不對", true);
            }
          }, "覆蓋並匯入");
        });
      });

      document.getElementById("st-wipe").addEventListener("click", function () {
        LQ.ui.modal.confirm("刪除所有資料？",
          "進度、記憶碎片、迷障圖鑑與成長紀錄都會消失，而且沒辦法復原。",
          function () {
            LQ.state.wipe();
            location.reload();
          }, "我確定，刪除");
      });
    }
  };

})(window.LQ = window.LQ || {});
