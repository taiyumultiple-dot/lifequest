/* ==========================================================================
   迷障追跡
   一場接一場的思辨情境，時間越來越短；輸一場就結束。
   過程中會浮現還沒收服的迷障，解開它就能收進圖鑑。
   ========================================================================== */
(function (LQ) {
  "use strict";

  var COST = 30;
  var run = null;

  function esc(s) { return LQ.ui.modal.esc(s); }

  function start() {
    if (!LQ.economy.canAfford(COST)) {
      LQ.ui.modal.toast("心力不足，需要 " + COST + " 點", true);
      return;
    }
    LQ.economy.spendStamina(COST);
    LQ.refreshTopbar();

    run = { round: 0, score: 0, caught: [] };
    nextRound();
  }

  function nextRound() {
    run.round += 1;
    var sets = LQ.data.dailySets;
    var set = sets[Math.floor(Math.random() * sets.length)];
    var seconds = Math.max(60, 150 - (run.round - 1) * 15);

    // 每兩場浮現一個還沒收服的迷障
    var target = (run.round % 2 === 0) ? LQ.illusions.pickForHunt() : null;
    if (target && LQ.illusions.has(target.id)) target = null;

    LQ.ui.forge.start({
      bg: "u01-fire",
      prompt: set.prompt,
      fragments: set.fragments,
      solution: set.solution,
      seconds: seconds,
      villain: target
        ? { char: null, name: "浮現：" + target.name, line: target.whisper }
        : { char: null, name: "追跡 第 " + run.round + " 場", line: "越往裡面走，時間越少。想清楚，比想快重要。" },
      doorImg: "gate-hall",
      doorText: "追跡 " + run.round,
      onWin: function (s) { won(s, target); },
      onLose: function () { finish("心之防線用完了。"); },
      onQuit: function () { finish("你離開了追跡。"); }
    });
  }

  function won(s, target) {
    run.score += 100 + Math.max(0, Math.round(s.len * 20 - s.tries * 5 - s.peeks * 15));

    if (target && LQ.illusions.capture(target.id)) {
      run.caught.push(target);
      LQ.audio.good();
      LQ.ui.modal.modal({
        title: "收服了「" + target.name + "」",
        body:
          '<p style="color:var(--ember)">' + esc(target.whisper) + "</p>" +
          "<p>" + esc(target.counter) + "</p>" +
          '<p style="font-size:12.5px;color:var(--ink-faint)">已收進迷障圖鑑，可以裝備成「警覺」。</p>',
        acts: [
          { label: "先收手（保留 " + run.score + " 分）", kind: "btn--ghost",
            onClick: function () { finish("你決定見好就收。"); } },
          { label: "繼續往裡面走", kind: "btn--gold", onClick: nextRound }
        ]
      });
      return;
    }

    LQ.ui.modal.modal({
      title: "第 " + run.round + " 場結束",
      body: "<p>目前累積 <b style=\"color:var(--gold)\">" + run.score + "</b> 分。<br>" +
            "再往裡面走一場，時間會更短。</p>",
      acts: [
        { label: "先收手", kind: "btn--ghost", onClick: function () { finish("你決定見好就收。"); } },
        { label: "繼續", kind: "btn--gold", onClick: nextRound }
      ]
    });
  }

  function finish(reason) {
    var score = run ? run.score : 0;
    var best = LQ.state.d.huntBest;
    var isBest = score > best;
    if (isBest) { LQ.state.d.huntBest = score; }

    var gain = LQ.economy.fragGain(Math.round(score * 0.6));
    LQ.economy.gainFrag(gain);
    LQ.state.save();

    LQ.ui.modal.modal({
      title: "追跡結束",
      body:
        "<p>" + esc(reason) + "</p>" +
        '<div class="rewards">' +
          '<div class="reward"><b>' + score + "</b><small>本次得分</small></div>" +
          '<div class="reward"><b>' + Math.max(score, best) + "</b><small>最佳</small></div>" +
          '<div class="reward"><b>+' + gain + "</b><small>記憶碎片</small></div>" +
        "</div>" +
        (isBest ? '<p style="color:var(--gold);text-align:center">新紀錄。</p>' : ""),
      acts: [{ label: "回去", kind: "btn--gold", onClick: function () { LQ.go("daily"); } }]
    });

    run = null;
    LQ.refreshTopbar();
  }

  LQ.hunt = { COST: COST, start: start };

})(window.LQ = window.LQ || {});
