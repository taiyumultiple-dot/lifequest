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

       目前是 "file" 模式，但 assets/audio/bgm.mp3 還沒放進去，
       所以現在是**沒有背景音樂**的狀態——找不到檔案時 js/bgm.js 只會在
       console 印一行提示，畫面不受影響。把一首你有權使用的曲子命名成
       bgm.mp3 丟進 assets/audio/，重新整理就會自己播。

       ※ youtubeId 這支 BXsWn9DhF5g 是 John Williams〈Welcome To Jurassic
         Park〉，受著作權保護的商業電影配樂。網站已經公開上線，以泰宇出版
         名義發布的教學網站不適合公開嵌這個，所以不要把 mode 改回
         "youtube"，除非換成你有授權的曲子。
       --------------------------------------------------------------- */
    music: {
      mode: "file",
      youtubeId: "BXsWn9DhF5g",
      file: "assets/audio/bgm.mp3",
      volume: 0.4
    }
  };

})(window.LQ = window.LQ || {});
