/* ==========================================================================
   登入畫面
   遊戲一打開先看到這裡。可以用 Google 帳號登入（進度跟著帳號走），
   也可以選擇不登入直接玩（進度存在這台裝置）。
   ========================================================================== */
(function (LQ) {
  "use strict";

  var CHOICE_KEY = "lifequest_entry_v1";   // 記住玩家上次的選擇
  var el = null;
  var onDone = null;

  function esc(s) { return LQ.ui.modal.esc(s); }

  /** 玩家之前選過「不登入」嗎 */
  function choseGuest() {
    try { return localStorage.getItem(CHOICE_KEY) === "guest"; } catch (e) { return false; }
  }
  function rememberGuest() {
    try { localStorage.setItem(CHOICE_KEY, "guest"); } catch (e) { /* 忽略 */ }
  }
  function forgetChoice() {
    try { localStorage.removeItem(CHOICE_KEY); } catch (e) { /* 忽略 */ }
  }

  /* ---- 畫面 --------------------------------------------------------- */

  function render(state) {
    var canCloud = LQ.cloud.available();

    el.innerHTML =
      '<div class="login__bg">' +
        '<img src="' + LQ.data.scene("gate-hall") + '" alt="">' +
      "</div>" +
      '<div class="login__inner">' +
        '<div class="login__mark">LIFE EDUCATION QUEST</div>' +
        '<h1 class="login__title">五門・心靈迷宮</h1>' +
        '<p class="login__sub">穿過這五扇門，你才回得了家。</p>' +

        (state === "working"
          ? '<div class="login__working">' +
              '<div class="bar bar--gold"><i style="width:45%"></i></div>' +
              "<p>正在等待 Google 登入……<br><small>如果沒看到視窗，請確認瀏覽器沒有擋掉彈出視窗。</small></p>" +
            "</div>"
          : '<div class="login__acts">' +
              (canCloud
                ? '<button type="button" class="btn btn--gold btn--block" id="lg-google">' +
                    "使用 Google 帳號登入</button>"
                : "") +
              '<button type="button" class="btn btn--ghost btn--block" id="lg-guest">' +
                (canCloud ? "先不登入，直接開始" : "開始遊戲") + "</button>" +
            "</div>") +

        '<p class="login__note">' +
          (canCloud
            ? "登入之後，進度會跟著你的帳號走——換手機、換電腦都接得回來。<br>" +
              "不登入也可以玩，只是進度只會留在這台裝置上。"
            : "進度會存在這台裝置的瀏覽器裡。<br>用網址開啟（而不是直接雙擊檔案）才能使用登入功能。") +
        "</p>" +

        '<p class="login__privacy">我們只會取得你的名稱與信箱，用來認出是誰的存檔。<br>' +
          "遊戲內容與反思紀錄不會給其他人看。</p>" +
      "</div>";

    var g = document.getElementById("lg-google");
    if (g) g.addEventListener("click", doGoogle);

    var q = document.getElementById("lg-guest");
    if (q) q.addEventListener("click", function () {
      LQ.audio.tap();
      rememberGuest();
      finish();
    });
  }

  function doGoogle() {
    LQ.audio.tap();
    render("working");

    LQ.cloud.signIn().then(function () {
      return afterSignIn();
    }).catch(function (e) {
      render("idle");
      var msg = String(e && e.message || e);
      // Supabase 還沒開 Google 供應商時會回這個
      if (/provider is not enabled|Unsupported provider/i.test(msg)) {
        LQ.ui.modal.modal({
          title: "還沒開啟 Google 登入",
          body: "<p>資料庫那邊還沒設定 Google 登入。<br>" +
                "設定完成之前，可以先選「先不登入，直接開始」。</p>" +
                '<p style="font-size:12px;color:var(--ink-faint)">技術訊息：' + esc(msg) + "</p>",
          acts: [{ label: "知道了", kind: "btn--ghost" }]
        });
      } else if (msg !== "登入取消") {
        LQ.ui.modal.toast(msg, true);
      }
    });
  }

  /** 登入成功之後，決定要用雲端還是本機那一份存檔 */
  function afterSignIn() {
    return LQ.cloud.reconcile().then(function (r) {
      if (r.action === "使用雲端" && r.cloud) {
        LQ.state.adopt(r.cloud.data);
        LQ.ui.modal.toast("已讀取雲端存檔");
        finish();
        return;
      }
      if (r.action === "需要選擇") {
        askWhich(r.cloud);
        return;
      }
      // 本機比較新，或雲端還沒有東西 → 把本機推上去
      LQ.cloud.push();
      LQ.ui.modal.toast("已連結帳號，進度會自動同步");
      finish();
    }).catch(function (e) {
      console.warn("[雲端] 同步失敗：", e);
      LQ.ui.modal.toast("登入成功，但同步失敗，先用本機存檔", true);
      finish();
    });
  }

  /** 兩邊都有進度而且差很多 → 讓玩家自己選，不要偷偷蓋掉 */
  function askWhich(cloud) {
    function summary(d) {
      var units = d && d.units ? Object.keys(d.units).length : 0;
      var frag = (d && d.frag) || 0;
      var jn = (d && d.journal) ? d.journal.length : 0;
      return units + " 關已通過｜" + frag + " 記憶碎片｜" + jn + " 則反思";
    }
    var when = cloud.save_updated_at
      ? new Date(cloud.save_updated_at).toLocaleString("zh-TW")
      : "時間不明";

    LQ.ui.modal.modal({
      title: "要用哪一份進度？",
      body:
        "<p>這台裝置和雲端各有一份進度，內容不一樣。<br>選擇之後，另一份會被覆蓋。</p>" +
        '<div class="card" style="margin:12px 0">' +
          '<div class="card__eyebrow">雲端（' + esc(when) + "）</div>" +
          '<p class="card__note">' + esc(summary(cloud.data)) + "</p>" +
        "</div>" +
        '<div class="card">' +
          '<div class="card__eyebrow">這台裝置</div>' +
          '<p class="card__note">' + esc(summary(LQ.state.d)) + "</p>" +
        "</div>",
      acts: [
        { label: "用這台裝置的", kind: "btn--ghost", onClick: function () {
            LQ.cloud.push();
            LQ.ui.modal.toast("已用這台裝置的進度覆蓋雲端");
            finish();
          } },
        { label: "用雲端的", kind: "btn--gold", onClick: function () {
            LQ.state.adopt(cloud.data);
            LQ.ui.modal.toast("已讀取雲端存檔");
            finish();
          } }
      ]
    });
  }

  function finish() {
    el.hidden = true;
    el.innerHTML = "";
    if (onDone) { var f = onDone; onDone = null; f(); }
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.login = {

    /**
     * 開場時呼叫。
     * 已登入或之前選過「不登入」就直接跳過，不會每次都擋在前面。
     */
    boot: function (done) {
      el = document.getElementById("login");
      onDone = done;

      // 沒有雲端可用（例如用 file:// 開）→ 記住選擇後就別再問
      if (!LQ.cloud.available()) {
        if (choseGuest()) { finish(); return; }
        el.hidden = false;
        render("idle");
        return;
      }

      LQ.cloud.init().then(function (u) {
        if (u) {
          // 已經是登入狀態 → 直接把雲端進度接回來
          el.hidden = false;
          render("working");
          afterSignIn();
          return;
        }
        if (choseGuest()) { finish(); return; }
        el.hidden = false;
        render("idle");
      });
    },

    /** 設定頁的「登出」用 */
    forgetChoice: forgetChoice,

    /** 設定頁的「登入」用：重新叫出登入畫面 */
    show: function (done) {
      el = document.getElementById("login");
      onDone = done;
      el.hidden = false;
      render("idle");
    }
  };

})(window.LQ = window.LQ || {});
