/* ==========================================================================
   共用的彈窗與浮動提示
   ========================================================================== */
(function (LQ) {
  "use strict";

  var elModal = null, elToast = null;
  var onClose = null;          // 這個彈窗關掉時要做的事（不管用哪種方式關）

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** 把換行變成 <br>，順便逃脫 HTML */
  function nl2br(s) {
    return esc(s).replace(/\n/g, "<br>");
  }

  var UI = {
    esc: esc,
    nl2br: nl2br,

    init: function () {
      elModal = document.getElementById("modal");
      elToast = document.getElementById("toast");
      elModal.addEventListener("click", function (e) {
        if (e.target === elModal) UI.closeModal();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") UI.closeModal();
      });
    },

    /**
     * 開一個彈窗。
     * @param {object} o { title, body(HTML), acts:[{label, kind, onClick, close}], onClose }
     *   onClose 在彈窗關掉時一定會被呼叫一次——按按鈕、點背景、按 Esc 都算。
     */
    modal: function (o) {
      onClose = o.onClose || null;
      var acts = (o.acts || []).map(function (a, i) {
        return '<button type="button" class="btn ' + (a.kind || "btn--ghost") +
               '" data-act="' + i + '">' + esc(a.label) + "</button>";
      }).join("");

      elModal.innerHTML =
        '<div class="modal__box" role="dialog" aria-modal="true">' +
          (o.title ? '<h3 class="modal__title">' + esc(o.title) + "</h3>" : "") +
          '<div class="modal__body">' + (o.body || "") + "</div>" +
          (acts ? '<div class="modal__acts">' + acts + "</div>" : "") +
        "</div>";
      elModal.hidden = false;

      elModal.querySelectorAll("[data-act]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var a = o.acts[Number(btn.dataset.act)];
          if (a.close !== false) UI.closeModal();
          if (a.onClick) a.onClick();
        });
      });
      return elModal;
    },

    closeModal: function () {
      if (!elModal || elModal.hidden) return;
      elModal.hidden = true;
      elModal.innerHTML = "";
      var fn = onClose;
      onClose = null;
      if (fn) fn();
    },

    /** 確認視窗 */
    confirm: function (title, body, onYes, yesLabel) {
      this.modal({
        title: title,
        body: "<p>" + nl2br(body) + "</p>",
        acts: [
          { label: "取消", kind: "btn--ghost" },
          { label: yesLabel || "確定", kind: "btn--gold", onClick: onYes }
        ]
      });
    },

    /** 浮動提示 */
    toast: function (msg, bad) {
      var el = document.createElement("div");
      el.className = "toast__item" + (bad ? " toast__item--bad" : "");
      el.textContent = msg;
      elToast.appendChild(el);
      setTimeout(function () {
        el.style.transition = "opacity 300ms, transform 300ms";
        el.style.opacity = "0";
        el.style.transform = "translateY(-6px)";
        setTimeout(function () { el.remove(); }, 320);
      }, 1900);
    }
  };

  LQ.ui = LQ.ui || {};
  LQ.ui.modal = UI;

})(window.LQ = window.LQ || {});
