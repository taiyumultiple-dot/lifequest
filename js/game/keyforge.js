/* ==========================================================================
   鑄鑰引擎 —— 整個遊戲的核心
   玩家要把散落的「思考碎片」排成正確的順序，鑄出鑰匙。
   規則等同經典的 1A2B：
     齒紋吻合（hit）  = 這塊碎片放對位置
     位置不對（near） = 這塊碎片有用，但順序不對
   ========================================================================== */
(function (LQ) {
  "use strict";

  /**
   * 判定一次提交。
   * @param {number[]} sol   正解序列（碎片索引，彼此不重複）
   * @param {number[]} guess 玩家排的序列（長度同 sol，彼此不重複）
   * @returns {{hit:number, near:number}}
   */
  function judge(sol, guess) {
    var hit = 0, shared = 0;
    for (var i = 0; i < guess.length; i++) {
      if (guess[i] === sol[i]) hit++;
      if (sol.indexOf(guess[i]) !== -1) shared++;
    }
    // 因為序列內不重複，「用對碎片」的總數減掉「位置也對」的，就是位置不對的數量
    return { hit: hit, near: shared - hit };
  }

  /**
   * 由字串產生可重現的亂數（mulberry32）。
   * 每日題目用日期當種子，全世界同一天會拿到同一題。
   */
  function rngFromSeed(seed) {
    var h = 1779033703 ^ String(seed).length;
    for (var i = 0; i < String(seed).length; i++) {
      h = Math.imul(h ^ String(seed).charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    var a = h >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * 從 0..poolSize-1 裡抽出 n 個不重複的值，並打亂順序。
   * @param {number} poolSize 候選碎片總數（本遊戲固定 9）
   * @param {number} n        鑰匙齒紋長度
   * @param {function} [rng]  亂數來源，省略時用 Math.random
   */
  function randomSequence(poolSize, n, rng) {
    rng = rng || Math.random;
    var pool = [];
    for (var i = 0; i < poolSize; i++) pool.push(i);
    // Fisher–Yates 洗牌後取前 n 個
    for (var j = pool.length - 1; j > 0; j--) {
      var k = Math.floor(rng() * (j + 1));
      var t = pool[j]; pool[j] = pool[k]; pool[k] = t;
    }
    return pool.slice(0, n);
  }

  /**
   * 自我檢查：用隨機資料驗證 judge() 的數學性質。
   * 在瀏覽器 console 打 LQ.keyforge.selfTest() 就會跑。
   * 驗三件事：
   *   1. hit + near 不可能超過序列長度
   *   2. 完全猜對時必為 hit = n, near = 0
   *   3. 把正解洗牌（同一組碎片、順序不同）時，hit + near 必等於 n
   */
  function selfTest(rounds) {
    rounds = rounds || 10000;
    var rng = rngFromSeed("selftest");
    var fails = [];

    for (var r = 0; r < rounds; r++) {
      var n = 3 + Math.floor(rng() * 4);            // 齒紋長度 3~6
      var sol = randomSequence(9, n, rng);
      var guess = randomSequence(9, n, rng);
      var res = judge(sol, guess);

      if (res.hit + res.near > n) fails.push(["總數超過長度", sol, guess, res]);
      if (res.hit < 0 || res.near < 0) fails.push(["出現負數", sol, guess, res]);

      var exact = judge(sol, sol.slice());
      if (exact.hit !== n || exact.near !== 0) fails.push(["全對判定錯誤", sol, exact]);

      // 洗牌版：碎片完全相同、順序可能不同
      var shuffled = sol.slice();
      for (var j = shuffled.length - 1; j > 0; j--) {
        var k = Math.floor(rng() * (j + 1));
        var t = shuffled[j]; shuffled[j] = shuffled[k]; shuffled[k] = t;
      }
      var sres = judge(sol, shuffled);
      if (sres.hit + sres.near !== n) fails.push(["同組碎片總數應等於長度", sol, shuffled, sres]);
    }

    if (fails.length) {
      console.error("鑄鑰引擎自我檢查失敗 " + fails.length + " 筆：", fails.slice(0, 5));
      return false;
    }
    console.log("✓ 鑄鑰引擎自我檢查通過（" + rounds + " 回合）");
    return true;
  }

  LQ.keyforge = {
    judge: judge,
    rngFromSeed: rngFromSeed,
    randomSequence: randomSequence,
    selfTest: selfTest
  };

})(window.LQ = window.LQ || {});
