/* ==========================================================================
   雲端設定
   ---------------------------------------------------------------------------
   要用「Google 登入 + 雲端存檔」才需要填這裡；留空的話遊戲照常運作，
   只是進度存在這台裝置上。

   這兩個值是「公開金鑰」，本來就設計成可以放在網頁裡，不是機密：
   真正的保護來自資料庫的 RLS（每個人只讀寫得到自己那一列）。
   ========================================================================== */
(function (LQ) {
  "use strict";

  LQ.config = {
    // Supabase 專案網址與公開金鑰
    supabaseUrl: "https://qhogqfzaeyqkaljymyde.supabase.co",
    supabaseKey: "sb_publishable_thgl-DBqBBkAjOgS6y4IfQ_gSR0K5V4",

    // 存放存檔的資料表
    table: "lifequest_saves",

    // Supabase 用戶端函式庫（只有按下登入時才會去載）
    clientLib: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js",

    /* ---------------------------------------------------------------
       背景音樂
       mode:
         "off"     不放音樂
         "file"    播 file 指定的音檔（推薦：離線可用、沒廣告、無版權疑慮）
         "youtube" 嵌入 YouTube 播放器播 youtubeId 這支影片

       目前是 "youtube" 模式，播 youtubeId 那支影片（使用者 2026-08-12
       指定的曲子）。用嵌入的方式播，檔案不由我們散布，播放與授權都
       留在 YouTube 那邊；代價是需要網路、可能有廣告、離線就沒有音樂。

       ※ 提醒：BXsWn9DhF5g 是 John Williams〈Welcome To Jurassic Park〉，
         受著作權保護的商業電影配樂。嵌入 YouTube 播放器不等於取得
         公開演播授權，以泰宇出版名義發布的教學網站要用它，建議先確認
         過授權。想換回沒有版權疑慮的版本，把 mode 改成 "file" 即可——
         assets/audio/bgm.mp3 已經備好，那是為這個遊戲合成的原創環境
         音樂（A 小調五聲音階、Am-F-C-G，64 秒無縫循環）。

       玩家可以在遊戲的「設定」裡關掉音樂或調音量。
       --------------------------------------------------------------- */
    music: {
      mode: "youtube",
      youtubeId: "BXsWn9DhF5g",
      file: "assets/audio/bgm.mp3",
      volume: 0.4
    }
  };

})(window.LQ = window.LQ || {});
