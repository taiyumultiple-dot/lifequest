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

       ※ 目前填的 BXsWn9DhF5g 是 John Williams〈Welcome To Jurassic Park〉，
         是受著作權保護的商業電影配樂。用 "youtube" 模式等於嵌入 YouTube 的
         播放器（版權由 YouTube 那邊處理），但需要網路、可能出現廣告。
         若要離線且完全沒有版權疑慮，請改用 "file" 模式，
         放一首你有權使用的曲子到 assets/audio/bgm.mp3。
       --------------------------------------------------------------- */
    music: {
      mode: "youtube",
      youtubeId: "BXsWn9DhF5g",
      file: "assets/audio/bgm.mp3",
      volume: 0.4
    }
  };

})(window.LQ = window.LQ || {});
