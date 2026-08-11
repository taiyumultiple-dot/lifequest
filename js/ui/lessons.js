/* ==========================================================================
   課本單元・畫面
   ---------------------------------------------------------------------------
   清單頁：六個單元，各自顯示進度（讀 + 玩）。
   單元頁：課本段落一段一段讀，每段底下有一題互動；旁邊是對應的那扇門。

   老師備課提示預設收起來——因為這個畫面可能正在投影，
   跟 AI_STUDIO 指令裡的規範一致。
   ========================================================================== */
(function (LQ) {
  "use strict";

  function esc(s) { return LQ.ui.modal.esc(s); }
  function nl2br(s) { return LQ.ui.modal.nl2br(s); }

  var open = { lessonId: null, sec: 0 };

  /* ---- 清單 --------------------------------------------------------- */

  function renderList() {
    var list = LQ.lessons.all();
    var overall = LQ.lessons.overall();

    LQ.render(
      '<div class="sect"><h2>課本單元</h2><small>' + list.length + " 個單元</small></div>" +

      '<div class="card card--gold">' +
        '<div class="card__eyebrow">整體學習進度</div>' +
        '<div style="display:flex;align-items:baseline;gap:10px;margin:2px 0 10px">' +
          '<b style="font-family:var(--font-title);font-size:30px;color:var(--gold)">' + overall + "%</b>" +
          '<span style="font-size:12.5px;color:var(--ink-faint)">讀完課本段落與通過對應關卡，各佔一半</span>' +
        "</div>" +
        '<div class="bar bar--gold"><i style="width:' + overall + '%"></i></div>' +
      "</div>" +

      '<div class="sect"><h2>單元列表</h2></div>' +
      '<div class="lessons">' + list.map(cellHTML).join("") + "</div>" +

      '<p style="font-size:12.5px;color:var(--ink-faint);margin-top:14px;line-height:1.9">' +
        "每個單元都對應遊戲裡的一扇門：讀完課本再去闖那一關，" +
        "或是先玩再回來讀，都可以。</p>" +

      (LQ.lessons.hasPack()
        ? '<p style="font-size:12px;color:var(--jade);margin-top:8px">目前使用的是你匯入的課本內容。</p>'
        : "")
    );

    document.querySelectorAll("[data-lesson]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        if (e.target.closest("[data-mark]")) return;   // 按書籤不要進單元
        LQ.audio.tap();
        openLesson(b.dataset.lesson);
      });
    });
    document.querySelectorAll("[data-mark]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        LQ.audio.tap();
        LQ.lessons.toggleMark(b.dataset.mark);
        renderList();
      });
    });
  }

  function cellHTML(l) {
    var pct = LQ.lessons.percent(l);
    var r = LQ.lessons.readProgress(l);
    var played = LQ.lessons.played(l);
    var marked = LQ.lessons.marked(l);

    var tags = [];
    if (l.virtue) tags.push('<span class="tag tag--gold">' + esc(l.virtue) + "</span>");
    tags.push('<span class="tag">' + (r.total ? "課本 " + r.done + "/" + r.total : "課本未載入") + "</span>");
    tags.push('<span class="tag' + (played ? " tag--jade" : "") + '">' +
      (played ? "關卡已通過" : "關卡未通過") + "</span>");

    return '<button type="button" class="lcell' + (pct === 100 ? " lcell--done" : "") +
        '" data-lesson="' + l.id + '">' +
      '<div class="lcell__top">' +
        '<span class="lcell__g">' + esc(l.glyph) + "</span>" +
        '<div class="lcell__head">' +
          '<div class="lcell__no">' + esc(l.no) + "</div>" +
          '<div class="lcell__name">' + esc(l.name) + "</div>" +
        "</div>" +
        '<span class="lcell__mark" data-mark="' + l.id + '" role="button" ' +
          'aria-label="' + (marked ? "取消書籤" : "加入書籤") + '">' +
          (marked ? "★" : "☆") + "</span>" +
      "</div>" +
      '<p class="lcell__desc">' + esc(l.desc) + "</p>" +
      '<div class="lcell__tags">' + tags.join("") + "</div>" +
      '<div class="lcell__bar"><div class="bar ' + (pct === 100 ? "bar--gold" : "bar--ice") +
        '"><i style="width:' + pct + '%"></i></div><b>' + pct + "%</b></div>" +
    "</button>";
  }

  /* ---- 單元頁 ------------------------------------------------------- */

  function openLesson(id) {
    var l = LQ.data.lessonById(id);
    if (!l) { renderList(); return; }
    open.lessonId = id;
    // 從第一段還沒讀完的開始
    open.sec = 0;
    for (var i = 0; i < l.sections.length; i++) {
      if (!LQ.lessons.sectionDone(l.id, l.sections[i].id)) { open.sec = i; break; }
    }
    renderLesson();
  }

  function renderLesson() {
    var l = LQ.data.lessonById(open.lessonId);
    if (!l) { renderList(); return; }

    var pct = LQ.lessons.percent(l);
    var unit = l.unitId ? LQ.data.unitById(l.unitId) : null;
    var played = LQ.lessons.played(l);

    LQ.render(
      '<button type="button" class="btn btn--ghost btn--sm" id="ls-back" style="margin-bottom:12px">← 課本單元</button>' +

      '<div class="sect"><h2>' + esc(l.name) + "</h2><small>" + esc(l.no) + "</small></div>" +

      '<div class="card card--gold">' +
        (l.virtue ? '<div class="card__eyebrow">' + esc(l.virtue) + "</div>" : "") +
        (l.lessonTitle
          ? '<h3 class="card__title">' + esc(l.lessonTitle) + "</h3>" +
            (l.lessonSubtitle ? '<p class="card__note">' + esc(l.lessonSubtitle) + "</p>" : "")
          : '<p class="card__note" style="color:var(--ink);font-size:14.5px">' + esc(l.desc) + "</p>") +
        '<div style="margin-top:14px"><div class="bar bar--gold"><i style="width:' + pct + '%"></i></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink-faint);margin-top:6px">' +
          "<span>學習進度</span><b style=\"color:var(--gold)\">" + pct + "%</b></div></div>" +
      "</div>" +

      /* 對應的那扇門 */
      (unit
        ? '<div class="sect" style="margin-top:20px"><h2>對應關卡</h2></div>' +
          '<div class="rows"><button type="button" class="row" id="ls-door"><i>' +
            (played ? "✓" : "⚿") + "</i>" +
            "<div><b>" + esc(unit.no) + "｜" + esc(unit.name) + "</b><p>" + esc(unit.desc) + "</p></div>" +
            '<span class="row__val">' + (played ? "已通過" : "去挑戰") + "</span></button></div>"
        : "") +

      /* 課本段落 */
      '<div class="sect" style="margin-top:20px"><h2>學習內容</h2><small>' +
        (l.sections.length ? l.sections.length + " 段" : "尚未載入") + "</small></div>" +

      (l.sections.length ? sectionsHTML(l) : emptyHTML())
    );

    document.getElementById("ls-back").addEventListener("click", function () {
      LQ.audio.tap();
      renderList();
    });

    var door = document.getElementById("ls-door");
    if (door) door.addEventListener("click", function () {
      LQ.audio.tap();
      LQ.levelflow.enterUnit(l.unitId);
    });

    if (l.sections.length) bindSections(l);
    else bindEmpty();
  }

  /** 段落清單：讀完的收合成一行，目前這一段展開 */
  function sectionsHTML(l) {
    return '<div class="lsecs">' + l.sections.map(function (s, i) {
      var done = LQ.lessons.sectionDone(l.id, s.id);
      var isOpen = i === open.sec;

      var head =
        '<button type="button" class="lsec__head" data-sec="' + i + '">' +
          '<span class="lsec__n' + (done ? " lsec__n--done" : "") + '">' +
            (done ? "✓" : (i + 1)) + "</span>" +
          '<div class="lsec__t"><b>' + esc(s.title) + "</b>" +
            (s.minutes ? "<small>約 " + s.minutes + " 分鐘</small>" : "") + "</div>" +
          '<span class="lsec__chev">' + (isOpen ? "▾" : "▸") + "</span>" +
        "</button>";

      if (!isOpen) return '<div class="lsec">' + head + "</div>";

      return '<div class="lsec lsec--open">' + head +
        '<div class="lsec__body">' +
          (s.slides || []).map(function (t) {
            return '<p class="lsec__slide">' + nl2br(t) + "</p>";
          }).join("") +

          (s.teacherNotes && s.teacherNotes.length
            ? '<div class="lsec__notes">' +
                '<button type="button" class="lsec__notes-t" data-notes="' + i + '">' +
                  "老師備課提示（" + s.teacherNotes.length + "）　▸</button>" +
                '<div class="lsec__notes-b" hidden><ul>' +
                  s.teacherNotes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") +
                "</ul></div>" +
              "</div>"
            : "") +

          (s.checkpoint ? checkpointHTML(l, s.checkpoint) : "") +

          '<button type="button" class="btn ' + (done ? "btn--ghost" : "btn--gold") +
            ' btn--block btn--sm" data-next="' + i + '" style="margin-top:14px">' +
            (done ? (i + 1 < l.sections.length ? "下一段" : "回單元列表")
                  : (i + 1 < l.sections.length ? "讀完了，下一段" : "讀完了")) +
          "</button>" +
        "</div>" +
      "</div>";
    }).join("") + "</div>";
  }

  /** 三種題型 */
  function checkpointHTML(l, cp) {
    var saved = LQ.lessons.getAnswer(l.id, cp.id);

    var body = "";
    if (cp.type === "scale") {
      var min = cp.min || 1, max = cp.max || 5;
      var btns = "";
      for (var v = min; v <= max; v++) {
        btns += '<button type="button" class="lscale' + (saved === v ? " lscale--on" : "") +
                '" data-scale="' + v + '">' + v + "</button>";
      }
      body = '<div class="lscale-row">' + btns + "</div>" +
        '<div class="lscale-lab"><span>' + esc(cp.minLabel || min) + "</span>" +
        "<span>" + esc(cp.maxLabel || max) + "</span></div>";

    } else if (cp.type === "choice") {
      body = '<div class="choices">' + (cp.options || []).map(function (o, i) {
        return '<button type="button" class="choice' + (saved === i ? " choice--on" : "") +
               '" data-choice="' + i + '">' + esc(o) + "</button>";
      }).join("") + "</div>";

    } else {
      body =
        '<textarea id="lq-open" rows="4" placeholder="' +
          esc(cp.hint || "不用寫得漂亮，寫得真實就好。") + '">' +
          (typeof saved === "string" ? esc(saved) : "") + "</textarea>" +
        '<button type="button" class="btn btn--gold btn--sm btn--block" id="lq-open-save" ' +
          'style="margin-top:10px">存進成長紀錄</button>';
    }

    return '<div class="lcp">' +
        '<div class="lcp__eyebrow">停下來想一下</div>' +
        '<p class="lcp__q">' + esc(cp.prompt) + "</p>" +
        body +
        (cp.hint && cp.type !== "open"
          ? '<p class="lcp__hint">' + esc(cp.hint) + "</p>" : "") +
      "</div>";
  }

  function bindSections(l) {
    // 換段
    document.querySelectorAll("[data-sec]").forEach(function (b) {
      b.addEventListener("click", function () {
        var i = Number(b.dataset.sec);
        LQ.audio.tap();
        open.sec = (open.sec === i) ? -1 : i;
        renderLesson();
      });
    });

    // 備課提示展開／收起
    document.querySelectorAll("[data-notes]").forEach(function (b) {
      b.addEventListener("click", function () {
        var box = b.nextElementSibling;
        box.hidden = !box.hidden;
        b.textContent = "老師備課提示（" + box.querySelectorAll("li").length + "）　" +
          (box.hidden ? "▸" : "▾");
      });
    });

    var sec = l.sections[open.sec];
    var cp = sec && sec.checkpoint;

    if (cp) {
      document.querySelectorAll("[data-scale]").forEach(function (b) {
        b.addEventListener("click", function () {
          LQ.audio.tap();
          LQ.lessons.answer(l.id, cp.id, Number(b.dataset.scale));
          renderLesson();
        });
      });
      document.querySelectorAll("[data-choice]").forEach(function (b) {
        b.addEventListener("click", function () {
          LQ.audio.tap();
          LQ.lessons.answer(l.id, cp.id, Number(b.dataset.choice));
          renderLesson();
        });
      });
      var save = document.getElementById("lq-open-save");
      if (save) save.addEventListener("click", function () {
        var v = document.getElementById("lq-open").value.trim();
        if (!v) { LQ.ui.modal.toast("還沒寫東西喔", true); return; }
        LQ.lessons.answer(l.id, cp.id, v);
        LQ.state.addJournal("lesson", l.no + "｜" + l.name, cp.prompt, v);
        LQ.audio.good();
        LQ.ui.modal.toast("已存進成長紀錄");
      });
    }

    // 讀完這一段
    document.querySelectorAll("[data-next]").forEach(function (b) {
      b.addEventListener("click", function () {
        var i = Number(b.dataset.next);
        LQ.audio.tap();
        LQ.lessons.markSection(l.id, l.sections[i].id);
        if (i + 1 < l.sections.length) { open.sec = i + 1; renderLesson(); }
        else { LQ.audio.good(); renderList(); }
      });
    });
  }

  /** 還沒載入課本段落的單元 */
  function emptyHTML() {
    return '<div class="card">' +
        '<p class="card__note">這個單元的課本段落還沒載入。<br><br>' +
        "課本內容是老師的教材，遊戲不會自己代寫。" +
        "把課本單元存成 JSON 之後匯入，這一頁就會出現段落、提示與互動題。</p>" +
        '<button type="button" class="btn btn--gold btn--block btn--sm" id="ls-import" ' +
          'style="margin-top:14px">匯入課本單元</button>' +
      "</div>" +
      '<p style="font-size:12px;color:var(--ink-faint);margin-top:10px;line-height:1.85">' +
        "格式與 <code>lifeedu/content/lesson-01.json</code> 相同：" +
        "每個單元有 sections，每段有 slides、teacherNotes 與一個 checkpoint" +
        "（type 可以是 scale / choice / open）。</p>";
  }

  function bindEmpty() {
    document.getElementById("ls-import").addEventListener("click", function () {
      LQ.audio.tap();
      LQ.ui.lessons.importDialog(renderLesson);
    });
  }

  /* ---- 匯入對話框（設定頁也會用）------------------------------------ */

  function importDialog(after) {
    LQ.ui.modal.modal({
      title: "匯入課本單元",
      body:
        "<p>可以貼上一份課本 JSON，或選一個檔案。格式同 " +
        "<code>lifeedu/content/lesson-01.json</code>：單一課或多課的陣列都收。<br>" +
        "匯入的內容存在這台裝置，按「還原成內建」就會恢復。</p>" +
        '<textarea id="ls-text" rows="6" placeholder="把 JSON 貼在這裡"></textarea>',
      acts: [
        { label: "選檔案", kind: "btn--ghost", close: false, onClick: function () {
            var inp = document.createElement("input");
            inp.type = "file";
            inp.accept = ".json,application/json";
            inp.addEventListener("change", function () {
              var f = inp.files && inp.files[0];
              if (!f) return;
              var fr = new FileReader();
              fr.onload = function () {
                document.getElementById("ls-text").value = String(fr.result);
              };
              fr.readAsText(f, "utf-8");
            });
            inp.click();
          } },
        { label: "還原成內建", kind: "btn--ghost", onClick: function () {
            LQ.lessons.resetPack();
            LQ.ui.modal.toast("已還原成內建六單元");
            renderList();
          } },
        { label: "匯入", kind: "btn--gold", close: false, onClick: function () {
            var t = document.getElementById("ls-text").value.trim();
            if (!t) { LQ.ui.modal.toast("還沒貼內容", true); return; }
            if (!LQ.lessons.importPack(t)) {
              LQ.ui.modal.toast("格式看起來不對，請確認是課本 JSON", true);
              return;
            }
            LQ.ui.modal.closeModal();
            LQ.ui.modal.toast("課本單元已更新");
            if (after) after(); else renderList();
          } }
      ]
    });
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.lessons = {
    render: renderList,
    importDialog: importDialog
  };

})(window.LQ = window.LQ || {});
