/* ==========================================================================
   音效：用 Web Audio 直接合成，不外連任何音檔（離線也有聲音）
   ========================================================================== */
(function (LQ) {
  "use strict";

  var ctx = null;

  function ac() {
    if (!ctx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  /** 單一個音 */
  function tone(freq, dur, type, gain, delay) {
    if (!LQ.state.d.sound) return;
    var a = ac(); if (!a) return;
    var t0 = a.currentTime + (delay || 0);
    var osc = a.createOscillator();
    var g = a.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain || .12, t0 + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    osc.connect(g); g.connect(a.destination);
    osc.start(t0); osc.stop(t0 + dur + .02);
  }

  /** 一串音（做出「叮咚」「開門」那種感覺）*/
  function seq(notes, type, gain) {
    notes.forEach(function (n) { tone(n[0], n[1], type, gain, n[2]); });
  }

  LQ.audio = {
    /** 使用者第一次互動時呼叫，解開瀏覽器的自動播放限制 */
    unlock: function () { ac(); },

    tap:     function () { tone(520, .07, "triangle", .07); },
    place:   function () { tone(720, .09, "triangle", .09); },
    remove:  function () { tone(340, .07, "triangle", .07); },
    peek:    function () { seq([[420, .12, 0], [560, .16, .07]], "sine", .09); },

    /** 提交後：依吻合數給不同的回饋音 */
    judge:   function (hit, len) {
      if (hit === 0) { tone(190, .18, "sawtooth", .07); return; }
      var base = 440 + hit * 60;
      seq([[base, .10, 0], [base * 1.25, .14, .06]], "sine", .10);
      if (hit === len) return;
    },

    hurt:    function () { seq([[240, .16, 0], [170, .24, .10]], "sawtooth", .09); },
    fail:    function () { seq([[220, .3, 0], [165, .45, .16]], "sine", .10); },

    /** 鑰匙成形 → 開門 */
    open:    function () {
      seq([[523, .18, 0], [659, .18, .10], [784, .22, .20], [1047, .55, .32]], "sine", .11);
    },
    coin:    function () { seq([[880, .07, 0], [1175, .12, .05]], "triangle", .09); },
    good:    function () { seq([[660, .12, 0], [880, .18, .08]], "sine", .10); }
  };

})(window.LQ = window.LQ || {});
