# 開啟 Google 登入（只有你能做的那一步）

程式端已經全部寫好了。剩下這一段設定必須用你自己的 Google 帳號操作，
我沒辦法代做（會需要登入你的帳號、複製貼上密鑰）。

大約 10 分鐘。做完之後遊戲的「使用 Google 帳號登入」就會直接生效，程式不用再改。

---

## 目前狀態：**還沒開**（2026-08-11 查證）

直接問過資料庫了，回來的答案是 `google: false` ——
也就是下面的**步驟一與步驟二還沒完成**，只有 email 是開著的。
所以按下「使用 Google 帳號登入」連不上 Google，不是程式壞掉。

隨時可以自己查一次，把這個網址貼進瀏覽器：

```
https://qhogqfzaeyqkaljymyde.supabase.co/auth/v1/settings?apikey=sb_publishable_thgl-DBqBBkAjOgS6y4IfQ_gSR0K5V4
```

回應裡找 `"google"`：`false` 是還沒開，`true` 就是好了。

---

## 資料庫那邊我已經做好了

- Supabase 專案：`taiyutest-debug's Project`（`qhogqfzaeyqkaljymyde`）
- 資料表：`lifequest_saves`（一位玩家一列，整份存檔用 jsonb 存）
- 已開啟 RLS，四條政策確保**每個人只讀寫得到自己那一列**
- 安全檢查：零問題

---

## 步驟一：在 Google Cloud 建立 OAuth 用戶端

1. 開 <https://console.cloud.google.com/> → 建立一個專案（或用現有的）
2. 左側選 **API 和服務 → OAuth 同意畫面**
   - User Type 選「外部」
   - 應用程式名稱填「五門・心靈迷宮」之類的
   - 使用者支援電子郵件、開發人員聯絡資訊填你的信箱
   - 範圍不用加，預設就夠（我們只要名稱和信箱）
3. 左側選 **API 和服務 → 憑證 → 建立憑證 → OAuth 用戶端 ID**
   - 應用程式類型：**網頁應用程式**
   - 「已授權的重新導向 URI」加入這一行（**一字不差**）：

     ```
     https://qhogqfzaeyqkaljymyde.supabase.co/auth/v1/callback
     ```

4. 建立完會給你 **用戶端 ID** 和 **用戶端密鑰**，先留著

---

## 步驟二：貼進 Supabase

1. 開 <https://supabase.com/dashboard/project/qhogqfzaeyqkaljymyde/auth/providers>
2. 找到 **Google**，打開開關
3. 把剛剛的 **Client ID** 和 **Client Secret** 貼進去，儲存

---

## 步驟三：告訴 Supabase 你的網站網址

1. 開 <https://supabase.com/dashboard/project/qhogqfzaeyqkaljymyde/auth/url-configuration>
2. **Redirect URLs** 加入遊戲會用到的網址，例如：

   ```
   http://localhost:8811/**
   https://你的網域/**
   ```

   （之後部署到 GitHub Pages 或 Netlify，記得把正式網址也加進來，
   否則登入完會被擋下來。）

---

## 做完之後怎麼確認

1. 開遊戲 → 應該會看到登入畫面
2. 按「使用 Google 帳號登入」→ 跳出 Google 選帳號的視窗
3. 選完帳號 → 視窗自動關閉 → 回到遊戲，右上角顯示你的名字
4. 玩一關，然後換一個瀏覽器（或無痕視窗）登入同一個帳號 → 進度應該接得回來

如果卡住，先看瀏覽器 console 有沒有錯誤訊息，常見的兩個原因是：
- 重新導向 URI 打錯字（步驟一第 3 點）
- 網站網址沒加進 Redirect URLs（步驟三）

---

## 遊戲這邊的行為

- **沒登入也能玩**：登入畫面有「先不登入，直接開始」，進度存在這台裝置。
  選過一次之後就不會再擋你，除非你在設定頁登出。
- **登入後**：每次存檔會在 2.5 秒後自動上傳一次（不會每按一下就打資料庫）。
- **兩邊進度不一樣時**：不會偷偷覆蓋。會跳出視窗列出雲端與本機各自的
  「幾關已通過／幾記憶碎片／幾則反思」，由玩家自己選。
- **設定頁**有「立刻同步」和「登出」。
- 遊戲常被別的網站用 iframe 嵌入，而 Google 不允許在 iframe 裡跑 OAuth，
  所以登入用的是**彈出視窗**，不是整頁跳轉。學生若被瀏覽器擋住彈出視窗，
  畫面會提示他們允許。
