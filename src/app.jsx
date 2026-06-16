import React from 'react';
import ReactDOM from 'react-dom/client';
import charConfig from './character-config';

const { useState, useEffect, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "followRange": 340,
  "smoothing": 0.3,
  "charSize": 64,
  "bgColor": "#FFF8EE",
  "showDebug": false
}/*EDITMODE-END*/;

const { rows: ROWS, cols: COLS } = charConfig;
const BG_OPTIONS = ['#FFF8EE', '#FDEFEF', '#EEF4FB', '#2B2926'];

function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v));
}

function frameSrc(r, c) {
  return charConfig.src(charConfig.defaultSheet, r, c);
}

function Placeholder({ dark, path }) {
  const stroke = dark ? 'rgba(255,248,238,0.62)' : 'rgba(60,48,38,0.46)';
  const fill = dark ? 'rgba(255,248,238,0.10)' : 'rgba(60,48,38,0.08)';
  const text = dark ? 'rgba(255,248,238,0.76)' : 'rgba(60,48,38,0.72)';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        color: text,
        fontFamily: "'Zen Maru Gothic', sans-serif",
        textAlign: 'center',
        pointerEvents: 'none'
      }}
    >
      <svg viewBox="0 0 1200 1200" width="100%" height="100%" aria-hidden="true">
        <circle cx="600" cy="450" r="190" fill={fill} stroke={stroke} strokeWidth="18" />
        <path d="M360 900c38-166 142-250 240-250s202 84 240 250" fill={fill} stroke={stroke} strokeWidth="18" strokeLinecap="round" />
        <circle cx="535" cy="430" r="18" fill={stroke} />
        <circle cx="665" cy="430" r="18" fill={stroke} />
        <path d="M548 520c34 24 70 24 104 0" fill="none" stroke={stroke} strokeWidth="14" strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', bottom: '12%', left: '8%', right: '8%' }}>
        <div style={{ fontSize: 'clamp(14px, 2vmin, 22px)', fontWeight: 700 }}>
          フレーム画像を配置してください
        </div>
        <div style={{ marginTop: 8, fontSize: 'clamp(11px, 1.5vmin, 15px)', opacity: 0.78, overflowWrap: 'anywhere' }}>
          {path}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [cell, setCell] = useState({ r: 2, c: 2 });
  const [pressed, setPressed] = useState(false);
  const [missingFrame, setMissingFrame] = useState(false);
  const charRef = useRef(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const tweaksRef = useRef(t);
  tweaksRef.current = t;

  useEffect(() => {
    function onMove(e) {
      const el = charRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height * 0.45;
      const range = tweaksRef.current.followRange;
      target.current.x = clamp((e.clientX - cx) / range, -1, 1);
      target.current.y = clamp((e.clientY - cy) / range, -1, 1);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
    };
  }, []);

  useEffect(() => {
    let raf;
    let last = { r: 2, c: 2 };
    function tick() {
      const k = tweaksRef.current.smoothing;
      current.current.x += (target.current.x - current.current.x) * k;
      current.current.y += (target.current.y - current.current.y) * k;
      const c = clamp(Math.round((current.current.x + 1) / 2 * (COLS - 1)), 0, COLS - 1);
      const r = clamp(Math.round((current.current.y + 1) / 2 * (ROWS - 1)), 0, ROWS - 1);
      if (r !== last.r || c !== last.c) {
        last = { r, c };
        setCell(last);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const src = frameSrc(cell.r, cell.c);
  const dark = t.bgColor === '#2B2926';
  const inkColor = dark ? 'rgba(255,248,238,0.85)' : 'rgba(60,48,38,0.8)';
  const subColor = dark ? 'rgba(255,248,238,0.45)' : 'rgba(60,48,38,0.45)';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: t.bgColor,
        overflow: 'hidden',
        transition: 'background 0.4s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        cursor: 'crosshair',
        fontFamily: "'Zen Maru Gothic', sans-serif"
      }}
    >
      <div
        ref={charRef}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        className="bob"
        style={{
          position: 'relative',
          width: `${t.charSize * 4 / 3}vmin`,
          height: `${t.charSize * 4 / 3}vmin`,
          maxWidth: 1200,
          maxHeight: 1200,
          transform: pressed ? 'scale(0.94)' : 'scale(1)',
          transition: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
          userSelect: 'none',
          touchAction: 'none'
        }}
      >
        {missingFrame ? <Placeholder dark={dark} path={src} /> : null}
        <img
          key={src}
          src={src}
          alt=""
          draggable="false"
          onLoad={() => setMissingFrame(false)}
          onError={() => setMissingFrame(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: missingFrame ? 0 : 1,
            pointerEvents: 'none'
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '4.5vh',
          left: 0,
          right: 0,
          textAlign: 'center',
          pointerEvents: 'none'
        }}
      >
        <div style={{ fontSize: 'clamp(18px, 2.4vmin, 26px)', fontWeight: 700, color: inkColor, letterSpacing: '0.18em' }}>
          ぐるぐるアバター
        </div>
        <div style={{ fontSize: 'clamp(12px, 1.6vmin, 16px)', color: subColor, marginTop: 6, letterSpacing: '0.08em' }}>
          マウスを動かすと向きが切り替わります
        </div>
      </div>

      {t.showDebug ? (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: 12,
            fontFamily: 'ui-monospace, monospace',
            pointerEvents: 'none',
            lineHeight: 1.5
          }}
        >
          <div>row {cell.r} / col {cell.c}</div>
          <div>{src}</div>
        </div>
      ) : null}

      <TweaksPanel>
        <TweakSection label="動き" />
        <TweakSlider
          label="追従範囲"
          value={t.followRange}
          min={120}
          max={1200}
          step={10}
          unit="px"
          onChange={(v) => setTweak('followRange', v)}
        />
        <TweakSlider
          label="追従速度"
          value={t.smoothing}
          min={0.04}
          max={0.5}
          step={0.01}
          onChange={(v) => setTweak('smoothing', v)}
        />
        <TweakSection label="見た目" />
        <TweakSlider
          label="キャラサイズ"
          value={t.charSize}
          min={30}
          max={92}
          unit="vmin"
          onChange={(v) => setTweak('charSize', v)}
        />
        <TweakColor
          label="背景色"
          value={t.bgColor}
          options={BG_OPTIONS}
          onChange={(v) => setTweak('bgColor', v)}
        />
        <TweakSection label="デバッグ" />
        <TweakToggle
          label="パス表示"
          value={t.showDebug}
          onChange={(v) => setTweak('showDebug', v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
