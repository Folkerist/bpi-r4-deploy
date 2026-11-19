// ─── Стили ───────────────────────────────────────────────────────────────────────────────────────────────────
const HP_CSS = `
:host { display:block; --r:24px; --gap:18px; font-family:"Onest","Manrope",system-ui,-apple-system,"Segoe UI",sans-serif;
  -webkit-font-smoothing:antialiased; font-feature-settings:"tnum" 1; }
.root { --bg:#070b12; --bg2:#0c1220; --card:rgba(255,255,255,.045); --card-hi:rgba(255,255,255,.075); --line:rgba(255,255,255,.08);
  --line2:rgba(255,255,255,.14); --text:#eef2f8; --sub:#8a94a7; --faint:#566074; --ring-bg:rgba(255,255,255,.08);
  --tile:rgba(255,255,255,.035); --tile-hi:rgba(255,255,255,.07); --shadow:0 20px 60px -30px rgba(0,0,0,.8);
  --amber:#fbbf24; --amber2:#f59e0b; --cyan:#38bdf8; --teal:#2dd4bf; --violet:#a78bfa; --pink:#f472b6; --green:#34d399;
  --red:#f87171; --orange:#fb923c; --blue:#60a5fa; --robot:#1a2231; --robot-top:#232d3f; --robot-line:rgba(255,255,255,.18);
  --plan-bg:transparent; --plan-room:rgba(255,255,255,.045); --plan-wall:rgba(255,255,255,.22); --plan-sub:rgba(255,255,255,.28);
  --plan-text:#dfe6f1; --plan-win:#60a5fa; --glass-blur:18px; --overlay:rgba(3,6,12,.62); --modal:#0d1422f2; }
.root.light { --bg:#f3efe7; --bg2:#fbf8f2; --card:rgba(255,255,255,.72); --card-hi:#fff; --line:rgba(30,35,50,.08);
  --line2:rgba(30,35,50,.14); --text:#1b2130; --sub:#6b7385; --faint:#a3a9b6; --ring-bg:rgba(30,35,50,.08);
  --tile:rgba(30,35,50,.035); --tile-hi:rgba(30,35,50,.06); --shadow:0 18px 50px -30px rgba(40,40,60,.45);
  --robot:#eef1f6; --robot-top:#fff; --robot-line:rgba(30,35,50,.2); --plan-room:rgba(30,35,50,.045); --plan-wall:rgba(30,35,50,.22);
  --plan-sub:rgba(30,35,50,.3); --plan-text:#2a3140; --plan-win:#3b82f6; --overlay:rgba(40,40,50,.35); --modal:#fbf9f5f5; }
* { box-sizing:border-box; }
button { font:inherit; color:inherit; border:0; background:none; cursor:pointer; -webkit-tap-highlight-color:transparent; }
ha-icon { --mdc-icon-size:22px; display:inline-flex; }
.root { position:relative; min-height:100vh; color:var(--text); background:var(--bg); overflow:hidden; overflow:clip; padding:22px 26px 34px; }
.root::before { content:""; position:absolute; inset:-20%; pointer-events:none; z-index:0;
  background: radial-gradient(900px 600px at 12% -5%, rgba(251,191,36,.10), transparent 60%),
    radial-gradient(800px 700px at 100% 0%, rgba(167,139,250,.10), transparent 60%),
    radial-gradient(1000px 800px at 50% 120%, rgba(56,189,248,.08), transparent 60%); animation: drift 40s ease-in-out infinite alternate; }
.root.light::before { background: radial-gradient(900px 600px at 10% -5%, rgba(251,191,36,.18), transparent 60%),
    radial-gradient(800px 700px at 100% 0%, rgba(167,139,250,.12), transparent 60%),
    radial-gradient(1000px 800px at 50% 120%, rgba(45,212,191,.12), transparent 60%); }
@keyframes drift { to { transform: translate3d(3%, 2%, 0) scale(1.05); } }
.wrap { position:relative; z-index:1; max-width:1880px; margin:0 auto; }

/* ─ Шапка ─ */
header { display:flex; align-items:center; gap:14px; margin-bottom:20px; flex-wrap:wrap; }
.greet { flex:1 1 320px; min-width:0; }
.greet h1 { margin:0; font-size:clamp(26px,2.6vw,40px); font-weight:800; letter-spacing:-.02em; line-height:1.05; }
.greet h1 span { background:linear-gradient(90deg,var(--amber),var(--pink) 60%,var(--violet)); -webkit-background-clip:text; background-clip:text; color:transparent; }
.greet .date { color:var(--sub); font-size:15px; margin-top:6px; }
.pill { display:flex; align-items:center; gap:10px; height:54px; padding:0 18px; border-radius:18px; background:var(--card);
  border:1px solid var(--line); backdrop-filter:blur(var(--glass-blur)); -webkit-backdrop-filter:blur(var(--glass-blur));
  white-space:nowrap; font-weight:600; font-size:15px; transition:transform .2s, background .2s; }
button.pill:hover { background:var(--card-hi); transform:translateY(-1px); }
.pill .muted { color:var(--sub); font-weight:500; }
.people { display:flex; }
.av { width:34px; height:34px; border-radius:50%; display:grid; place-items:center; font-weight:800; font-size:14px; margin-left:-8px;
  border:2px solid var(--bg); position:relative; color:#fff; }
.av:first-child { margin-left:0; }
.av.away { filter:grayscale(1); opacity:.45; }
.av ha-icon { --mdc-icon-size:17px; }
.av .batt { position:absolute; bottom:-5px; right:-6px; font-size:9px; font-weight:800; background:var(--bg2); color:var(--text);
  border:1px solid var(--line2); border-radius:8px; padding:0 3px; line-height:13px; }
.dot { width:9px; height:9px; border-radius:50%; background:var(--green); box-shadow:0 0 0 4px rgba(52,211,153,.18); }
.dot.warn { background:var(--amber); box-shadow:0 0 0 4px rgba(251,191,36,.18); }
.dot.bad { background:var(--red); box-shadow:0 0 0 4px rgba(248,113,113,.2); animation:pulse 1.6s infinite; }
@keyframes pulse { 50% { box-shadow:0 0 0 8px rgba(248,113,113,0); } }
.clock { font-size:clamp(36px,3.6vw,56px); font-weight:800; letter-spacing:-.03em; line-height:1; padding:0 6px; }
.clock .sec { color:var(--faint); font-size:.45em; margin-left:2px; vertical-align:top; }
.iconbtn { width:54px; height:54px; border-radius:18px; display:grid; place-items:center; background:var(--card); border:1px solid var(--line);
  backdrop-filter:blur(var(--glass-blur)); transition:transform .25s, background .2s; }
.iconbtn:hover { background:var(--card-hi); transform:rotate(15deg); }

/* ─ Страницы (листаются вбок) ─ */
.pnav { position:sticky; top:calc(var(--header-height, 0px) + 8px); z-index:6; display:grid; grid-template-columns:repeat(var(--n),minmax(0,1fr));
  padding:5px; margin:0 auto 18px; max-width:820px; border-radius:20px; background:var(--card); border:1px solid var(--line);
  backdrop-filter:blur(24px) saturate(1.4); -webkit-backdrop-filter:blur(24px) saturate(1.4); box-shadow:var(--shadow); }
.root:not(.light) .pnav { background:rgba(13,20,34,.78); } .root.light .pnav { background:rgba(251,248,242,.85); }
.pnav button { position:relative; z-index:1; height:46px; border-radius:15px; display:flex; align-items:center; justify-content:center; gap:8px;
  font-weight:700; font-size:14.5px; color:var(--sub); transition:color .25s; min-width:0; }
.pnav button span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pnav button ha-icon { --mdc-icon-size:20px; }
.pnav button.on { color:var(--text); } .pnav button.on ha-icon { color:var(--amber); }
.pnav .ind { position:absolute; top:5px; bottom:5px; left:5px; width:calc((100% - 10px) / var(--n)); border-radius:15px;
  background:var(--tile-hi); border:1px solid var(--line2); transform:translateX(calc(var(--x, 0) * 100%)); will-change:transform; }
.pages { --px:26px; display:flex; align-items:flex-start; overflow-x:auto; overflow-y:hidden; scroll-snap-type:x mandatory;
  overscroll-behavior-x:contain; scrollbar-width:none; margin:0 calc(-1 * var(--px)); scroll-margin-top:calc(var(--header-height, 0px) + 84px); }
.pages::-webkit-scrollbar { display:none; }
.page { flex:0 0 100%; min-width:0; scroll-snap-align:start; scroll-snap-stop:always; padding:0 var(--px) 30px;
  display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:var(--gap); align-items:start; }
.page.p-home { grid-template-columns:minmax(0,1.5fr) minmax(0,1fr); }
.page.p-flat { grid-template-columns:minmax(0,1.7fr) minmax(0,1fr); }
.page.p-music { grid-template-columns:minmax(0,1fr) minmax(0,1.5fr); }
.col { display:flex; flex-direction:column; gap:var(--gap); min-width:0; }
.hourly, .tabs { overscroll-behavior-x:contain; }
.card { min-width:0; position:relative; background:var(--card); border:1px solid var(--line); border-radius:var(--r); padding:20px;
  backdrop-filter:blur(var(--glass-blur)); -webkit-backdrop-filter:blur(var(--glass-blur)); box-shadow:var(--shadow);
  animation:rise .6s cubic-bezier(.2,.8,.2,1) both; }
.col:nth-child(2) .card { animation-delay:.06s }
@keyframes rise { from { opacity:0; transform:translateY(14px) scale(.99); } }
.card-h { display:flex; align-items:center; gap:10px; margin-bottom:14px; min-height:36px; }
.card-h h2 { margin:0; font-size:12.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--sub); font-weight:700; }
.card-h .meta { color:var(--sub); font-size:13.5px; margin-left:auto; text-align:right; }
.card-h .meta b { color:var(--text); font-weight:700; }
.card-h .go { width:36px; height:36px; border-radius:12px; display:grid; place-items:center; background:var(--tile-hi); border:1px solid var(--line);
  transition:background .2s, transform .2s; flex:none; }
.card-h .go:hover { transform:translateX(2px); background:var(--line2); }
.card-h .go ha-icon { --mdc-icon-size:18px; }
.accent-amber { color:var(--amber); } .accent-cyan { color:var(--cyan); } .accent-red { color:var(--red); } .accent-green { color:var(--green); }

/* ─ Хаб «Дом сейчас» ─ */
.hub { position:relative; height:330px; }
.hub svg.links { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
.hub .flow { fill:none; stroke-width:2.5; stroke-linecap:round; stroke-dasharray:4 9; opacity:.25; }
.hub .flow.on { opacity:1; animation:flow 1.1s linear infinite; }
@keyframes flow { to { stroke-dashoffset:-26; } }
.node { position:absolute; transform:translate(-50%,-50%); display:flex; flex-direction:column; align-items:center; gap:5px; text-align:center; }
.node .disc { width:78px; height:78px; border-radius:50%; display:grid; place-items:center; background:var(--bg2); border:2px solid var(--line2);
  position:relative; transition:box-shadow .4s, border-color .4s; }
.node .disc ha-icon { position:absolute; top:10px; --mdc-icon-size:17px; color:var(--sub); }
.node .disc b { font-size:21px; font-weight:800; margin-top:12px; }
.node .disc b small { font-size:12px; color:var(--sub); font-weight:600; }
.node .lbl { font-size:11px; letter-spacing:.12em; color:var(--sub); text-transform:uppercase; font-weight:700; }
.node .sub2 { font-size:12.5px; font-weight:600; max-width:120px; line-height:1.2; }
.node.center .disc { width:120px; height:120px; border:0; background:radial-gradient(circle at 50% 35%, var(--bg2), var(--bg)); }
.node.center .disc b { font-size:34px; margin-top:8px; letter-spacing:-.02em; }
.node.center .disc .ring { position:absolute; inset:-6px; }
.node.center .disc ha-icon { top:18px; }
.node.center .disc .cap { position:absolute; bottom:22px; font-size:10.5px; letter-spacing:.14em; color:var(--sub); font-weight:700; }
.node.glow-amber .disc { border-color:var(--amber); box-shadow:0 0 30px -6px rgba(251,191,36,.6); }
.node.glow-amber .disc ha-icon { color:var(--amber); }
.node.glow-cyan .disc { border-color:var(--cyan); box-shadow:0 0 30px -6px rgba(56,189,248,.55); }
.node.glow-cyan .disc ha-icon { color:var(--cyan); }
.node.glow-red .disc { border-color:var(--red); box-shadow:0 0 30px -4px rgba(248,113,113,.7); animation:pulse 1.6s infinite; }
.node.glow-teal .disc { border-color:var(--teal); }
.node.glow-teal .disc ha-icon { color:var(--teal); }
.stats { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:12px; }
.stat { background:var(--tile); border:1px solid var(--line); border-radius:16px; padding:10px 12px; min-width:0; }
.stat .k { white-space:nowrap; font-size:10.5px; letter-spacing:.12em; color:var(--sub); text-transform:uppercase; font-weight:700; }
.stat .v { font-size:19px; font-weight:800; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.stat .v small { font-size:12px; color:var(--sub); font-weight:600; }
.stat .s { font-size:12px; color:var(--sub); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* ─ Погода ─ */
.wx-now { display:flex; align-items:center; gap:14px; }
.wx-now .t { font-size:64px; font-weight:800; letter-spacing:-.04em; line-height:.9; }
.wx-now .t sup { font-size:.4em; vertical-align:top; position:relative; top:.25em; }
.wx-now .c { font-weight:700; font-size:17px; } .wx-now .l { color:var(--sub); font-size:13.5px; margin-top:3px; }
.wx-now .side { margin-left:auto; display:flex; flex-direction:column; gap:7px; align-items:flex-end; }
.chip { display:inline-flex; align-items:center; gap:6px; padding:6px 11px; border-radius:12px; background:var(--tile-hi); border:1px solid var(--line);
  font-size:13px; font-weight:600; white-space:nowrap; }
.chip ha-icon { --mdc-icon-size:15px; color:var(--sub); }
.hourly { display:flex; gap:8px; overflow-x:auto; margin:16px -4px 0; padding:0 4px 4px; scrollbar-width:none; }
.hourly::-webkit-scrollbar { display:none; }
.hr { flex:0 0 58px; display:flex; flex-direction:column; align-items:center; gap:2px; padding:8px 0; border-radius:14px; background:var(--tile); font-size:12.5px; }
.hr .h { color:var(--sub); font-weight:600; } .hr b { font-size:14.5px; } .hr .p { color:var(--blue); font-size:11px; font-weight:700; min-height:13px; }
.daily { display:grid; grid-template-columns:repeat(7,1fr); gap:6px; margin-top:10px; }
.dy { display:flex; flex-direction:column; align-items:center; gap:2px; padding:9px 2px; border-radius:14px; background:var(--tile); border:1px solid transparent; }
.dy.today { border-color:var(--line2); background:var(--tile-hi); }
.dy .d { font-size:12.5px; color:var(--sub); font-weight:700; } .dy b { font-size:15.5px; } .dy .lo { font-size:12px; color:var(--sub); }
.dy .p { font-size:10.5px; color:var(--blue); font-weight:700; min-height:12px; }
.root.light .wicon { filter:drop-shadow(0 1px 1.5px rgba(40,50,70,.35)); }
.wicon .w-rays { animation:spin 22s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
.wicon .w-cloud { animation:float 6s ease-in-out infinite; } .wicon .w-cloud2 { animation-duration:8s; animation-direction:reverse; }
@keyframes float { 50% { transform:translateX(1.5px); } }
.wicon .w-drop { animation:drop 1.1s linear infinite; } @keyframes drop { from { transform:translateY(-4px); opacity:0 } 30% { opacity:1 } to { transform:translateY(5px); opacity:0 } }
.wicon .w-flake { animation:flake 2.2s linear infinite; } @keyframes flake { from { transform:translateY(-4px); opacity:0 } 30% { opacity:1 } to { transform:translate(1px,5px); opacity:0 } }
.wicon .w-bolt { animation:bolt 2.4s steps(1) infinite; } @keyframes bolt { 0%,40%,48%,100% { opacity:1 } 44%,52% { opacity:.15 } }
.wicon .w-star { animation:tw 2.4s ease-in-out infinite; } @keyframes tw { 50% { opacity:.2 } }
.wicon .w-fog, .wicon .w-wind { animation:fog 3s ease-in-out infinite; } @keyframes fog { 50% { transform:translateX(3px); opacity:.6 } }

/* ─ Климат ─ */
.clim { display:flex; flex-direction:column; gap:8px; }
.crow { display:grid; grid-template-columns:34px 1fr auto 96px; align-items:center; gap:12px; padding:9px 10px; border-radius:16px; background:var(--tile);
  border:1px solid transparent; text-align:left; width:100%; transition:background .2s, border-color .2s; }
.crow:hover { background:var(--tile-hi); border-color:var(--line); }
.crow .ic { width:34px; height:34px; border-radius:11px; display:grid; place-items:center; background:var(--tile-hi); }
.crow .ic ha-icon { --mdc-icon-size:18px; }
.crow .n { font-weight:700; font-size:14.5px; } .crow .n small { display:block; color:var(--sub); font-weight:500; font-size:12px; margin-top:1px; }
.crow .tv { text-align:right; } .crow .tv b { font-size:19px; font-weight:800; } .crow .tv small { display:block; color:var(--sub); font-size:12px; }
.spark { width:96px; height:36px; display:block; }
.badge { display:inline-flex; align-items:center; font-size:10.5px; font-weight:800; letter-spacing:.04em; padding:2px 7px; border-radius:8px;
  background:rgba(52,211,153,.14); color:var(--green); }
.badge.warn { background:rgba(251,191,36,.16); color:var(--amber); } .badge.cold { background:rgba(96,165,250,.16); color:var(--blue); }
.badge.bad { background:rgba(248,113,113,.16); color:var(--red); }

/* ─ Быстрые действия ─ */
.qa { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
.qt { position:relative; display:flex; flex-direction:column; align-items:flex-start; gap:12px; min-height:128px; padding:16px; border-radius:20px;
  background:var(--tile); border:1px solid var(--line); text-align:left; overflow:hidden; transition:transform .25s cubic-bezier(.2,.8,.2,1), background .25s, border-color .25s, box-shadow .25s; }
.qt:hover { transform:translateY(-3px); background:var(--tile-hi); }
.qt:active { transform:scale(.97); }
.qt .qi { width:44px; height:44px; border-radius:14px; display:grid; place-items:center; background:var(--tile-hi); color:var(--sub); transition:all .3s; }
.qt .qn { font-weight:800; font-size:16px; line-height:1.15; } .qt .qs { color:var(--sub); font-size:13px; font-weight:600; margin-top:2px; }
.qt.on-amber { border-color:rgba(251,191,36,.55); background:linear-gradient(160deg,rgba(251,191,36,.16),rgba(251,191,36,.02)); box-shadow:0 10px 40px -18px rgba(251,191,36,.8); }
.qt.on-amber .qi { background:linear-gradient(135deg,#fde047,#f59e0b); color:#3b2600; box-shadow:0 6px 18px -4px rgba(245,158,11,.7); }
.qt.on-amber .qs { color:var(--amber); }
.qt.on-cyan { border-color:rgba(56,189,248,.5); background:linear-gradient(160deg,rgba(56,189,248,.16),rgba(56,189,248,.02)); box-shadow:0 10px 40px -18px rgba(56,189,248,.8); }
.qt.on-cyan .qi { background:linear-gradient(135deg,#67e8f9,#0ea5e9); color:#032033; } .qt.on-cyan .qs { color:var(--cyan); }
.qt.on-violet { border-color:rgba(167,139,250,.5); background:linear-gradient(160deg,rgba(167,139,250,.16),rgba(167,139,250,.02)); box-shadow:0 10px 40px -18px rgba(167,139,250,.8); }
.qt.on-violet .qi { background:linear-gradient(135deg,#c4b5fd,#8b5cf6); color:#1d0f3d; } .qt.on-violet .qs { color:var(--violet); }
.qt.on-pink { border-color:rgba(244,114,182,.5); background:linear-gradient(160deg,rgba(244,114,182,.16),rgba(244,114,182,.02)); box-shadow:0 10px 40px -18px rgba(244,114,182,.8); }
.qt.on-pink .qi { background:linear-gradient(135deg,#f9a8d4,#ec4899); color:#3b0521; } .qt.on-pink .qs { color:var(--pink); }
.qt.on-red { border-color:rgba(248,113,113,.6); background:linear-gradient(160deg,rgba(248,113,113,.2),rgba(248,113,113,.03)); }
.qt.on-red .qi { background:linear-gradient(135deg,#fca5a5,#ef4444); color:#3b0505; animation:pulse 1.6s infinite; } .qt.on-red .qs { color:var(--red); }
.qt.on-green .qi { background:linear-gradient(135deg,#6ee7b7,#10b981); color:#022c1d; }
.qt .corner { position:absolute; top:14px; right:14px; font-size:11px; font-weight:800; color:var(--sub); }

/* ─ Комнаты ─ */
.tabs { display:flex; gap:6px; padding:5px; border-radius:16px; background:var(--tile); border:1px solid var(--line); margin-bottom:14px; }
.tab { flex:1; height:42px; border-radius:12px; font-weight:700; font-size:14.5px; color:var(--sub); display:flex; align-items:center; justify-content:center; gap:8px; transition:all .25s; }
.tab.act { background:var(--card-hi); color:var(--text); box-shadow:0 4px 18px -8px rgba(0,0,0,.4); }
.tab .n { min-width:20px; height:20px; border-radius:10px; font-size:11.5px; display:grid; place-items:center; background:rgba(251,191,36,.22); color:var(--amber); padding:0 6px; }
.rooms { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
.rt { display:flex; align-items:center; gap:13px; padding:14px; border-radius:20px; background:var(--tile); border:1px solid var(--line); text-align:left;
  min-height:86px; transition:all .25s; position:relative; overflow:hidden; }
.rt:hover { background:var(--tile-hi); }
.rt .ri { width:46px; height:46px; border-radius:15px; display:grid; place-items:center; background:var(--tile-hi); flex:none; color:var(--sub); }
.rt .rn { font-weight:800; font-size:16px; } .rt .rs { color:var(--sub); font-size:13px; font-weight:600; margin-top:3px; line-height:1.45; }
.rt .rs ha-icon { vertical-align:-3px; }
.rt .rs .temp { font-weight:800; }
.rt .grow { flex:1; min-width:0; }
.rt .lb { width:46px; height:46px; border-radius:15px; display:grid; place-items:center; flex:none; background:var(--tile-hi); border:1px solid var(--line); color:var(--faint); transition:all .3s; }
.rt .lb:hover { transform:scale(1.06); }
.rt.lit { border-color:rgba(251,191,36,.5); background:linear-gradient(150deg,rgba(251,191,36,.14),rgba(251,191,36,.02)); }
.rt.lit .ri { color:var(--amber); background:rgba(251,191,36,.15); }
.rt.lit .lb { background:linear-gradient(135deg,#fde047,#f59e0b); color:#3b2600; border-color:transparent; box-shadow:0 8px 26px -6px rgba(245,158,11,.75); }
.rt .mv { position:absolute; top:12px; right:70px; width:8px; height:8px; border-radius:50%; background:var(--cyan); box-shadow:0 0 0 0 rgba(56,189,248,.6); animation:ping 1.6s infinite; }
@keyframes ping { 70% { box-shadow:0 0 0 9px rgba(56,189,248,0); } 100% { box-shadow:0 0 0 0 rgba(56,189,248,0); } }
.rt .warn { color:var(--amber); } .rt .warn ha-icon { --mdc-icon-size:15px; }
.rt .mus ha-icon { --mdc-icon-size:15px; color:var(--pink); }

/* ─ План ─ */
.plan-wrap { position:relative; }
.plan { width:100%; height:auto; display:block; }
.plan .room { fill:var(--plan-room); stroke:var(--plan-wall); stroke-width:3.5; stroke-linejoin:round; cursor:pointer; transition:fill .4s; }
.plan .room:hover { fill:var(--tile-hi); }
.plan .room.heat { stroke-width:3.5; }
.plan .lbl { fill:var(--plan-text); font-weight:700; pointer-events:none; }
.plan .lbl2 { fill:var(--plan-sub); font-weight:600; pointer-events:none; }
.plan .fx { fill:none; stroke:var(--plan-sub); stroke-width:1; pointer-events:none; }
.plan .win { stroke:var(--plan-win); stroke-width:3; stroke-linecap:round; }
.plan .gap { stroke:var(--bg2); stroke-width:5; }
.plan .light { fill:#fbbf24; fill-opacity:.32; stroke:#fbbf24; stroke-opacity:.7; stroke-width:2; pointer-events:none; animation:lampin .5s ease both; filter:url(#hpGlow); }
.plan .light-line { fill:none; stroke:#fcd34d; stroke-width:2; pointer-events:none; filter:url(#hpGlow); }
@keyframes lampin { from { opacity:0 } }
.plan .motion { fill:#38bdf8; fill-opacity:.12; stroke:#38bdf8; stroke-width:2.5; stroke-dasharray:8 4; pointer-events:none; animation:mot 1.6s ease-in-out infinite; }
@keyframes mot { 50% { opacity:.3 } }
.plan .vac { fill-opacity:.22; stroke-width:3; pointer-events:none; animation:mot 2s ease-in-out infinite; }
.plan .door { fill:#f87171; fill-opacity:.2; stroke:#f87171; stroke-width:2.5; pointer-events:none; animation:mot 1.2s ease-in-out infinite; }
.plan .spk { pointer-events:none; } .plan .spk .ring { fill:none; stroke:#f472b6; stroke-width:1.6; opacity:0; animation:spk 2.4s linear infinite; }
@keyframes spk { 0% { r:5; opacity:.9 } 100% { r:19; opacity:0 } }
.plan .spk .c { fill:var(--bg2); stroke:var(--plan-sub); stroke-width:1; } .plan .spk.on .c { fill:#f472b6; stroke:#f472b6; }
.plan .cam .fov { fill:#38bdf8; fill-opacity:.07; stroke:#38bdf8; stroke-opacity:.3; stroke-dasharray:3 3; }
.plan .cam.alert .fov { fill:#f87171; fill-opacity:.14; stroke:#f87171; stroke-opacity:.6; animation:mot 1s infinite; }
.plan .sel { fill:var(--violet); fill-opacity:.28; stroke:var(--violet); stroke-width:3; cursor:pointer; transition:fill-opacity .2s; }
.plan .zone { fill:transparent; stroke:transparent; stroke-width:3; cursor:pointer; }
.plan .zone:hover { fill:var(--violet); fill-opacity:.1; }
.legend { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
.lg { display:inline-flex; align-items:center; gap:7px; padding:6px 11px; border-radius:12px; font-size:12.5px; font-weight:700; background:var(--tile);
  border:1px solid var(--line); color:var(--sub); transition:all .2s; }
.lg i { width:10px; height:10px; border-radius:4px; }
.lg.act { color:var(--text); background:var(--tile-hi); border-color:var(--line2); }

/* ─ Пылесосы ─ */
.vacs { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.vc { display:flex; flex-direction:column; align-items:center; gap:8px; padding:16px 12px 14px; border-radius:20px; background:var(--tile); border:1px solid var(--line); text-align:center; }
.vc .vn { font-weight:800; font-size:16px; } .vc .vm { font-size:12px; color:var(--sub); margin-top:-6px; }
.vc .vs { font-size:13px; font-weight:700; } .vc .vs.act { color:var(--c); }
.vc .vb { display:flex; gap:6px; margin-top:4px; }
.vc .vb button { width:40px; height:40px; border-radius:13px; display:grid; place-items:center; background:var(--tile-hi); border:1px solid var(--line); transition:all .2s; }
.vc .vb button:hover { background:var(--c); color:#0b1020; border-color:transparent; }
.vc .vb ha-icon { --mdc-icon-size:19px; }
.vc.act { border-color:color-mix(in srgb, var(--c) 55%, transparent); background:linear-gradient(160deg, color-mix(in srgb, var(--c) 16%, transparent), transparent); }
.robot.is-active .robot-body { animation:wob 3s ease-in-out infinite; transform-origin:50px 50px; }
@keyframes wob { 25% { transform:rotate(8deg) } 75% { transform:rotate(-8deg) } }
.robot .lidar { animation:tw 1.2s infinite; }
.bar { height:6px; border-radius:3px; background:var(--ring-bg); overflow:hidden; width:100%; }
.bar i { display:block; height:100%; border-radius:3px; background:var(--c, var(--teal)); transition:width .6s; }
.bigbtn { display:flex; align-items:center; justify-content:center; gap:10px; width:100%; height:54px; border-radius:18px; margin-top:12px; font-weight:800; font-size:16px;
  background:linear-gradient(135deg,#a78bfa,#7c3aed); color:#fff; box-shadow:0 12px 34px -12px rgba(124,58,237,.9); transition:transform .2s, box-shadow .2s, opacity .2s; }
.bigbtn:hover { transform:translateY(-2px); box-shadow:0 16px 40px -12px rgba(124,58,237,1); }
.bigbtn:disabled { opacity:.4; transform:none; cursor:default; box-shadow:none; }
.bigbtn.ghost { background:var(--tile-hi); color:var(--text); box-shadow:none; border:1px solid var(--line); }

/* ─ Камера ─ */
.cam { position:relative; border-radius:18px; overflow:hidden; background:#000; aspect-ratio:16/9; cursor:pointer; }
.cam img { width:100%; height:100%; object-fit:cover; display:block; transition:opacity .4s; }
.cam .ov { position:absolute; left:12px; right:12px; top:12px; display:flex; gap:8px; align-items:center; }
.cam .tag { background:rgba(0,0,0,.55); color:#fff; backdrop-filter:blur(8px); border-radius:10px; padding:5px 10px; font-size:12.5px; font-weight:700; display:inline-flex; gap:6px; align-items:center; }
.cam .tag ha-icon { --mdc-icon-size:15px; }
.cam .tag.rec i { width:8px; height:8px; border-radius:50%; background:#ef4444; animation:tw 1s infinite; }
.cam .tag.alert { background:rgba(239,68,68,.85); }
.cam.alert { box-shadow:0 0 0 3px #ef4444, 0 0 40px -6px #ef4444; }
.cam .ts { position:absolute; right:12px; bottom:10px; color:#fff; font-size:12px; font-weight:600; text-shadow:0 1px 4px #000; }
.cam .noimg { position:absolute; inset:0; display:grid; place-items:center; color:#94a3b8; font-weight:600; }

/* ─ Музыка ─ */
.mus { display:flex; align-items:center; gap:18px; }
.disk { position:relative; width:118px; height:118px; flex:none; border-radius:50%; background:repeating-radial-gradient(circle, #111 0 2px, #1c1c24 2px 4px);
  display:grid; place-items:center; box-shadow:0 10px 40px -12px rgba(0,0,0,.8), inset 0 0 0 1px rgba(255,255,255,.06); }
.disk.spin { animation:spin 5s linear infinite; }
.disk .lab { width:50px; height:50px; border-radius:50%; background:linear-gradient(135deg,#f472b6,#8b5cf6); background-size:cover; background-position:center;
  box-shadow:0 0 0 3px #0b0b10; display:grid; place-items:center; color:#fff; }
.disk .lab ha-icon { --mdc-icon-size:22px; }
.mus .info { flex:1; min-width:0; }
.mus .tt { font-weight:800; font-size:18px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.mus .ar { color:var(--sub); font-size:13.5px; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.mus .src { display:inline-flex; align-items:center; gap:6px; margin-top:9px; padding:6px 11px; border-radius:12px; background:rgba(244,114,182,.12); color:var(--pink); font-weight:700; font-size:13px; }
.mus .src ha-icon { --mdc-icon-size:15px; }
.ctrls { display:flex; align-items:center; gap:10px; margin-top:12px; }
.ctrls button { width:44px; height:44px; border-radius:50%; display:grid; place-items:center; background:var(--tile-hi); border:1px solid var(--line); transition:transform .2s; }
.ctrls button:hover { transform:scale(1.08); }
.ctrls button.play { width:58px; height:58px; background:linear-gradient(135deg,#f0abfc,#a855f7); color:#fff; border:0; box-shadow:0 10px 30px -8px rgba(168,85,247,.9); }
.ctrls button.play ha-icon { --mdc-icon-size:28px; }
.vol { display:flex; align-items:center; gap:10px; margin-top:14px; color:var(--sub); }
input[type=range] { -webkit-appearance:none; appearance:none; flex:1; height:6px; border-radius:3px; background:var(--ring-bg); outline:none; cursor:pointer;
  background-image:linear-gradient(90deg,var(--rc,#f472b6),var(--rc,#f472b6)); background-size:var(--p,50%) 100%; background-repeat:no-repeat; }
input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:20px; height:20px; border-radius:50%; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,.4); border:3px solid var(--rc,#f472b6); }
input[type=range]::-moz-range-thumb { width:16px; height:16px; border-radius:50%; background:#fff; border:3px solid var(--rc,#f472b6); }
.stations { display:flex; gap:6px; flex-wrap:wrap; margin:0 0 18px; }
.where { color:var(--sub); font-size:12.5px; font-weight:700; margin:-4px 0 8px; }
.media .st { padding:9px 13px; font-size:14px; border-radius:13px; }
.ctrls button[disabled] { opacity:.35; cursor:default; transform:none; }
/* ─ Попросить Алису ─ */
.acats { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:6px; padding:5px; border-radius:18px; background:var(--tile); border:1px solid var(--line); margin-bottom:14px; }
.acats button { min-height:58px; border-radius:13px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; padding:6px 4px;
  font-size:13px; font-weight:700; color:var(--sub); transition:all .2s; text-align:center; line-height:1.1; }
.acats button ha-icon { --mdc-icon-size:22px; }
.acats button.on { background:var(--card-hi); color:var(--text); box-shadow:inset 0 0 0 2px var(--ac); } .acats button.on ha-icon { color:var(--ac); }
.acmds { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
.acmd { position:relative; display:flex; align-items:center; gap:12px; min-height:72px; padding:12px 14px; border-radius:18px; text-align:left;
  background:var(--tile); border:1px solid var(--line); transition:transform .15s, background .2s, border-color .2s; }
.acmd:hover { background:var(--tile-hi); border-color:var(--line2); } .acmd:active { transform:scale(.97); }
.acmd[disabled] { opacity:.4; cursor:default; }
.acmd .ai { flex:0 0 auto; width:46px; height:46px; border-radius:15px; display:grid; place-items:center; color:var(--ac);
  background:color-mix(in srgb, var(--ac) 16%, transparent); }
.acmd .ai ha-icon { --mdc-icon-size:24px; }
.acmd .at { min-width:0; display:flex; flex-direction:column; gap:3px; }
.acmd .at b { font-size:16px; font-weight:800; line-height:1.15; }
.acmd .at small { color:var(--sub); font-size:12.5px; font-weight:500; line-height:1.25; }
.acmd .plus { position:absolute; top:8px; right:10px; font-size:10px; font-weight:800; letter-spacing:.04em; color:var(--ac);
  background:color-mix(in srgb, var(--ac) 14%, transparent); border-radius:7px; padding:2px 6px; }
.ahint { display:flex; align-items:center; gap:8px; margin-top:14px; color:var(--sub); font-size:13px; line-height:1.35; }
.ahint ha-icon { --mdc-icon-size:18px; flex:0 0 auto; }
.st { display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:11px; background:var(--tile); border:1px solid var(--line); font-size:12.5px; font-weight:700; color:var(--sub); }
.st i { width:7px; height:7px; border-radius:50%; background:var(--faint); }
.st.play i { background:var(--pink); box-shadow:0 0 0 3px rgba(244,114,182,.25); } .st.sel { color:var(--text); border-color:var(--line2); background:var(--tile-hi); }

/* ─ Лента событий ─ */
.feed { display:flex; flex-direction:column; }
.ev { display:grid; grid-template-columns:34px 1fr auto; gap:11px; align-items:center; padding:8px 0; border-bottom:1px dashed var(--line); }
.ev:last-child { border-bottom:0; }
.ev .ei { width:34px; height:34px; border-radius:11px; display:grid; place-items:center; background:var(--tile-hi); }
.ev .ei ha-icon { --mdc-icon-size:17px; }
.ev .et { font-size:14px; font-weight:600; line-height:1.25; } .ev .et small { display:block; color:var(--sub); font-weight:500; font-size:12px; }
.ev .ew { color:var(--sub); font-size:12px; font-weight:600; white-space:nowrap; }
.empty { color:var(--sub); font-size:14px; padding:14px 0; text-align:center; }

/* ─ Здоровье устройств ─ */
.hl { display:flex; flex-direction:column; gap:7px; }
.hi { display:flex; align-items:center; gap:10px; font-size:13.5px; font-weight:600; padding:8px 10px; border-radius:13px; background:var(--tile); }
.hi ha-icon { --mdc-icon-size:18px; } .hi .grow { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hi .v { font-weight:800; } .hi.bad ha-icon, .hi.bad .v { color:var(--red); } .hi.warn ha-icon, .hi.warn .v { color:var(--amber); } .hi.ok ha-icon { color:var(--green); }

/* ─ Окна ─ */
.overlay { position:fixed; inset:0; z-index:50; background:var(--overlay); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
  display:flex; align-items:center; justify-content:center; padding:24px; animation:fade .25s ease both; }
@keyframes fade { from { opacity:0 } }
.modal { position:relative; width:min(1180px,100%); max-height:calc(100vh - 48px); overflow:auto; background:var(--modal); border:1px solid var(--line2);
  border-radius:30px; padding:26px; box-shadow:0 40px 120px -30px rgba(0,0,0,.8); animation:pop .35s cubic-bezier(.2,.9,.25,1.05) both; scrollbar-width:thin; }
.modal.sm { width:min(520px,100%); } .modal.md { width:min(820px,100%); }
@keyframes pop { from { opacity:0; transform:translateY(20px) scale(.97) } }
.mh { display:flex; align-items:center; gap:16px; margin-bottom:20px; }
.mh .mi { width:60px; height:60px; border-radius:20px; display:grid; place-items:center; color:#fff; flex:none; }
.mh .mi ha-icon { --mdc-icon-size:30px; }
.mh h3 { margin:0; font-size:28px; font-weight:800; letter-spacing:-.02em; } .mh .ms { color:var(--sub); font-size:14.5px; margin-top:3px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.mh .x { margin-left:auto; width:48px; height:48px; border-radius:16px; display:grid; place-items:center; background:var(--tile-hi); border:1px solid var(--line); flex:none; }
.mh .x:hover { background:var(--line2); }
.mcols { display:grid; grid-template-columns:1fr 1.15fr; gap:20px; }
.panel { background:var(--tile); border:1px solid var(--line); border-radius:22px; padding:18px; }
.panel + .panel { margin-top:14px; }
.ph { font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--sub); font-weight:700; margin:0 0 12px; display:flex; align-items:center; gap:8px; }
.ph .r { margin-left:auto; letter-spacing:0; text-transform:none; font-size:13px; }
.seg { display:flex; gap:6px; padding:5px; border-radius:16px; background:var(--tile); border:1px solid var(--line); }
.seg button { flex:1; min-height:48px; border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; font-size:13.5px; font-weight:700; color:var(--sub); transition:all .2s; padding:4px; }
.seg button ha-icon { --mdc-icon-size:20px; }
.seg button.act { background:var(--card-hi); color:var(--text); box-shadow:inset 0 0 0 2px var(--sc,var(--violet)); }
.chips { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
.zc { position:relative; display:flex; flex-direction:column; align-items:flex-start; gap:10px; padding:12px; border-radius:16px; background:var(--tile); border:1px solid var(--line); font-weight:700; font-size:13.5px; text-align:left; min-height:84px; transition:all .2s; }
.zc .zi { width:34px; height:34px; border-radius:11px; display:grid; place-items:center; background:var(--tile-hi); color:var(--sub); }
.zc .zi ha-icon { --mdc-icon-size:18px; }
.zc .ck { position:absolute; top:10px; right:10px; width:20px; height:20px; border-radius:50%; border:2px solid var(--line2); display:grid; place-items:center; }
.zc.act { border-color:var(--violet); background:linear-gradient(150deg,rgba(167,139,250,.2),rgba(167,139,250,.03)); }
.zc.act .zi { background:linear-gradient(135deg,#c4b5fd,#8b5cf6); color:#fff; } .zc.act .ck { background:var(--violet); border-color:var(--violet); color:#fff; }
.zc .ck ha-icon { --mdc-icon-size:14px; }
.rowbtns { display:flex; gap:8px; flex-wrap:wrap; }
.sbtn { display:inline-flex; align-items:center; gap:8px; height:42px; padding:0 15px; border-radius:13px; background:var(--tile-hi); border:1px solid var(--line); font-weight:700; font-size:14px; transition:all .2s; }
.sbtn:hover { background:var(--line2); } .sbtn ha-icon { --mdc-icon-size:18px; }
.sbtn.pri { background:linear-gradient(135deg,#a78bfa,#7c3aed); color:#fff; border:0; }
.sbtn.amber { background:linear-gradient(135deg,#fde047,#f59e0b); color:#3b2600; border:0; }
.sbtn.danger { color:var(--red); }
.parts { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px; }
.part { display:flex; align-items:center; gap:10px; padding:10px; border-radius:14px; background:var(--tile); }
.part .pr { flex:none; } .part b { display:block; font-size:15px; } .part small { color:var(--sub); font-size:12px; font-weight:600; }
.kv { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
.kv .stat .v { font-size:22px; }
.lights { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:12px; }
.lgrp { background:var(--tile); border:1px solid var(--line); border-radius:20px; padding:14px; }
.lgrp h4 { margin:0 0 10px; display:flex; align-items:center; gap:8px; font-size:15px; } .lgrp h4 ha-icon { --mdc-icon-size:18px; color:var(--sub); }
.lrow { display:flex; align-items:center; gap:10px; padding:8px 4px; }
.lrow .ln { flex:1; font-weight:600; font-size:14px; }
.tog { width:52px; height:30px; border-radius:15px; background:var(--ring-bg); position:relative; transition:background .25s; flex:none; }
.tog::after { content:""; position:absolute; top:3px; left:3px; width:24px; height:24px; border-radius:50%; background:#fff; box-shadow:0 2px 6px rgba(0,0,0,.35); transition:transform .25s cubic-bezier(.3,1.4,.5,1); }
.tog.on { background:linear-gradient(135deg,#fde047,#f59e0b); } .tog.on::after { transform:translateX(22px); }
.tog.on.cy { background:linear-gradient(135deg,#67e8f9,#0ea5e9); }
.lctl { display:flex; flex-direction:column; gap:8px; padding:0 4px 8px; }
.lctl label { display:flex; align-items:center; gap:10px; color:var(--sub); font-size:12.5px; font-weight:600; }
.lctl label ha-icon { --mdc-icon-size:17px; }
.swatches { display:flex; gap:8px; padding:4px; }
.sw { width:28px; height:28px; border-radius:50%; border:2px solid var(--line2); transition:transform .2s; } .sw:hover { transform:scale(1.15); }
.chart { width:100%; height:auto; display:block; }
.chart .ax { fill:var(--sub); font-size:11px; font-weight:600; }
.chart .gl { stroke:var(--line); stroke-dasharray:3 4; }
.cams { display:grid; grid-template-columns:1.7fr 1fr; gap:18px; }
.cam.big { aspect-ratio:16/9; cursor:default; }
.tts { display:flex; gap:8px; }
.tts input, .tts select { height:48px; border-radius:14px; border:1px solid var(--line2); background:var(--tile); color:var(--text); padding:0 14px; font:inherit; font-size:15px; outline:none; }
.tts input { flex:1; min-width:0; } .tts input:focus { border-color:var(--pink); }
.mrow { display:grid; grid-template-columns:42px 1fr auto; gap:12px; align-items:center; padding:12px; border-radius:18px; background:var(--tile); border:1px solid var(--line); }
.mrow + .mrow { margin-top:8px; }
.mrow .art { width:42px; height:42px; border-radius:12px; background:var(--tile-hi) center/cover; display:grid; place-items:center; color:var(--sub); }
.mrow .mt { font-weight:700; font-size:14.5px; } .mrow .mt small { display:block; color:var(--sub); font-size:12.5px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:320px; }
.mrow .mc { display:flex; gap:6px; align-items:center; }
.mrow .mc button { width:38px; height:38px; border-radius:12px; display:grid; place-items:center; background:var(--tile-hi); }
.mrow.play { border-color:rgba(244,114,182,.5); }
.mrow input[type=range] { grid-column:1/-1; }
.filters { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; }
.toast { position:fixed; left:50%; bottom:28px; transform:translateX(-50%); z-index:80; background:var(--modal); border:1px solid var(--line2); color:var(--text);
  border-radius:16px; padding:13px 18px; font-weight:700; font-size:14.5px; display:flex; gap:10px; align-items:center; box-shadow:0 20px 60px -20px rgba(0,0,0,.7);
  animation:toast 3.2s ease both; pointer-events:none; }
.toast ha-icon { color:var(--green); }
@keyframes toast { 0% { opacity:0; transform:translate(-50%,20px) } 10%,85% { opacity:1; transform:translate(-50%,0) } 100% { opacity:0; transform:translate(-50%,10px) } }
/* ─ Сценарии ─ */
.card.scenesc { padding:12px; }
.scenes { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.sc { position:relative; overflow:hidden; display:flex; flex-direction:column; align-items:flex-start; gap:4px; min-height:118px; padding:14px 16px;
  border-radius:20px; text-align:left; background:var(--tile); border:1px solid var(--line); transition:transform .15s, background .2s; }
.sc::before { content:""; position:absolute; inset:0; background:var(--g); opacity:.12; transition:opacity .25s; pointer-events:none; }
.sc:hover::before { opacity:.2; } .sc:active { transform:scale(.97); }
.sc .si { width:48px; height:48px; border-radius:16px; display:grid; place-items:center; background:var(--g); color:#fff; margin-bottom:6px;
  box-shadow:0 10px 24px -12px rgba(0,0,0,.6); }
.sc .si ha-icon { --mdc-icon-size:26px; }
.sc .sn { font-size:17px; font-weight:800; line-height:1.15; }
.sc .ss { font-size:13px; font-weight:600; color:var(--sub); line-height:1.25; }
.sc.warn .ss { color:var(--red); }
.sc.run .si { animation:pulse 1.4s infinite; }
.csteps { list-style:none; margin:0 0 20px; padding:0; display:flex; flex-direction:column; gap:8px; }
.csteps li { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:14px; background:var(--tile); font-size:15.5px; font-weight:600; line-height:1.3; }
.csteps li ha-icon { --mdc-icon-size:22px; color:var(--sub); flex:0 0 auto; }
.csteps li.warn { background:rgba(248,113,113,.12); color:var(--red); } .csteps li.warn ha-icon { color:var(--red); }
.confirm p { font-size:16px; color:var(--sub); margin:0 0 20px; line-height:1.5; }
.confirm .rowbtns { justify-content:flex-end; }

/* ─ Адаптив ─ */
/* ─ Лоток ─ */
.page.p-cat { grid-template-columns:minmax(0,1.15fr) minmax(0,1fr); }
.ldot { display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--green); margin-right:7px; box-shadow:0 0 0 3px rgba(52,211,153,.18); vertical-align:1px; }
.lbx { display:flex; align-items:center; gap:22px; }
.lart { flex:none; display:grid; place-items:center; }
.lsvg { display:block; overflow:visible; }
.lsvg .lring { transition:stroke-dasharray .6s; }
.lsvg.m-clean .lring { animation:lspin 1.6s linear infinite; transform-origin:80px 80px; }
.lsvg.m-clean .ldrum { animation:lspin 3.2s linear infinite; transform-origin:80px 76px; }
.lsvg.m-cat .lcat { animation:lpeek 2.4s ease-in-out infinite; transform-origin:80px 96px; }
.lsvg.m-bad .lring { animation:lblink 1.4s ease-in-out infinite; }
.lsvg.m-off { filter:grayscale(1); opacity:.55; }
.lsvg .lled { filter:drop-shadow(0 0 4px var(--c)); }
@keyframes lspin { to { transform:rotate(360deg); } }
@keyframes lpeek { 50% { transform:translateY(3px) scale(.97); } }
@keyframes lblink { 50% { opacity:.35; } }
.linfo { min-width:0; flex:1; }
.lst { font-size:clamp(24px,2.2vw,32px); font-weight:800; letter-spacing:-.02em; line-height:1.1; }
.lsub { color:var(--sub); font-size:15px; font-weight:600; margin-top:6px; min-height:20px; }
.lfacts { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
.lfacts span { display:inline-flex; align-items:center; gap:6px; padding:6px 11px; border-radius:12px; background:var(--tile); border:1px solid var(--line); font-size:13px; font-weight:600; color:var(--sub); }
.lfacts span b { color:var(--text); font-weight:800; }
.lfacts ha-icon { --mdc-icon-size:15px; }
.ltanks { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:18px; }
.lt { display:flex; flex-direction:column; gap:6px; padding:12px; border-radius:16px; background:var(--tile); border:1px solid var(--line); min-width:0; }
.lt .li { width:36px; height:36px; border-radius:12px; display:grid; place-items:center; background:rgba(52,211,153,.14); color:var(--green); }
.lt .li ha-icon { --mdc-icon-size:19px; }
.lt .ln { font-size:12.5px; color:var(--sub); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lt .lv { font-weight:800; font-size:15px; }
.lt.bad { border-color:rgba(248,113,113,.5); background:linear-gradient(160deg,rgba(248,113,113,.14),transparent); }
.lt.bad .li { background:linear-gradient(135deg,#fca5a5,#ef4444); color:#3b0505; animation:pulse 1.6s infinite; } .lt.bad .lv { color:var(--red); }
.lt.unk .li { background:var(--tile-hi); color:var(--faint); }
.lbtns { display:grid; grid-template-columns:1.4fr 1fr; gap:10px; }
.lbtns .bigbtn { margin-top:16px; }
.ldel { padding:16px; border-radius:20px; background:linear-gradient(160deg,rgba(56,189,248,.12),rgba(56,189,248,.02)); border:1px solid rgba(56,189,248,.35); transition:all .3s; }
.ldel.off { background:var(--tile); border-color:var(--line); }
.ldel.off .ldv b, .ldel.off .lpre { opacity:.45; }
.ldh { display:flex; align-items:center; gap:12px; }
.ldh > div:first-child { flex:1; min-width:0; }
.ldk { font-weight:800; font-size:16px; } .lds { color:var(--sub); font-size:13px; font-weight:600; margin-top:3px; }
.ldv { display:flex; align-items:center; gap:6px; }
.ldv b { min-width:74px; text-align:center; font-size:34px; font-weight:800; letter-spacing:-.03em; line-height:1; }
.ldv b small { font-size:13px; color:var(--sub); font-weight:700; margin-left:3px; letter-spacing:0; }
.ldv button { width:42px; height:42px; border-radius:14px; display:grid; place-items:center; background:var(--tile-hi); border:1px solid var(--line); transition:all .2s; }
.ldv button:hover:not([disabled]) { background:var(--cyan); color:#032033; border-color:transparent; }
.ldv button[disabled], .lpre button[disabled] { opacity:.35; cursor:default; }
.lpre { display:grid; grid-template-columns:repeat(7,1fr); gap:6px; margin-top:14px; }
.lpre button { height:38px; border-radius:12px; background:var(--tile-hi); border:1px solid var(--line); font-weight:800; font-size:14px; color:var(--sub); transition:all .2s; }
.lpre button.on { background:linear-gradient(135deg,#67e8f9,#0ea5e9); color:#032033; border-color:transparent; box-shadow:0 8px 22px -10px rgba(14,165,233,.9); }
.lsw { margin-top:10px; }
.lsw .lrow { padding:9px 4px; border-bottom:1px solid var(--line); }
.lsw .lrow:last-child { border-bottom:0; }
.lsw .lrow.na { opacity:.45; }
.lsw .ln small { display:block; color:var(--sub); font-size:12.5px; font-weight:500; margin-top:1px; }
.lri { width:38px; height:38px; flex:none; border-radius:12px; display:grid; place-items:center; background:var(--tile-hi); color:var(--sub); transition:all .3s; }
.lri ha-icon { --mdc-icon-size:19px; }
.lri.on { background:rgba(56,189,248,.16); color:var(--cyan); }
.tog[disabled] { opacity:.4; cursor:default; }
.lfw { display:flex; align-items:center; gap:8px; margin-top:12px; color:var(--faint); font-size:12.5px; font-weight:600; }
.lfw ha-icon { --mdc-icon-size:15px; }
.lstats { margin-top:0; }
.lstats .stat .v { font-size:22px; }
.lsec { display:flex; align-items:center; gap:10px; margin:18px 0 8px; font-size:11.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--sub); font-weight:700; }
.lsec span { margin-left:auto; display:flex; align-items:center; gap:6px; letter-spacing:0; text-transform:none; font-size:12px; font-weight:600; }
.lsec .lg-b { width:10px; height:10px; border-radius:3px; background:var(--amber); display:inline-block; }
.lsec .lg-w { width:14px; height:3px; border-radius:2px; background:var(--violet); display:inline-block; margin-left:8px; }
.ltlw { position:relative; height:44px; }
.ltl { width:100%; height:44px; display:block; }
.ltl .gl { stroke:var(--line2); stroke-width:1; vector-effect:non-scaling-stroke; }
.ltd { position:absolute; inset:0 8px; }
.ltd i { position:absolute; top:26px; transform:translate(-50%,-50%); border-radius:50%; background:var(--amber); opacity:.9;
  box-shadow:0 0 0 4px rgba(251,191,36,.18), 0 4px 14px -4px rgba(245,158,11,.9); }
.ltax { display:flex; justify-content:space-between; color:var(--faint); font-size:11.5px; font-weight:600; margin-top:2px; }
.lweek { display:grid; grid-template-columns:repeat(7,1fr); gap:8px; }
.lwd { display:flex; flex-direction:column; align-items:center; gap:6px; min-width:0; }
.lwd span { font-size:11.5px; color:var(--sub); font-weight:600; white-space:nowrap; }
.lwd.today span { color:var(--text); font-weight:800; }
.lwb { position:relative; width:100%; height:96px; border-radius:12px; background:var(--tile); border:1px solid var(--line); overflow:hidden; }
.lwb i { position:absolute; left:22%; right:22%; bottom:0; border-radius:8px 8px 0 0; background:linear-gradient(180deg,var(--amber),rgba(245,158,11,.35)); transition:height .6s; }
.lwd:not(.today) .lwb i { opacity:.55; }
.lwb s { position:absolute; left:10%; right:10%; height:3px; margin-bottom:-1.5px; border-radius:2px; background:var(--violet); box-shadow:0 0 10px var(--violet); }
.lwb em { position:absolute; top:6px; left:0; right:0; text-align:center; font-style:normal; font-weight:800; font-size:13px; }
.lfeed { max-height:none; }
@media (max-width:640px) { .lbx { gap:14px; } .lsvg { width:116px; height:116px; } .ltanks { gap:8px; } .lt { padding:10px; }
  .lpre { grid-template-columns:repeat(4,1fr); } .lstats { grid-template-columns:repeat(2,1fr); } .lwb { height:80px; } .lwd span { font-size:10.5px; }
  .ldv b { min-width:58px; font-size:28px; } .lds { display:none; } .ldk { font-size:15px; } .lt .ln { white-space:normal; line-height:1.2; } }
@media (max-width:1000px) { .root { padding:16px 14px 28px; } .pages { --px:14px; } .page, .page[class] { grid-template-columns:minmax(0,1fr); }
  .col { display:contents; } .pnav { margin-bottom:14px; }
  .mcols, .cams { grid-template-columns:1fr; } .chips { grid-template-columns:repeat(2,1fr); } }
@media (max-width:640px) { .root { padding-bottom:calc(96px + env(safe-area-inset-bottom, 0px)); }
  .pnav { position:fixed; top:auto; left:8px; right:8px; bottom:calc(8px + env(safe-area-inset-bottom, 0px)); z-index:20; margin:0; max-width:none; border-radius:22px; }
  .pnav button { flex-direction:column; gap:3px; height:58px; font-size:12px; } .pnav button ha-icon { --mdc-icon-size:24px; }
  .pages { scroll-margin-top:calc(var(--header-height, 0px) + 8px); }
  .toast { bottom:calc(96px + env(safe-area-inset-bottom, 0px)); }
  .acats { grid-template-columns:repeat(3,minmax(0,1fr)); }
  .scenes { gap:8px; } .sc { min-height:112px; padding:12px; } .sc .si { width:42px; height:42px; } .sc .sn { font-size:15px; } .sc .ss { font-size:12px; } .acmds { grid-template-columns:1fr; }
  .qa { grid-template-columns:repeat(2,1fr); } .qt { min-height:112px; } .rooms { grid-template-columns:1fr; }
  header { gap:8px; } .pill { height:46px; padding:0 12px; font-size:14px; } .pill .muted { display:none; } .qt .qn { font-size:15px; } .iconbtn { width:46px; height:46px; }
  .clock { order:-1; width:100%; font-size:44px; } .greet { flex-basis:100%; } .stats { grid-template-columns:repeat(2,1fr); }
  .overlay { padding:0; align-items:flex-end; } .modal { border-radius:28px 28px 0 0; max-height:92vh; padding:20px 16px; }
  .mh h3 { font-size:22px; } .mh .mi { width:50px; height:50px; } .daily { grid-template-columns:repeat(4,1fr); } .dy:nth-child(n+5) { display:none; }
  .crow { grid-template-columns:34px 1fr auto 70px; } .spark { width:70px; } .card { padding:16px; } .hub { height:320px; } }
@media (prefers-reduced-motion: reduce) { *, *::before { animation:none !important; transition:none !important; } }
`;
