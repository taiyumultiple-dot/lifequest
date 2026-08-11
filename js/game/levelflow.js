/* ==========================================================================
   關卡流程
   章前劇情 → 迷障降臨 → 鑄鑰 → 開門與真相 → 領悟與反思
   ========================================================================== */
(function (LQ) {
  "use strict";

  function esc(s) { return LQ.ui.modal.esc(s); }
  function nl2br(s) { return LQ.ui.modal.nl2br(s); }

  /** 這一關解鎖了嗎 */
  function unlocked(u) {
    return !u.needs || LQ.state.isCleared(u.needs);
  }

  /* ---- 進入一關 ---------------------------------------------------- */

  function enterUnit(id) {
    var u = LQ.data.unitById(id);
    if (!u) return;

    if (!unlocked(u)) {
      var prev = LQ.data.unitById(u.needs);
      LQ.ui.modal.toast("要先走過「" + (prev ? prev.name : "前一扇門") + "」", true);
      return;
    }
    if (!LQ.economy.canAfford(u.cost)) {
      LQ.ui.modal.modal({
        title: "心力不足",
        body: "<p>開這扇門需要 " + u.cost + " 點心力，你現在只有 " +
              LQ.state.d.stamina + " 點。<br>去補給站買一杯熱可可，或等一下再來。</p>",
        acts: [
          { label: "知道了", kind: "btn--ghost" },
          { label: "去補給站", kind: "btn--gold", onClick: function () { LQ.go("shop"); } }
        ]
      });
      return;
    }

    var seen = !!LQ.state.d.seenIntro[u.id];
    if (seen) {
      LQ.ui.modal.modal({
        title: u.name,
        body: "<p>這一段劇情你看過了。要重看一次，還是直接進去鑄鑰？</p>",
        acts: [
          { label: "重看劇情", kind: "btn--ghost", onClick: function () { begin(u, true); } },
          { label: "直接鑄鑰", kind: "btn--gold", onClick: function () { begin(u, false); } }
        ]
      });
    } else {
      begin(u, true);
    }
  }

  function begin(u, withIntro) {
    if (!LQ.economy.spendStamina(u.cost)) return;
    LQ.refreshTopbar();

    if (withIntro && u.intro && u.intro.length) {
      LQ.state.d.seenIntro[u.id] = true;
      LQ.state.save();
      LQ.ui.story.play({
        chapter: u.no + "｜" + u.name,
        beats: u.intro,
        onDone: function () { toForge(u); }
      });
    } else {
      toForge(u);
    }
  }

  function toForge(u) {
    LQ.ui.forge.start({
      bg: u.forgeBg,
      prompt: u.forge.prompt,
      fragments: u.forge.fragments,
      solution: u.forge.solution,
      seconds: u.forge.seconds,
      villain: u.villain,
      doorImg: "u01-lightdoor",
      doorText: "門，開了",
      onWin: function (s) { onWin(u, s); },
      onLose: function () { LQ.go("hub"); },
      onQuit: function () { LQ.go("hub"); }
    });
  }

  /* ---- 通關 -------------------------------------------------------- */

  function onWin(u, s) {
    var rank = LQ.economy.rank(s.tries, s.len, s.peeks);
    var firstTime = !LQ.state.isCleared(u.id);
    var gain = LQ.economy.fragGain(firstTime ? u.reward : Math.round(u.reward * 0.25));

    LQ.state.clearUnit(u.id, rank, s.tries);
    LQ.economy.gainFrag(gain);

    var captured = u.illusionId && !LQ.illusions.has(u.illusionId)
      ? (LQ.illusions.capture(u.illusionId) ? LQ.data.illusionById(u.illusionId) : null)
      : null;

    // 先播真相，再進結算畫面
    var beats = [];
    if (u.truth) beats.push({ img: u.truth.img, who: "narrator", text: u.truth.text });

    LQ.ui.story.play({
      chapter: "真相",
      beats: beats,
      canSkip: false,
      onDone: function () { showResult(u, rank, gain, captured, s); }
    });
  }

  /* ---- 結算畫面 ---------------------------------------------------- */

  function showResult(u, rank, gain, captured, s) {
    var helpline = u.sensitive ?
      '<div class="helpline">' +
        "<b>如果剛剛的內容讓你想起了什麼</b>" +
        "<p>你可以找信任的大人、學校輔導室聊聊。<br>" +
        "安心專線 <b>1925</b>（24 小時）｜生命線 <b>1995</b>｜張老師 <b>1980</b><br>" +
        "想說的時候再說，沒有人會催你。</p>" +
      "</div>" : "";

    var capturedBlock = captured ?
      '<div class="card card--gold" style="margin-top:14px;text-align:left">' +
        '<div class="card__eyebrow">收進迷障圖鑑</div>' +
        '<div style="display:flex;gap:12px;align-items:center">' +
          '<div class="good__ico" style="color:var(--ember);border-color:rgba(224,87,79,.5);background:rgba(224,87,79,.12)">' +
            esc(captured.glyph) + "</div>" +
          "<div><b style=\"font-size:16px\">" + esc(captured.name) + "</b>" +
          '<p class="card__note" style="margin-top:3px">' + esc(captured.counter) + "</p></div>" +
        "</div>" +
      "</div>" : "";

    LQ.render(
      '<div class="sect"><h2>' + esc(u.no) + "｜" + esc(u.name) + "</h2></div>" +

      '<div class="insight">' +
        '<div class="insight__mark">領悟</div>' +
        '<p class="insight__q">' + nl2br(u.insight.line) + "</p>" +
        '<div class="insight__from">—— ' + esc(u.insight.from) + "</div>" +
      "</div>" +

      '<div class="rewards">' +
        '<div class="reward"><b>' + esc(rank) + "</b><small>評級</small></div>" +
        '<div class="reward"><b>' + s.tries + "</b><small>推理次數</small></div>" +
        '<div class="reward"><b>+' + gain + "</b><small>記憶碎片</small></div>" +
      "</div>" +

      capturedBlock +

      '<div class="card" style="margin-top:14px">' +
        '<div class="card__eyebrow">帶走一句話</div>' +
        '<p class="card__note" style="color:var(--ink);font-size:14.5px;margin-bottom:10px">' +
          esc(u.reflect.q) + "</p>" +
        '<textarea id="rf-input" rows="4" placeholder="' + esc(u.reflect.hint || "寫下你真的會說的那句話。") + '"></textarea>' +
        '<div style="display:flex;gap:8px;margin-top:10px">' +
          '<button type="button" class="btn btn--ghost btn--sm" id="rf-skip">先不寫</button>' +
          '<button type="button" class="btn btn--gold btn--sm" id="rf-save" style="flex:1">存進成長紀錄</button>' +
        "</div>" +
        '<p style="font-size:11.5px;color:var(--ink-faint);margin:9px 0 0">' +
          "沒登入就只留在這台裝置。登入之後會同步到你自己的帳號，" +
          "換手機也還在——同學和老師在遊戲裡看不到。</p>" +
      "</div>" +

      helpline
    );

    document.getElementById("rf-skip").addEventListener("click", function () { LQ.go("hub"); });
    document.getElementById("rf-save").addEventListener("click", function () {
      var v = document.getElementById("rf-input").value.trim();
      if (!v) { LQ.ui.modal.toast("還沒寫東西喔", true); return; }
      LQ.state.addJournal(u.id, u.no + "｜" + u.name, u.reflect.q, v);
      LQ.audio.good();
      LQ.ui.modal.toast("已存進成長紀錄");
      LQ.go("hub");
    });

    LQ.audio.coin();
    LQ.refreshTopbar();
  }

  /* ---- 每日思辨 ---------------------------------------------------- */

  function enterDaily() {
    var day = LQ.daily.sync();
    if (!LQ.economy.canAfford(LQ.daily.COST)) {
      LQ.ui.modal.toast("心力不足，需要 " + LQ.daily.COST + " 點", true);
      return;
    }
    var today = LQ.daily.todaySet();
    LQ.economy.spendStamina(LQ.daily.COST);
    LQ.refreshTopbar();

    LQ.ui.forge.start({
      bg: "gate-hall",
      prompt: today.set.prompt,
      fragments: today.set.fragments,
      solution: today.set.solution,
      seconds: 150,
      villain: { char: null, name: "每日思辨・" + today.set.title,
                 line: "生活裡的一個小情境。把它想清楚，比想快更重要。" },
      doorImg: "gate-hall",
      doorText: "想清楚了",
      onWin: function (s) { onDailyWin(today, s); },
      onLose: function () { LQ.go("daily"); },
      onQuit: function () { LQ.go("daily"); }
    });
  }

  function onDailyWin(today, s) {
    var firstToday = !LQ.state.d.daily.firstDone;
    var gain = LQ.daily.settle();
    var bonus = 0;
    if (firstToday && !LQ.daily.checkedInToday()) bonus = LQ.daily.checkIn();

    LQ.audio.coin();
    LQ.ui.modal.modal({
      title: "想清楚了",
      body:
        "<p>" + esc(today.set.title) + "<br>" +
        "推理 " + s.tries + " 次，評級 " + LQ.economy.rank(s.tries, s.len, s.peeks) + "。</p>" +
        '<div class="rewards">' +
          '<div class="reward"><b>+' + gain + "</b><small>記憶碎片</small></div>" +
          (bonus ? '<div class="reward"><b>+' + bonus + "</b><small>集滿七日</small></div>" : "") +
        "</div>" +
        (firstToday ? "<p style=\"font-size:12.5px;color:var(--ink-faint)\">今天的章已經蓋好了。</p>" : ""),
      acts: [{ label: "好", kind: "btn--gold", onClick: function () { LQ.go("daily"); } }]
    });
    if (bonus) LQ.economy.gainFrag(bonus);
    LQ.refreshTopbar();
  }

  LQ.levelflow = {
    unlocked: unlocked,
    enterUnit: enterUnit,
    enterDaily: enterDaily
  };

})(window.LQ = window.LQ || {});
