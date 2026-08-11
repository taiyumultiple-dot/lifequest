/* ==========================================================================
   成長紀錄：每一關結束時寫下的句子
   ========================================================================== */
(function (LQ) {
  "use strict";

  function esc(s) { return LQ.ui.modal.esc(s); }

  function when(ts) {
    var d = new Date(ts);
    return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate();
  }

  /** 匯出成一份可以列印、可以交出去的 HTML */
  function exportHTML() {
    var list = LQ.state.d.journal;
    if (!list.length) { LQ.ui.modal.toast("還沒有任何紀錄", true); return; }

    var rows = list.map(function (e) {
      return '<div class="e"><div class="m">' + esc(e.unitName) + "　" + when(e.at) + "</div>" +
             '<div class="q">' + esc(e.q) + "</div>" +
             '<div class="a">' + esc(e.a).replace(/\n/g, "<br>") + "</div></div>";
    }).join("");

    var html =
      '<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8">' +
      "<title>五門・心靈迷宮 成長紀錄</title><style>" +
      "body{font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.9;color:#222}" +
      "h1{font-size:24px;border-bottom:2px solid #C9A24B;padding-bottom:10px}" +
      ".e{margin:24px 0;padding:16px 18px;border:1px solid #ddd;border-radius:10px;page-break-inside:avoid}" +
      ".m{font-size:12px;color:#888}.q{font-size:14px;color:#8a6d1f;margin:6px 0}.a{font-size:15px;white-space:pre-wrap}" +
      "</style></head><body><h1>成長紀錄</h1>" +
      "<p style='color:#666;font-size:13px'>共 " + list.length + " 則</p>" + rows + "</body></html>";

    var blob = new Blob([html], { type: "text/html;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "成長紀錄.html";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
    LQ.ui.modal.toast("已下載成長紀錄");
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.journal = {
    render: function () {
      var list = LQ.state.d.journal;

      LQ.render(
        '<div class="sect"><h2>成長紀錄</h2><small>' + list.length + " 則</small></div>" +
        '<p style="font-size:13px;color:var(--ink-soft);margin-bottom:14px">' +
          "沒登入的話，這些句子只留在這台裝置。登入之後會同步到你自己的帳號，" +
          "換手機也還在——同學和老師在遊戲裡看不到。<br>" +
          "要交作業或想留著的話，可以匯出成一份檔案。</p>" +

        (list.length
          ? '<button type="button" class="btn btn--ghost btn--block btn--sm" id="jn-export" style="margin-bottom:14px">匯出成 HTML（可列印）</button>' +
            list.map(function (e) {
              return '<div class="entry">' +
                '<div class="entry__h"><b>' + esc(e.unitName) + "</b><small>" + when(e.at) + "</small></div>" +
                '<p class="entry__q">' + esc(e.q) + "</p>" +
                '<p class="entry__a">' + esc(e.a) + "</p>" +
              "</div>";
            }).join("")
          : '<div class="card"><p class="card__note">還沒有紀錄。<br>' +
            "走完一扇門之後，你會有機會寫下一句話帶走。</p></div>")
      );

      var btn = document.getElementById("jn-export");
      if (btn) btn.addEventListener("click", exportHTML);
    }
  };

})(window.LQ = window.LQ || {});
