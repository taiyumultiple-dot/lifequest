/* ==========================================================================
   首頁：五扇門
   ========================================================================== */
(function (LQ) {
  "use strict";

  function esc(s) { return LQ.ui.modal.esc(s); }

  /** 找出玩家「現在該去哪一關」 */
  function nextUnit() {
    var list = LQ.data.units;
    for (var i = 0; i < list.length; i++) {
      if (!LQ.state.isCleared(list[i].id) && LQ.levelflow.unlocked(list[i])) return list[i];
    }
    return null;
  }

  function goalLine() {
    var u = nextUnit();
    if (!u) return "五扇門都走過了。回頭看看那些你寫下的句子吧。";
    if (u.id === "p00") return "先從序章開始。你得想起自己是怎麼走到這裡的。";
    return "下一扇是「" + u.name + "」，主題是" + u.virtue + "。";
  }

  function doorHTML(u) {
    var cleared = LQ.state.isCleared(u.id);
    var open = LQ.levelflow.unlocked(u);
    var rec = LQ.state.unit(u.id);

    var cls = "door" + (cleared ? " door--clear" : "") + (open ? "" : " door--locked");
    var meta = [];
    if (cleared) meta.push('<span class="tag tag--jade">已通過 · ' + esc(rec.rank) + "</span>");
    if (u.virtue) meta.push('<span class="tag tag--gold">' + esc(u.virtue) + "</span>");
    if (!open) meta.push('<span class="tag">尚未解鎖</span>');
    else if (u.cost) meta.push('<span class="tag">心力 ' + u.cost + "</span>");

    return '<button type="button" class="' + cls + '" data-unit="' + u.id + '"' +
        (open ? "" : " disabled") + ">" +
      '<div class="door__row">' +
        '<div class="door__key"><i>' + (open ? (cleared ? "✓" : "⚿") : "🔒") + "</i><b>" +
          esc(u.no.replace("第", "").replace("扇門", "")) + "</b></div>" +
        '<div class="door__body">' +
          '<div class="door__eyebrow">' + esc(u.no) + "</div>" +
          '<div class="door__name">' + esc(u.name) + "</div>" +
          '<p class="door__desc">' + esc(u.desc) + "</p>" +
          '<div class="door__meta">' + meta.join("") + "</div>" +
        "</div>" +
      "</div></button>";
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.hub = {
    render: function () {
      var cleared = LQ.data.units.filter(function (u) { return LQ.state.isCleared(u.id); }).length;

      LQ.render(
        '<div class="hero">' +
          '<video class="hero__video" id="hero-video" src="assets/videos/prologue.mp4" autoplay muted loop playsinline ' +
            'aria-label="矗立著五扇高聳大門的心靈迷宮"></video>' +
          '<button type="button" class="hero__mute" id="hero-mute" aria-label="開關影片聲音"><i>✕</i></button>' +
        "</div>" +
        '<div class="hero-title">' +
          '<div class="hero__mark">LIFE EDUCATION QUEST</div>' +
          '<h1 class="hero__title">打開幸福人生之門・心靈迷宮</h1>' +
          '<p class="hero__line">穿過這五扇門，你才回得了家。</p>' +
        "</div>" +

        '<div class="goal">' +
          '<img class="goal__face" src="assets/characters/xiaowen-avatar.webp" alt="王小文">' +
          "<div><div class=\"goal__t\">目前的目標</div>" +
          '<p class="goal__d">' + esc(goalLine()) + "</p></div>" +
        "</div>" +

        '<div class="sect"><h2>門扉</h2><small>' + cleared + " / " + LQ.data.units.length + " 已通過</small></div>" +
        '<div class="doors">' + LQ.data.units.map(doorHTML).join("") + "</div>" +

        /* 這一頁只留「門」。原本底下那串「其他去處」已經移到「每日」，
           心象、說明也各自有自己的導覽鈕，不必在這裡再列一次。 */
        '<p class="hub__foot">其他玩法收在下面的「每日」，' +
          "心象探索、說明各有自己的按鈕。</p>"
      );

      document.querySelectorAll("[data-unit]").forEach(function (b) {
        b.addEventListener("click", function () {
          LQ.audio.tap();
          LQ.levelflow.enterUnit(b.dataset.unit);
        });
      });

      initHeroSound();
    }
  };

  /* ---- 英雄影片的聲音開關 --------------------------------------------
     預設靜音循環播放（純當背景）。打開聲音時：從頭播一次、背景音樂讓開；
     播完（或使用者自己關掉聲音）就退回靜音循環，背景音樂等 5 秒再回來，
     避免兩邊的聲音卡在一起切換。 */
  function initHeroSound() {
    var video = document.getElementById("hero-video");
    var btn = document.getElementById("hero-mute");
    if (!video || !btn) return;
    var resumeTimer = null;

    function setIcon() {
      btn.innerHTML = video.muted ? "<i>✕</i>" : "<i>♪</i>";
    }
    setIcon();

    function letMusicBack() {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(function () { LQ.bgm.refresh(); }, 5000);
    }

    video.addEventListener("ended", function () {
      video.muted = true;
      video.loop = true;
      video.currentTime = 0;
      video.play().catch(function () {});
      setIcon();
      letMusicBack();
    });

    btn.addEventListener("click", function () {
      LQ.audio.tap();
      if (video.muted) {
        clearTimeout(resumeTimer);
        LQ.bgm.stop();
        video.loop = false;
        video.muted = false;
        video.currentTime = 0;
        video.play().catch(function () {});
      } else {
        video.muted = true;
        video.loop = true;
        letMusicBack();
      }
      setIcon();
    });
  }

})(window.LQ = window.LQ || {});
