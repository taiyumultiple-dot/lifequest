/* ==========================================================================
   鑄鑰畫面（全螢幕）—— 核心玩法
   把九塊思考碎片排成正確的順序，鑄出鑰匙。
   齒紋吻合 = 這塊放對位置；位置不對 = 這塊有用但順序錯了。
   ========================================================================== */
(function (LQ) {
  "use strict";

  var el = null;
  var g = null;              // 這一場的狀態
  var ticker = null;

  function esc(s) { return LQ.ui.modal.esc(s); }

  /* ---- 開始一場 ---------------------------------------------------- */

  function start(o) {
    var len = o.solution.length;
    g = {
      opt: o,
      len: len,
      picks: new Array(len).fill(null),   // 玩家排的順序（存 fragments 的索引）
      locked: {},                         // 被「查閱」鎖住的格子
      used: {},                           // 哪些碎片已經被放上去
      tries: [],
      peeks: 0,
      thinkMax: LQ.economy.startThink(),
      think: LQ.economy.startThink(),
      guard: LQ.economy.guardMax(),
      guardMax: LQ.economy.guardMax(),
      secondsMax: LQ.economy.seconds(o.seconds || 120),
      left: LQ.economy.seconds(o.seconds || 120),
      over: false
    };

    el.hidden = false;
    render();
    startTicker();
  }

  function startTicker() {
    stopTicker();
    ticker = setInterval(function () {
      if (g.over) return;
      g.left -= 1;
      if (g.left <= 0) {
        loseGuard("時間到了。你在原地停留太久。");
      }
      updateHud();
    }, 1000);
  }
  function stopTicker() { if (ticker) { clearInterval(ticker); ticker = null; } }

  /* ---- 畫面 -------------------------------------------------------- */

  function render() {
    var o = g.opt;
    var v = o.villain || {};
    var vc = v.char ? LQ.data.characters[v.char] : null;

    el.innerHTML =
      '<div class="forge__bg">' +
        (o.bg ? '<img src="' + LQ.data.scene(o.bg) + '" alt="">' : "") +
      "</div>" +
      '<div class="forge__inner">' +

        '<div class="forge__hud">' +
          '<button type="button" class="forge__quit" id="fg-quit">離開</button>' +
          '<button type="button" class="forge__help" id="fg-help" title="遊戲說明" aria-label="遊戲說明">?</button>' +
          '<div class="forge__hud-mid">' +
            '<div class="forge__meta">' +
              "<span>思考力 <b id=\"fg-think\">0</b></span>" +
              '<span id="fg-progress"></span>' +
            "</div>" +
            '<div class="bar bar--ice"><i id="fg-thinkbar" style="width:100%"></i></div>' +
          "</div>" +
          '<div class="hearts" id="fg-hearts"></div>' +
          '<div class="clock" id="fg-clock">0:00</div>' +
        "</div>" +

        (v.line ?
          '<div class="forge__villain">' +
            (vc && vc.face ? '<img src="' + vc.face + '" alt="">' :
              '<div class="good__ico" style="width:42px;height:42px;border-radius:50%;background:rgba(224,87,79,.16);border-color:rgba(224,87,79,.5);color:var(--ember)">✕</div>') +
            "<div><b>" + esc(v.name || "迷障") + "</b><p>" + esc(v.line) + "</p></div>" +
          "</div>" : "") +

        '<p style="font-size:13px;color:var(--ink-soft);margin:0 0 9px">' + esc(o.prompt || "") + "</p>" +

        '<div class="slots" id="fg-slots"></div>' +
        '<div class="tries" id="fg-tries"></div>' +
        '<div class="frags" id="fg-frags"></div>' +

        '<div class="forge__acts">' +
          '<button type="button" class="btn btn--ghost" id="fg-peek">查閱碎片<small>−' +
            LQ.economy.peekCost() + " 思考力</small></button>" +
          '<button type="button" class="btn btn--gold" id="fg-submit">鑄入鑰匙<small>−' +
            LQ.economy.COST_TRY + " 思考力</small></button>" +
        "</div>" +
      "</div>";

    document.getElementById("fg-quit").addEventListener("click", quit);
    // 看說明的時候把倒數停住，不然學生一邊讀規則一邊被扣時間
    document.getElementById("fg-help").addEventListener("click", function () {
      stopTicker();
      LQ.ui.help.open("forge", function () {
        if (g && !g.over) startTicker();
      });
    });
    document.getElementById("fg-peek").addEventListener("click", peek);
    document.getElementById("fg-submit").addEventListener("click", submit);

    drawSlots();
    drawFrags();
    drawTries();
    updateHud();
  }

  function drawSlots() {
    var box = document.getElementById("fg-slots");
    var html = "";
    for (var i = 0; i < g.len; i++) {
      var pick = g.picks[i];
      var cls = "slot" + (pick === null ? "" : (g.locked[i] ? " slot--locked" : " slot--on"));
      var label = pick === null ? (i + 1) : esc(shorten(g.opt.fragments[pick]));
      html += '<button type="button" class="' + cls + '" data-slot="' + i + '">' + label + "</button>";
    }
    box.innerHTML = html;
    box.querySelectorAll("[data-slot]").forEach(function (b) {
      b.addEventListener("click", function () { clearSlot(Number(b.dataset.slot)); });
    });
  }

  function drawFrags() {
    var box = document.getElementById("fg-frags");
    box.innerHTML = g.opt.fragments.map(function (text, k) {
      var used = g.used[k];
      return '<button type="button" class="frag' + (used ? " frag--used" : "") +
             '" data-frag="' + k + '"' + (used ? " disabled" : "") + ">" +
             '<span class="frag__n">' + (k + 1) + "</span>" +
             esc(text) + "</button>";
    }).join("");
    box.querySelectorAll("[data-frag]").forEach(function (b) {
      b.addEventListener("click", function () { place(Number(b.dataset.frag)); });
    });
  }

  function drawTries() {
    var box = document.getElementById("fg-tries");
    if (!g.tries.length) {
      // 還沒提交過就給一段引導，順便把這塊空間填起來
      box.innerHTML =
        '<div class="tries__hint">' +
          "<p>點下方的碎片，把它們排進上面的齒紋。<br>排滿之後按「鑄入鑰匙」。</p>" +
          "<p><b>齒紋吻合</b>＝這塊放對位置<br>" +
          "<b>錯位</b>＝這塊有用，但順序不對</p>" +
        "</div>";
      return;
    }
    box.innerHTML = g.tries.map(function (t, k) {
      return '<div class="try">' +
        '<span class="try__n">#' + (k + 1) + "</span>" +
        '<span class="try__seq">' + t.seq.map(function (n) { return n + 1; }).join(" · ") + "</span>" +
        '<span class="try__hit">齒紋 ' + t.hit + "</span>" +
        '<span class="try__near">錯位 ' + t.near + "</span>" +
      "</div>";
    }).reverse().join("");
  }

  function updateHud() {
    if (!g) return;
    var pct = Math.max(0, Math.min(100, g.think / g.thinkMax * 100));
    var tb = document.getElementById("fg-thinkbar");
    if (tb) tb.style.width = pct + "%";
    var tv = document.getElementById("fg-think");
    if (tv) tv.textContent = Math.max(0, Math.round(g.think));

    var hearts = "";
    for (var i = 0; i < g.guardMax; i++) hearts += "<i class=\"" + (i < g.guard ? "" : "off") + "\">◆</i>";
    var hb = document.getElementById("fg-hearts");
    if (hb) hb.innerHTML = hearts;

    var m = Math.floor(Math.max(0, g.left) / 60);
    var s = Math.max(0, g.left) % 60;
    var ck = document.getElementById("fg-clock");
    if (ck) {
      ck.textContent = m + ":" + String(s).padStart(2, "0");
      ck.className = "clock" + (g.left <= 15 ? " clock--warn" : "");
    }

    var pr = document.getElementById("fg-progress");
    if (pr) pr.textContent = "齒紋 " + g.len + " 格｜已試 " + g.tries.length + " 次";
  }

  function shorten(s) {
    var t = String(s).replace(/[「」]/g, "");
    return t.length > 12 ? t.slice(0, 11) + "…" : t;
  }

  /* ---- 操作 -------------------------------------------------------- */

  function place(fragIdx) {
    if (g.over || g.used[fragIdx]) return;
    for (var i = 0; i < g.len; i++) {
      if (g.picks[i] === null && !g.locked[i]) {
        g.picks[i] = fragIdx;
        g.used[fragIdx] = true;
        LQ.audio.place();
        drawSlots(); drawFrags();
        return;
      }
    }
    LQ.ui.modal.toast("鑰匙的齒紋已經排滿了", true);
  }

  function clearSlot(i) {
    if (g.over || g.locked[i] || g.picks[i] === null) return;
    delete g.used[g.picks[i]];
    g.picks[i] = null;
    LQ.audio.remove();
    drawSlots(); drawFrags();
  }

  function peek() {
    if (g.over) return;
    var cost = LQ.economy.peekCost();
    if (g.think < cost) { LQ.ui.modal.toast("思考力不足", true); return; }

    // 找第一個還沒被鎖住的格子
    var target = -1;
    for (var i = 0; i < g.len; i++) if (!g.locked[i]) { target = i; break; }
    if (target === -1) { LQ.ui.modal.toast("每一格都已經確定了", true); return; }

    var right = g.opt.solution[target];
    // 如果那塊碎片被放在別的格子，先把它拿回來
    for (var j = 0; j < g.len; j++) {
      if (g.picks[j] === right && j !== target && !g.locked[j]) g.picks[j] = null;
    }
    if (g.picks[target] !== null && g.picks[target] !== right) delete g.used[g.picks[target]];

    g.picks[target] = right;
    g.locked[target] = true;
    g.used[right] = true;
    g.think -= cost;
    g.peeks += 1;

    LQ.audio.peek();
    LQ.ui.modal.toast("第 " + (target + 1) + " 格確定了");
    drawSlots(); drawFrags(); updateHud();
    if (g.think <= 0) loseGuard("你想得太用力，一時之間什麼都看不清楚。");
  }

  function submit() {
    if (g.over) return;
    for (var i = 0; i < g.len; i++) {
      if (g.picks[i] === null) { LQ.ui.modal.toast("還有格子沒有排上", true); return; }
    }
    if (g.think < LQ.economy.COST_TRY) { LQ.ui.modal.toast("思考力不足", true); return; }

    g.think -= LQ.economy.COST_TRY;
    var res = LQ.keyforge.judge(g.opt.solution, g.picks);
    g.tries.push({ seq: g.picks.slice(), hit: res.hit, near: res.near });

    // 精準推理會回復思考力
    g.think = Math.min(g.thinkMax, g.think + res.hit * LQ.economy.REGAIN_HIT);

    LQ.audio.judge(res.hit, g.len);
    drawTries(); updateHud();

    if (res.hit === g.len) { win(); return; }
    if (g.think <= 0) loseGuard("推得太用力，思緒斷了線。");
  }

  function loseGuard(msg) {
    g.guard -= 1;
    g.think = g.thinkMax;
    g.left = g.secondsMax;
    LQ.audio.hurt();
    updateHud();
    if (g.guard <= 0) { lose(); return; }
    LQ.ui.modal.toast(msg + "（心之防線 −1）", true);
  }

  /* ---- 結束 -------------------------------------------------------- */

  function stats() {
    return { tries: g.tries.length, peeks: g.peeks, len: g.len,
             timeUsed: g.secondsMax - g.left, guardLeft: g.guard };
  }

  function win() {
    g.over = true;
    stopTicker();
    var s = stats();
    var cb = g.opt.onWin;
    LQ.audio.open();
    // 先放開門動畫，再交回關卡流程
    gateOpen(g.opt.doorImg || "u01-lightdoor", g.opt.doorText || "門，開了", function () {
      close();
      if (cb) cb(s);
    });
  }

  function lose() {
    g.over = true;
    stopTicker();
    var s = stats();
    var cb = g.opt.onLose;
    LQ.audio.fail();
    LQ.ui.modal.modal({
      title: "這一次沒有走過去",
      body: "<p>心之防線用完了。<br>不過你已經知道哪幾塊碎片是對的——再來一次會快很多。</p>",
      acts: [{ label: "回到五扇門", kind: "btn--gold", onClick: function () {
        close(); if (cb) cb(s);
      } }]
    });
  }

  function quit() {
    LQ.ui.modal.confirm("要離開嗎？", "這一次的進度不會保留，花掉的心力也不會退回。", function () {
      g.over = true;
      stopTicker();
      var cb = g.opt.onQuit;
      close();
      if (cb) cb();
    }, "離開");
  }

  function close() {
    stopTicker();
    el.hidden = true;
    el.innerHTML = "";
    g = null;
  }

  /** 開門動畫 */
  function gateOpen(img, text, done) {
    var d = document.createElement("div");
    d.className = "gateopen";
    d.innerHTML = '<img src="' + LQ.data.scene(img) + '" alt="">' +
                  '<div class="gateopen__txt">' + esc(text) + "</div>";
    document.body.appendChild(d);
    setTimeout(function () {
      d.style.transition = "opacity 420ms";
      d.style.opacity = "0";
      setTimeout(function () { d.remove(); if (done) done(); }, 440);
    }, 2200);
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.forge = {
    init: function () { el = document.getElementById("forge"); },
    start: start,
    gateOpen: gateOpen
  };

})(window.LQ = window.LQ || {});
