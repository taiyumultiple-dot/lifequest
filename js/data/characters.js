/* ==========================================================================
   角色資料
   立繪與頭像由 tools/cutout_characters.py 從原始素材去背產生。
   要改角色描述，直接改這裡的文字就好。
   ========================================================================== */
(function (LQ) {
  "use strict";

  LQ.data = LQ.data || {};

  LQ.data.characters = {
    kehua: {
      name: "陳可華",
      role: "班長",
      art: "assets/characters/kehua.webp",
      face: "assets/characters/kehua-avatar.webp",
      traits: ["溫和細心", "善於觀察", "有時猶豫"],
      about: "關心他人但不善表達，個性隨和，和每個人都可以聊得來；" +
             "做事常常三分鐘熱度，想要找到喜歡的事情，但有很多不確定感。"
    },
    xiaowen: {
      name: "王小文",
      role: "博士",
      art: "assets/characters/xiaowen.webp",
      face: "assets/characters/xiaowen-avatar.webp",
      traits: ["認真負責", "思考細膩", "主見穩重"],
      about: "各科表現優異，上課常常發問，參加生物科學研究社。" +
             "個性穩重、有主見，不輕易受別人影響。可華遇到課業問題時，會向她請教。"
    },
    bojun: {
      name: "王博鈞",
      role: "康樂股長",
      art: "assets/characters/bojun.webp",
      face: "assets/characters/bojun-avatar.webp",
      traits: ["樂觀開朗", "熱心助人", "愛開玩笑"],
      about: "是陳可華的好麻吉。喜歡打籃球，是籃球隊長。" +
             "個性開朗樂觀且樂於助人，總能帶動氣氛，在團隊中扮演開心果的角色。"
    },
    xiaoping: {
      name: "張曉萍",
      role: "同學",
      art: "assets/characters/xiaoping.webp",
      face: "assets/characters/xiaoping-avatar.webp",
      traits: ["直率仗義", "情感細膩", "容易多想"],
      about: "看不慣別人被欺負就會出聲。心思其實很細，" +
             "常常在替別人著想的同時，也把自己繞進去。"
    },
    dad: {
      name: "可華爸爸",
      role: "父親",
      art: "assets/characters/dad.webp",
      face: "assets/characters/dad-avatar.webp",
      traits: ["成熟穩重", "關愛包容"],
      about: "理解可華的想法與感受，總在他需要時給予溫暖支持，是可華最堅強的後盾。"
    },
    grandpa: {
      name: "可華爺爺",
      role: "祖父",
      art: "assets/characters/grandpa.webp",
      face: "assets/characters/grandpa-avatar.webp",
      traits: ["慈祥智慧", "經驗豐富", "樂觀豁達"],
      about: "用人生經驗陪伴可華，常以故事啟發他思考，教他從不同角度看世界。"
    },

    /* 旁白／字卡用的虛擬角色，沒有立繪 */
    narrator: { name: "旁白", role: "", face: "", art: "" },

    /* 反派：幸福教教主。沒有去背立繪，直接用分鏡場景圖當頭像。 */
    leader: {
      name: "幸福教教主",
      role: "迷障",
      face: "assets/scenes/u01-rage.webp",
      art: "assets/scenes/u01-leader.webp",
      traits: ["柔笑", "壓迫", "空洞"],
      about: "臉上永遠掛著溫柔的笑，說思想是萬惡之源，只要放棄思考就能永遠幸福。"
    }
  };

})(window.LQ = window.LQ || {});
