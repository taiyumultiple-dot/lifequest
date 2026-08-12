/* ==========================================================================
   雲端存檔（Supabase + Google 登入）
   ---------------------------------------------------------------------------
   設計原則是「本機優先」：
     ・沒登入 → 遊戲照常運作，進度存在這台裝置（localStorage）
     ・登入後 → 進度會同步到雲端，換裝置、換瀏覽器都接得回來
   所以就算雲端掛了、沒網路，遊戲都不會壞。

   登入用彈出視窗而不是整頁跳轉，因為這個遊戲常常被別的網站用 iframe 嵌入，
   而 Google 不允許在 iframe 裡跑 OAuth。
   ========================================================================== */
(function (LQ) {
  "use strict";

  var sb = null;              // Supabase 用戶端
  var user = null;            // 目前登入的人
  var loading = null;         // 載入函式庫的 Promise
  var pushTimer = null;
  var listeners = [];
  var lastError = "";

  function cfg() { return LQ.config || {}; }

  /** 這個環境能不能用雲端？（要有設定，而且不是用 file:// 直接開）*/
  function available() {
    return !!(cfg().supabaseUrl && cfg().supabaseKey && location.protocol !== "file:");
  }

  function emit() {
    listeners.forEach(function (fn) {
      try { fn(user); } catch (e) { console.error(e); }
    });
  }

  /** 動態載入 Supabase 函式庫（只有真的要用到才載）*/
  function loadLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = cfg().clientLib;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("載入 Supabase 函式庫失敗（可能沒有網路）")); };
      document.head.appendChild(s);
    });
    return loading;
  }

  /** 建立用戶端並取回目前的登入狀態 */
  function init() {
    if (!available()) return Promise.resolve(null);
    return loadLib().then(function () {
      if (!sb) {
        sb = window.supabase.createClient(cfg().supabaseUrl, cfg().supabaseKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
        });
        sb.auth.onAuthStateChange(function (_event, session) {
          user = session ? session.user : null;
          emit();
        });
      }
      return sb.auth.getSession().then(function (r) {
        user = (r.data && r.data.session) ? r.data.session.user : null;
        emit();
        return user;
      });
    }).catch(function (e) {
      lastError = e.message;
      console.warn("[雲端] 初始化失敗，改用本機存檔：", e);
      return null;
    });
  }

  var providers = null;   // /auth/v1/settings 的結果，一個分頁只查一次

  /**
   * 查這個 Supabase 專案開了哪些登入方式。
   *
   * 為什麼需要這個：供應商沒開的時候，signInWithOAuth 只是在瀏覽器本機
   * 組出一段網址，不會回報錯誤，所以彈出視窗會直接停在一段英文 JSON
   * （Unsupported provider），學生看不懂、外層畫面也只會一直轉。
   * 先問過再開視窗，就能換成看得懂的說明。
   *
   * @returns {Promise<boolean|null>} null 代表查不到（例如沒網路），照樣讓他試
   */
  function providerEnabled(name) {
    if (!available()) return Promise.resolve(null);
    if (!providers) {
      providers = fetch(cfg().supabaseUrl + "/auth/v1/settings", {
        headers: { apikey: cfg().supabaseKey }
      }).then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (j) {
        return (j && j.external) || null;
      }).catch(function () {
        return null;
      });
    }
    return providers.then(function (ext) {
      return ext ? !!ext[name] : null;
    });
  }

  /**
   * 用 Google 登入。
   * 開一個彈出視窗跑 OAuth；完成後 auth.html 會把 session 寫進 localStorage 並自己關掉，
   * 這裡用輪詢等它出現（比 storage 事件可靠）。
   */
  function signIn() {
    if (!available()) {
      return Promise.reject(new Error("這個開啟方式不支援登入（請用網址開啟，而不是直接雙擊檔案）"));
    }
    return init().then(function () {
      return providerEnabled("google");
    }).then(function (ok) {
      // 沒開就別開視窗了，直接丟出錯誤讓登入畫面顯示看得懂的說明
      if (ok === false) throw new Error("Unsupported provider: provider is not enabled");

      var back = location.href.replace(/[^/]*$/, "") + "auth.html";
      return sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: back, skipBrowserRedirect: true }
      });
    }).then(function (res) {
      if (res.error) throw res.error;
      if (!res.data || !res.data.url) throw new Error("拿不到登入網址");

      var w = window.open(res.data.url, "lifequest-login",
        "width=480,height=680,menubar=no,toolbar=no");
      if (!w) throw new Error("瀏覽器擋掉了彈出視窗，請允許後再試一次");

      // 等彈出視窗完成登入。
      // auth.html 會用 postMessage 回報結果（成功或失敗），
      // 同時也輪詢 getSession() 當作備援——有些瀏覽器會擋掉跨視窗訊息。
      return new Promise(function (resolve, reject) {
        var done = false;

        function finish(ok, err) {
          if (done) return;
          done = true;
          clearInterval(timer);
          window.removeEventListener("message", onMessage);
          try { w.close(); } catch (e) { /* 已經關了 */ }
          if (ok) { emit(); resolve(user); } else { reject(err); }
        }

        function onMessage(ev) {
          if (ev.origin !== location.origin) return;                  // 只收自己人的訊息
          var d = ev.data;
          if (!d || d.source !== "lifequest-auth") return;
          if (d.ok) {
            sb.auth.getSession().then(function (r) {
              var s = r.data && r.data.session;
              if (s) { user = s.user; finish(true); }
            });
          } else {
            finish(false, new Error(d.message || "登入沒有完成"));
          }
        }
        window.addEventListener("message", onMessage);

        var tries = 0;
        var timer = setInterval(function () {
          tries += 1;
          sb.auth.getSession().then(function (r) {
            var s = r.data && r.data.session;
            if (s) { user = s.user; finish(true); return; }
            if (w.closed) finish(false, new Error("登入取消"));
            if (tries > 180) finish(false, new Error("登入逾時"));
          });
        }, 1000);
      });
    });
  }

  function signOut() {
    if (!sb) return Promise.resolve();
    return sb.auth.signOut().then(function () {
      user = null;
      emit();
    });
  }

  /* ---- 存檔同步 ------------------------------------------------------ */

  /** 把雲端那一份抓下來（沒有就回 null）*/
  function pull() {
    if (!sb || !user) return Promise.resolve(null);
    return sb.from(cfg().table)
      .select("data, save_updated_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(function (r) {
        if (r.error) { lastError = r.error.message; return null; }
        return r.data || null;
      });
  }

  /** 把本機這一份推上去 */
  function push() {
    if (!sb || !user) return Promise.resolve(false);
    var d = LQ.state.d;
    return sb.from(cfg().table).upsert({
      user_id: user.id,
      display_name: displayName(),
      data: d,
      save_updated_at: d.updatedAt || Date.now()
    }, { onConflict: "user_id" }).then(function (r) {
      if (r.error) { lastError = r.error.message; console.warn("[雲端] 上傳失敗：", r.error); return false; }
      return true;
    });
  }

  /** 存檔變動後延遲上傳，避免每按一下就打一次資料庫 */
  function schedulePush() {
    if (!sb || !user) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { push(); }, 2500);
  }

  /**
   * 登入後決定要用哪一份。
   * 規則：拿「比較新」的那一份；如果兩邊都有進度而且不一樣，交給呼叫端問玩家。
   * @returns {Promise<{action:string, cloud:object|null}>}
   *   action: "使用雲端" | "使用本機" | "需要選擇" | "沒有雲端存檔"
   */
  function reconcile() {
    return pull().then(function (row) {
      if (!row) return { action: "沒有雲端存檔", cloud: null };

      var local = LQ.state.d;
      var localTime = local.updatedAt || 0;
      var cloudTime = row.save_updated_at || 0;
      var localHasProgress = hasProgress(local);
      var cloudHasProgress = hasProgress(row.data);

      if (!localHasProgress && cloudHasProgress) return { action: "使用雲端", cloud: row };
      if (localHasProgress && !cloudHasProgress) return { action: "使用本機", cloud: row };
      if (!localHasProgress && !cloudHasProgress) return { action: "使用雲端", cloud: row };

      // 兩邊都有進度：差不多的時間就直接取新的，差很多就讓玩家決定
      if (Math.abs(localTime - cloudTime) < 5000) {
        return { action: cloudTime >= localTime ? "使用雲端" : "使用本機", cloud: row };
      }
      return { action: "需要選擇", cloud: row };
    });
  }

  /** 這份存檔有沒有玩過的痕跡 */
  function hasProgress(d) {
    if (!d) return false;
    var units = d.units ? Object.keys(d.units).length : 0;
    return units > 0 || (d.frag || 0) > 0 || (d.journal && d.journal.length > 0);
  }

  function displayName() {
    if (!user) return null;
    var m = user.user_metadata || {};
    return m.full_name || m.name || user.email || null;
  }

  function avatar() {
    if (!user) return null;
    var m = user.user_metadata || {};
    return m.avatar_url || m.picture || null;
  }

  LQ.cloud = {
    available: available,
    init: init,
    providerEnabled: providerEnabled,
    signIn: signIn,
    signOut: signOut,
    user: function () { return user; },
    displayName: displayName,
    avatar: avatar,
    isSignedIn: function () { return !!user; },
    pull: pull,
    push: push,
    schedulePush: schedulePush,
    reconcile: reconcile,
    hasProgress: hasProgress,
    onChange: function (fn) { listeners.push(fn); },
    lastError: function () { return lastError; }
  };

})(window.LQ = window.LQ || {});
