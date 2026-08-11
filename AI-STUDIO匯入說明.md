# 把《五門・心靈迷宮》匯入 AI Studio 網站

你的 AI Studio 專案是 **React + Vite**，而且已經在用「獨立 HTML 遊戲放 `public/`、
React 用 iframe 包起來」的模式（`public/games/taigi-*.html` 那七個）。
這個遊戲正好是同一種形狀，**不需要改寫成 React**，直接照抄那個模式即可。

---

## 三個步驟

### 1. 把整個資料夾複製進去

把 `lifequest/` 這個資料夾整包複製到 AI Studio 專案的 `public/` 底下：

```
你的專案/
└── public/
    └── lifequest/          ← 整包放這裡
        ├── index.html
        ├── css/
        ├── js/
        ├── assets/
        ├── manifest.webmanifest
        └── sw.js
```

`tools/`、`README.md`、`LifeQuestGame.tsx`、本說明檔**不用**複製進 `public/`
（那些是開發用的，放進去只會增加部署體積）。

> Vite 會把 `public/` 底下的東西原封不動複製到 `dist/`，不經過打包，
> 所以純 HTML/JS 的遊戲放這裡最單純。

### 2. 加一個 React 包裝元件

把 `LifeQuestGame.tsx` 複製到 `src/components/games/`（或你放遊戲元件的地方）。

它就是一個上方有「返回大廳／沉浸全螢幕」、下面是 iframe 的殼，
寫法跟你現有的 `Game6FoodLab.tsx` 一模一樣，只是換成：

```tsx
src={`${import.meta.env.BASE_URL}lifequest/index.html`}
```

**路徑一定要用 `import.meta.env.BASE_URL` 開頭。**
你的 GitHub Pages 部署是 `npm run build -- --base=/0811--/`，
寫死 `/lifequest/index.html` 上線後會 404。

### 3. 在 App 裡掛上去

跟其他遊戲一樣用 lazy import 掛進路由／大廳：

```tsx
const LifeQuestGame = lazy(() => import('./components/games/LifeQuestGame'));

// ...在畫面切換的地方
{view === 'lifequest' && <LifeQuestGame onHome={() => setView('hub')} />}
```

再到遊戲大廳的清單裡加一張卡片指向它就完成了。

---

## 需要注意的幾件事

**體積**：整包約 6 MB（42 張場景圖 + 6 位角色立繪，都已經轉成 WebP 壓過）。
GitHub Pages 沒問題，但如果你的 repo 很在意大小，可以再刪掉用不到的場景圖
（改 `tools/art_manifest.json` 後重跑 `python tools/build_assets.py`）。

**Service Worker**：遊戲在 iframe 裡會**自動跳過**註冊（`js/pwa.js` 有判斷），
不會跟外層網站的快取打架。單獨開遊戲網址時才會啟用 PWA。

**存檔**：用 `localStorage`，鍵是 `lifequest_save_v1`。
在 iframe 裡跟外層是同一個網域，所以正常運作，也不會跟你其他遊戲的存檔衝突。

**音效**：iframe 要有 `allow="autoplay; fullscreen"`（包裝元件裡已經寫了）。
瀏覽器規定使用者要先點過畫面才會出聲，遊戲本身已經處理好。

**快取**：`index.html` 裡每個 `css/` 與 `js/` 的路徑後面都有 `?v=數字`。
之後你改了程式或內容，把那個數字全部 +1，學生重新整理就會拿到新版
（不改的話瀏覽器可能會一直用舊的快取）。

---

## 如果想把分數接回 React

你的專案有 `useGameScoreBridge`，是靠 iframe 用 `postMessage` 把分數送出去。
要接的話，在遊戲這邊（例如 `js/game/levelflow.js` 的結算處）加一行：

```js
if (window.parent !== window) {
  window.parent.postMessage(
    { type: 'game-score', game: 'lifequest', score: gain },
    '*'
  );
}
```

外層照你現有的 bridge 接收即可。不接也完全不影響遊戲運作。

---

## 另一個選擇：不放進去，單獨部署

如果不想讓 AI Studio 專案變大，也可以把 `lifequest/` 單獨丟 Netlify
（整包拖進去就好，沒有建置步驟），然後在 AI Studio 網站上放一個連結或 iframe 指過去。

差別：
- **放進 public/**：同一個網域、同一次部署，學生感覺是同一個網站；repo 大 6 MB。
- **單獨部署**：repo 乾淨、遊戲可以獨立更新與安裝成 PWA；但要多管一個網址。
