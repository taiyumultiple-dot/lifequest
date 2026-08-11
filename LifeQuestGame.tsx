import { useRef, useState } from 'react';
import { Home, Maximize2 } from 'lucide-react';

/**
 * 五門・心靈迷宮（生命教育推理遊戲）
 *
 * 這一關是獨立製作的 HTML/CSS/JS 遊戲，整包放在 public/lifequest/，
 * 透過 iframe 載入，不需要額外的建置流程。
 * 作法和專案裡其他 public/games/*.html 的遊戲一樣。
 *
 * 路徑一定要用 import.meta.env.BASE_URL 開頭，
 * 這樣部署到 GitHub Pages 的子路徑（例如 /0811--/）時才不會 404。
 */
export default function LifeQuestGame({
  onHome,
}: {
  onHome?: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  const goFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  };

  return (
    <div ref={wrapRef} className="fixed inset-0 bg-[#070B14] flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-[#0B1220] border-b border-amber-300/20 shrink-0">
        <button
          onClick={onHome}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#121B2E] border border-amber-300/40 text-amber-200 text-xs font-black hover:bg-[#1B2740] transition-colors cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" /> 返回大廳
        </button>
        <div className="text-amber-200 text-xs font-black tracking-widest">
          五門・心靈迷宮
        </div>
        <button
          onClick={goFullscreen}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#121B2E] border border-amber-300/40 text-amber-200 text-xs font-black hover:bg-[#1B2740] transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" /> 沉浸全螢幕
        </button>
      </div>

      <div className="flex-1 min-h-0 relative">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-amber-200/70 text-sm">
            正在點亮迷宮的燈……
          </div>
        )}
        <iframe
          src={`${import.meta.env.BASE_URL}lifequest/index.html`}
          title="五門・心靈迷宮"
          className="w-full h-full border-0"
          allow="autoplay; fullscreen"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}
