// RealHunt Score — content script. Runs only on the supported portals (see manifest host list).
(function () {
  const RHS = window.RHS;
  const A = RHS.adapterFor(location.hostname);
  if (!A || window.__rhsLoaded) return;
  window.__rhsLoaded = true;
  // v0.14.2: one live copy per page. When the extension is updated or reloaded, the old copy left in an open tab
  // ("orphan") stops itself and removes everything it drew; a newer copy also tells any older one to step aside.
  const RID = Date.now() + ":" + Math.random().toString(36).slice(2);
  let dead = false; const timers = new Set(), observers = new Set();
  const every = (fn, ms) => { const id = setInterval(() => { if (dead) return; if (!alive()) return destroy(); fn(); }, ms); timers.add(id); return id; };
  const alive = () => { try { return !!(chrome.runtime && chrome.runtime.id); } catch { return false; } };
  function destroy() {
    if (dead) return; dead = true;
    for (const id of timers) clearInterval(id); timers.clear();
    for (const o of observers) { try { o.disconnect(); } catch { /* gone */ } } observers.clear();
    for (const h of document.querySelectorAll('[data-rhs="' + RID + '"]')) h.remove();
    window.__rhsLoaded = false;
  }
  document.dispatchEvent(new CustomEvent("rhs:takeover", { detail: RID }));
  document.addEventListener("rhs:takeover", (e) => { if (e.detail !== RID) destroy(); });
  // anything still drawn by an older copy (it can't be stopped from here if it predates this check: it stops on reload)
  for (const h of document.querySelectorAll("[data-rhs]")) if (h.getAttribute("data-rhs") !== RID) h.remove();
  const T = (k, subs) => { try { const v = chrome.i18n.getMessage(k, subs); if (v) return v; } catch { destroy(); return ""; } return k; };
  const send = (msg) => new Promise((res) => { if (dead || !alive()) { destroy(); return res(null); } try { chrome.runtime.sendMessage(msg, (r) => { let e = null; try { e = chrome.runtime.lastError; } catch { /* gone */ } res(e ? null : r); }); } catch { destroy(); res(null); } });
  // v0.14: the market price per m² of each home's place (bundled reference in the background), attached as f._mref
  const MREF = new Map();
  const mkey = (f) => [f.city, f.area, f.province, f.addr, f.title, f.country, f.currency].map((x) => String(x || "").toLowerCase().trim()).join("|");
  async function attachMref(fs, urls) {
    const need = [], idx = [];
    fs.forEach((f, i) => { if (!f || f._mref !== undefined) return; const k = mkey(f); if (MREF.has(k)) { f._mref = MREF.get(k); return; } need.push({ city: f.city, area: f.area, province: f.province, addr: f.addr, title: f.title, country: f.country, currency: f.currency, url: (urls && urls[i]) || "" }); idx.push([i, k]); });
    if (!need.length) return 0;
    const out = (await send({ t: "mref", list: need })) || [];
    idx.forEach(([i, k], j) => { const v = out[j] || null; MREF.set(k, v); fs[i]._mref = v; if (v && !fs[i].country) fs[i].country = v.country; });
    return need.length;
  }

  const CSS = `
  :host{all:initial}
  .b{font:700 12px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border-radius:999px;color:#fff;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.18);margin:6px 0;user-select:none}
  .b small{font-weight:600;opacity:.85;font-size:10px}
  .c{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:320px;max-height:78vh;overflow:auto;background:#fff;color:#14181c;border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.28);font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  .h{display:flex;gap:12px;align-items:center;padding:14px 14px 10px}
  .s{width:58px;height:58px;border-radius:16px;display:grid;place-items:center;color:#fff;font:800 26px/1 system-ui}
  .t b{display:block;font-size:15px}.t small{color:#5b636b}
  .x{margin-left:auto;align-self:flex-start;border:0;background:none;font-size:18px;cursor:pointer;color:#8a9098}
  .p{padding:0 14px 6px}
  .r{margin:8px 0}.r .l{display:flex;justify-content:space-between;font-weight:700;font-size:13px}.r .bar{height:6px;border-radius:4px;background:#eef0f2;margin:4px 0}.r .bar i{display:block;height:100%;border-radius:4px}
  .r p{margin:0;color:#4f5a55;font-size:12.5px}
  .f{padding:10px 14px 14px;display:flex;gap:8px;flex-wrap:wrap}
  button.k{border:0;border-radius:10px;padding:9px 12px;font:700 13px system-ui;cursor:pointer;background:#0F6B34;color:#fff}
  button.k.s2{background:#eef0f2;color:#14181c}
  .n{font-size:11px;color:#8a9098;padding:0 14px 12px}
  .b i{font-style:normal;font-weight:800;font-size:10.5px;background:rgba(255,255,255,.22);border-radius:999px;padding:2px 5px}
  .s{flex-direction:column}
  .s small{display:block;font:800 11px/1 system-ui;opacity:.9;margin-top:3px;color:#fff}
  .v{padding:0 14px 8px;font-weight:700;font-size:13.5px;line-height:1.35}
  .mini{padding:0 14px 6px;display:grid;gap:5px}
  .mini .row{display:grid;grid-template-columns:128px 1fr 38px;gap:8px;align-items:center;font-size:12px;color:#4f5a55}
  .mini .bar{height:6px;border-radius:4px;background:#eef0f2}.mini .bar i{display:block;height:100%;border-radius:4px}
  .mini b{font-size:12px;color:#14181c;text-align:right}
  .pend{opacity:.55}
  .ai{font:800 9.5px/1 system-ui;background:#111;color:#fff;border-radius:6px;padding:3px 5px;vertical-align:2px;margin-left:4px}
  .free{display:inline-block;font:800 10px/1 system-ui;background:#FFE14D;color:#14181c;border-radius:6px;padding:3px 6px;letter-spacing:.04em}
  .nudge{margin:2px 14px 6px;padding:9px 11px;border-radius:12px;background:#14181c;color:#fff;font:700 12.5px/1.35 system-ui;cursor:pointer}
  .in{width:100%;box-sizing:border-box;margin-top:8px;padding:10px 11px;border:1px solid #cfd6d1;border-radius:10px;font:15px system-ui;background:#fff;color:#14181c}
  .ck{display:flex;gap:6px;align-items:flex-start;font-size:11.5px;color:#4f5a55;margin-top:7px}
  .fine{font-size:10.5px;color:#7a837e;margin-top:6px}.err{color:#C2412D;font-size:12px;margin-top:4px}
  .x+.x{margin-left:0}
  .pill{position:fixed;right:16px;bottom:16px;z-index:2147483646;display:flex;align-items:center;gap:8px;padding:8px 14px 8px 8px;border-radius:999px;color:#fff;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.25);font:700 12px/1 system-ui}
  .pill b{background:rgba(255,255,255,.22);border-radius:999px;padding:7px 9px;font:800 16px/1 system-ui}
  .fab{position:fixed;left:16px;bottom:16px;z-index:2147483645;display:flex;align-items:center;gap:8px;padding:10px 16px 10px 10px;border-radius:999px;background:#14181c;color:#fff;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.28);font:700 13px/1.1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  .fab b{background:#FFE14D;color:#14181c;border-radius:999px;width:28px;height:28px;display:grid;place-items:center;font:800 15px/1 system-ui}
  .fab small{display:block;font-weight:600;opacity:.7;font-size:11px;margin-top:2px}
  .rk{position:fixed;left:16px;top:16px;bottom:16px;z-index:2147483646;width:400px;max-width:calc(100vw - 32px);display:flex;flex-direction:column;background:#fff;color:#14181c;border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.3);font:13px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;overflow:hidden}
  .rk-h{padding:14px 14px 8px;border-bottom:1px solid #eef0f2}
  .rk-h .top{display:flex;align-items:center;gap:8px}.rk-h .top b{font-size:15px}
  .rk-h .st{color:#5b636b;font-size:12px;margin-top:4px}
  .rk-bar{height:4px;background:#eef0f2;border-radius:3px;margin-top:8px;overflow:hidden}.rk-bar i{display:block;height:100%;background:#0F6B34;transition:width .3s}
  .rk-bar.run i{background:linear-gradient(90deg,#0F6B34,#2E9E5B,#0F6B34);background-size:200% 100%;animation:rkm 1.2s linear infinite}
  @keyframes rkm{from{background-position:0 0}to{background-position:200% 0}}
  .rk-tools{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
  .rk-tools button{border:0;border-radius:999px;padding:6px 10px;font:700 12px system-ui;cursor:pointer;background:#eef0f2;color:#14181c}
  .rk-tools button.on{background:#14181c;color:#fff}
  .rk-l{overflow:auto;flex:1;padding:4px 0}
  .rk-filt{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;font-size:11px;color:#4f5a55;align-items:center}
  .rk-filt label{display:flex;gap:3px;align-items:center}.rk-filt input{width:62px;border:1px solid #cfd6d1;border-radius:6px;padding:3px 4px;font:12px system-ui}
  .rk-filt select{border:1px solid #cfd6d1;border-radius:6px;padding:3px 4px;font:12px system-ui;margin-left:auto}
  .cta.sm2{margin:8px 0 0;padding:9px 12px;font-size:13px}
  .rk-r{display:grid;grid-template-columns:26px 44px 1fr;gap:8px;align-items:center;padding:8px 14px;border-bottom:1px solid #f3f4f6;text-decoration:none;color:inherit}
  .rk-r:hover{background:#F4FAF5}
  .rk-r .n{color:#8a9098;font-weight:700;font-size:12px;padding:0;text-align:right}
  .rk-r .sc{width:44px;height:36px;border-radius:10px;display:grid;place-items:center;color:#fff;font:800 16px/1 system-ui}
  .rk-r .d{min-width:0}.rk-r .d b{font-size:13.5px}.rk-r .d span{display:block;color:#5b636b;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .rk-r .d .fx{color:#0F6B34;font-weight:700}
  .rk-r .d i{font-style:normal;font-weight:800;font-size:11px;padding:1px 5px;border-radius:6px;margin-left:4px}
  .rk-f{padding:8px 14px 12px;font-size:10.5px;color:#7a837e;border-top:1px solid #eef0f2}

  .c.v5{width:372px;display:flex;flex-direction:column;max-height:84vh;overflow:hidden}
  .v5 .h{cursor:grab;user-select:none}
  .v5 .body{overflow:auto;flex:1;padding-bottom:4px}
  .ld{height:3px;margin:0 14px;border-radius:2px;background:linear-gradient(90deg,#0F6B34,#2E9E5B,#FFE14D,#0F6B34);background-size:300% 100%;animation:rkm 1.4s linear infinite}
  .sum{margin:0 14px 8px;font-size:12.5px;color:#4f5a55}
  .blocks{display:grid;gap:8px;padding:0 12px}
  .blk{background:#F7F8F9;border-radius:14px;padding:10px 12px;position:relative;animation:fin .35s ease}
  @keyframes fin{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
  .blk h4{margin:0 0 6px;font:800 12.5px/1.2 system-ui;color:#14181c;display:flex;gap:6px;align-items:center}
  .blk h4 em{font-style:normal;font-weight:700;font-size:10px;background:#E8ECEA;border-radius:6px;padding:2px 5px;color:#4f5a55;margin-left:auto}
  .blk p{margin:4px 0 0;font-size:12.5px}.blk .mut,.mut{color:#6b746f;font-size:11.5px}
  .blk .big{font:800 22px/1.1 system-ui}
  .pos{color:#0F6B34}.neg{color:#C2412D}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:8px}.two small{display:block;color:#6b746f;font-size:11px}.two b{font:800 16px/1.2 system-ui}
  .calc{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;font-size:11px;color:#4f5a55}.calc input{width:46px;border:1px solid #cfd6d1;border-radius:6px;padding:3px 4px;font:12px system-ui;background:#fff;color:#14181c}
  .hist,.lk,.qs{margin:2px 0 0;padding-left:16px;font-size:12.5px}.hist{list-style:none;padding:0}.hist li{display:flex;gap:8px}.hist span{color:#6b746f;min-width:58px}
  .hist em,.lk em{font-style:normal;font-weight:800;font-size:11px}
  .lk li{margin:3px 0}.lk a{color:#0F6B34;font-weight:700;text-decoration:none}.lk small{color:#6b746f}
  .chips{display:flex;flex-wrap:wrap;gap:5px}.chips span{background:#fff;border-radius:999px;padding:3px 8px;font-size:11.5px}.chips span.off{opacity:.45}
  .k.sm{padding:6px 9px;font-size:12px;margin-top:6px}
  .sk i{display:block;height:10px;border-radius:5px;margin:6px 0;background:linear-gradient(90deg,#e9ecee,#f6f7f8,#e9ecee);background-size:200% 100%;animation:rkm 1.2s linear infinite}.sk i+i{width:60%}
  .blk.lock>*:not(h4){filter:blur(4px);pointer-events:none;user-select:none}
  .unlock{margin:8px 12px 0;padding:10px 12px;border-radius:12px;background:#14181c;color:#fff;font:700 12.5px/1.35 system-ui;cursor:pointer}
  .cta{display:block;margin:10px 12px 4px;padding:12px 14px;border-radius:14px;background:linear-gradient(135deg,#0F6B34,#2E9E5B);color:#fff;font:800 14px/1.25 system-ui;text-decoration:none;text-align:center;box-shadow:0 6px 16px rgba(15,107,52,.25)}
  .v5 .f{flex-wrap:nowrap;gap:6px;padding:8px 12px 10px}.v5 .f button.k{padding:8px 9px;font-size:12px;white-space:nowrap}.v5 .cta{margin:8px 12px 0}
  .det{margin:8px 12px 0}.det summary{cursor:pointer;font:700 12.5px system-ui;color:#4f5a55;padding:6px 2px}
  .onb{margin:0 12px 8px;padding:10px 12px;border-radius:12px;background:#FFF8D6;font-size:12px}.onb ol{margin:4px 0;padding-left:18px}

  .bar7{position:fixed;left:16px;bottom:16px;z-index:2147483645;display:flex;gap:6px;align-items:center;flex-wrap:wrap;max-width:calc(100vw - 32px);font:700 12.5px/1.1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  .bar7 .fab{position:static}
  .bar7 .chip{padding:6px 10px;font-size:12px;box-shadow:0 3px 12px rgba(0,0,0,.22)}.bar7 .chip b.y{background:#FFE14D;color:#14181c;border-radius:999px;width:20px;height:20px;display:grid;place-items:center;font:800 12px/1 system-ui}
  .bar7 .ext{display:none;gap:6px}.bar7.open .ext{display:flex}.bar7.open .more{background:#14181c;color:#fff}
  .chip{display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;background:#fff;color:#14181c;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.2);border:0;font:700 12.5px/1.1 system-ui}
  .chip.dk{background:#14181c;color:#fff}.chip.on{background:#FFE14D;color:#14181c}
  .chip i{font-style:normal;color:#fff;border-radius:8px;padding:3px 6px;font-weight:800}
  .chip.xx{padding:8px 10px;opacity:.85}
  .rk-tools button.go{background:#0F6B34;color:#fff}
  textarea.nt{width:100%;box-sizing:border-box;min-height:54px;border:1px solid #cfd6d1;border-radius:10px;padding:7px 9px;font:13px system-ui;background:#fff;color:#14181c;resize:vertical}
  .lk2{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.lk2 a,.lk2 button{border:0;border-radius:999px;padding:6px 10px;font:700 12px system-ui;background:#fff;color:#0F6B34;text-decoration:none;cursor:pointer}
  .lk2 button.on{background:#0F6B34;color:#fff}
  .seen{font-style:normal;font-size:10px;background:rgba(0,0,0,.25);border-radius:999px;padding:2px 5px}
  .gate{background:#F4FAF5;border:1px solid #D7EBDC;border-radius:12px;padding:10px;margin:8px 0;font-size:13px}

  .rk.rt{left:auto;right:16px}
  .dl7{margin-top:6px;padding:6px 8px;border-radius:10px;background:#EEF3FB;color:#1A3E73;font-size:12px;font-weight:700}.dl7 small{font-weight:500;color:#3d5170}.dl7.dn{background:#FFF4E5;color:#8A4B00}.dl7.dn small{color:#7a5a2d}.dl7.up{background:#E3F4E8;color:#0F6B34}
  .rk-h .plc{color:#14181c;font-weight:700;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
  .rk-tools .more{display:contents}.rk-tools .more[hidden]{display:none}
  .rk-h .top .sp{flex:1}
  .rk-h .top .ic{border:0;background:#eef0f2;color:#14181c;border-radius:8px;width:26px;height:26px;cursor:pointer;font:700 14px/1 system-ui;display:grid;place-items:center}
  .hist7{display:flex;align-items:flex-end;gap:3px;height:30px;margin-top:8px}
  .hist7 button{flex:1;border:0;background:transparent;padding:0;height:30px;display:flex;align-items:flex-end;cursor:pointer;border-radius:4px}
  .hist7 button i{display:block;width:100%;border-radius:3px 3px 1px 1px;opacity:.85;transition:opacity .2s}
  .hist7 button:hover i,.hist7 button.on i{opacity:1;outline:2px solid #14181c;outline-offset:1px}
  .bands{display:flex;gap:10px;font-size:11.5px;color:#5b636b;margin-top:4px}.bands b{color:#14181c}
  .rk-r{position:relative;grid-template-columns:26px 44px auto 1fr}
  .rk-r:not(:has(.th)){grid-template-columns:26px 44px 1fr}
  .rk-r .th{width:54px;height:44px;object-fit:cover;border-radius:8px;background:#eef0f2}
  .rk-r.sel,.rk-r.glow{background:#E8F0FE;box-shadow:inset 3px 0 0 #2F80ED}
  .rk-r.first .sc{animation:pulse7 1.8s ease-in-out infinite}
  .rk-r .sc{position:relative;font-size:15px}.rk-r .sc.pv{opacity:.86;box-shadow:inset 0 0 0 2px rgba(255,255,255,.45)}.rk-r .sc em{position:absolute;right:-5px;top:-6px;font-style:normal;font-size:10px;background:#fff;color:#14181c;border-radius:999px;padding:1px 3px;box-shadow:0 1px 3px rgba(0,0,0,.25)}
  .st.acc{color:#0F6B34;font-weight:600}
  @keyframes pulse7{0%,100%{box-shadow:0 0 0 0 rgba(233,184,12,.0)}50%{box-shadow:0 0 0 6px rgba(233,184,12,.45)}}
  .rk-r .pin{position:absolute;right:8px;top:8px;border:0;background:#fff;border-radius:8px;padding:3px 5px;cursor:pointer;opacity:0;box-shadow:0 1px 4px rgba(0,0,0,.15)}
  .rk-r:hover .pin,.rk-r.sel .pin{opacity:1}
  .rk-filt .clr{border:0;background:#FBE9E5;color:#C2412D;border-radius:6px;padding:3px 7px;cursor:pointer;font:700 12px system-ui}
  .empty{padding:24px 16px;text-align:center;color:#5b636b;font-size:13px;line-height:1.6}.empty button{margin-top:8px;border:0;border-radius:999px;padding:7px 12px;font:700 12px system-ui;cursor:pointer;background:#0F6B34;color:#fff}
  .kb{float:right;font-size:10.5px;color:#9aa1a8}
  .rkpill{position:fixed;left:16px;bottom:16px;z-index:2147483646;background:#14181c;color:#fff;border-radius:999px;padding:10px 14px;font:700 13px system-ui;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.35);display:flex;gap:6px;align-items:center}
  .rkpill.rt{left:auto;right:16px}.rkpill i{font-style:normal;color:#fff;border-radius:8px;padding:3px 6px}
  .toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483647;background:#14181c;color:#fff;border-radius:16px;padding:10px 14px 10px 10px;font:600 13.5px system-ui;display:flex;gap:10px;align-items:center;box-shadow:0 14px 40px rgba(0,0,0,.4);animation:tin .35s cubic-bezier(.2,1.4,.4,1)}
  .toast b{border-radius:10px;padding:6px 9px;font:800 16px system-ui}.toast.out{opacity:0;transform:translateX(-50%) translateY(10px);transition:all .35s}
  @keyframes tin{from{opacity:0;transform:translateX(-50%) translateY(18px) scale(.9)}to{opacity:1;transform:translateX(-50%)}}
  .b.hot{animation:hot7 2.2s ease-in-out infinite}@keyframes hot7{0%,100%{box-shadow:0 2px 8px rgba(0,0,0,.18)}50%{box-shadow:0 0 0 4px rgba(255,225,77,.6),0 2px 12px rgba(0,0,0,.25)}}
  @media (prefers-color-scheme: dark){.rk-h .plc{color:#e8ecea}.rk-h .top .ic{background:#2a3036;color:#e8ecea}.bands b{color:#e8ecea}.rk-r.sel,.rk-r.glow{background:#1d2a3d}.rk-r .pin{background:#2a3036}.hist7 button:hover i,.hist7 button.on i{outline-color:#e8ecea}}
  @media (prefers-color-scheme: dark){
    .c,.rk{background:#15191c;color:#e8ecea}.blk{background:#1f2428}.blk h4{color:#e8ecea}.blk h4 em{background:#2a3036;color:#b6bfba}
    .mut,.blk .mut,.two small,.hist span,.lk small,.r p,.mini .row,.n,.sum,.st{color:#9aa49f}.chips span{background:#2a3036}.calc input{background:#1f2428;color:#e8ecea;border-color:#3a4148}
    button.k.s2,.rk-tools button{background:#2a3036;color:#e8ecea}.mini .bar,.r .bar,.rk-bar{background:#2a3036}.rk-r:hover{background:#1f2428}.rk-h,.rk-f{border-color:#2a3036}.rk-r{border-color:#22272b}
    .gate{background:#1c2a22;border-color:#24402e}.chip{background:#1f2428;color:#e8ecea}textarea.nt{background:#1f2428;color:#e8ecea;border-color:#3a4148}.lk2 a,.lk2 button{background:#2a3036;color:#4fd18a}.onb{background:#3a3315}.in{background:#1f2428;color:#e8ecea;border-color:#3a4148}.pos{color:#4fd18a}.neg{color:#ff8a73}.rk-filt input,.rk-filt select{background:#1f2428;color:#e8ecea;border-color:#3a4148}
  }
  button:focus-visible,a:focus-visible,[tabindex]:focus-visible,summary:focus-visible,input:focus-visible{outline:3px solid #2F80ED;outline-offset:2px}
  .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .off7{margin:0 14px 8px;padding:6px 9px;border-radius:10px;background:#FFF4E5;color:#8A4B00;font-size:11.5px}
  @media (prefers-reduced-motion: reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
  `;
  const host = (tag = "span") => { const h = document.createElement(tag); h.setAttribute("data-rhs", RID); const sh = h.attachShadow({ mode: "open" }); const st = document.createElement("style"); st.textContent = CSS; sh.appendChild(st); return { h, sh }; };
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const SYM = { EUR: "€", GBP: "£", USD: "$", DKK: "kr", SEK: "kr", NOK: "kr", CHF: "CHF", PLN: "zł", CZK: "Kč", HUF: "Ft", JPY: "¥", INR: "₹", AUD: "A$", CAD: "C$", NZD: "NZ$", BRL: "R$", MXN: "MX$", AED: "AED", TRY: "₺", ILS: "₪", ZAR: "R", SGD: "S$", HKD: "HK$", THB: "฿", KRW: "₩" };
  const sym = (c) => SYM[c] || c || "€";
  let state = null, prefs = {};
  const dec = (x) => { try { return decodeURIComponent(x); } catch { return x; } };
  // v0.7: deciding "listing or results page" is costly on big pages: remember the answer per address for a moment
  const isDet = () => { const k = location.href; if (isDet.k === k && Date.now() - isDet.t < 3000) return isDet.v; isDet.k = k; isDet.t = Date.now(); try { isDet.v = !!A.isDetail(); } catch { isDet.v = false; } return isDet.v; };
  const tenOf = (f) => (f && f.tenure && f.tenure.k) || null;
  // what we send for a home's score (v0.10): the score, its fair price and the gap, so the best ones reach realhunt.co
  const scoreOf = (r, f) => (r ? { score: r.score, fair: r.fair ? Math.round(r.fair) : null, pct: r.pct, deep: !!f.deep, deal: f.deal || "sale", title: String(f.title || "").slice(0, 120) } : { deal: f.deal || "sale" });
  const ppOf = (f) => (f.price && f.sqm ? (f.deal === "rent" ? Math.round((f.price / f.sqm) * 100) / 100 : Math.round(f.price / f.sqm)) : null);
  const factsOf = (f) => ({ baths: f.baths || null, year: f.year || null, lot: f.lot || null, ptype: f.ptype || null, loc: f.loc || null, tax: f.tax || null, zest: f._zest || null });
  let recent = null; // homes opened before (urls), to mark them on search pages
  let recentFull = [];
  async function loadRecent() { if (recent) return recent; const r = (await send({ t: "seen" })) || []; recentFull = r; recent = new Set(r.map((x) => x.url)); return recent; }
  async function getState() { state = (await send({ t: "state" })) || { consent: false, quotaLeft: 3, profile: null, email: null }; return state; }

  // ---------------------------------------------------------------- search result pages: one badge per card
  const sent = new Set();
  let lastScan = [];
  // v0.9: your 👍/👎 by listing address, to mark homes on search pages and in rankings
  let taste = null;
  let notesRaw = {};
  async function loadTaste(force) { if (taste && !force) return taste; const n = (await send({ t: "notesAll" })) || {}; notesRaw = n; taste = new Map(); for (const k in n) if (n[k] && n[k].url && n[k].like) taste.set(keyOf(n[k].url), n[k].like); return taste; }
  // v0.10: your answers win; without them, what the homes you liked have in common (per sale or rent)
  const profileFor = (deal) => state.profile || RHS.learnTaste(notesRaw, deal || "sale") || null;
  const per = (f) => (f && f.deal === "rent" ? T("per_month") : "");
  const MP = (n, f) => RHS.money(n, f.currency) + per(f);
  async function scanCards() {
    if (dead) return;
    const cards = A.cards();
    if (!cards.length) { showFab(0); return; }
    await loadRecent(); await loadTaste();
    const pp = cards.map((c) => (c.f.price && c.f.sqm ? c.f.price / c.f.sqm : null)).filter(Boolean);
    const bench = RHS.median(pp);
    cards.forEach((c) => RHS.enrich(c.f));
    await attachMref(cards.map((c) => c.f), cards.map((c) => c.url));
    const RS = RHS.scoreGroup(cards.map((c) => c.f), { profile: profileFor(RHS.pageDeal), loc: null }); // v0.8: fair price per home from the whole page
    // Remember these homes (derived numbers only) so any listing opened later has comparables on day one.
    // v0.7: homes without m² travel too (price and bedrooms), so agency sites without sizes still build city tops.
    const items = [];
    for (const [ci, c] of cards.entries()) {
      let path = ""; try { path = new URL(c.url).pathname; } catch { continue; }
      if (sent.has(path)) continue; sent.add(path);
      if (c.f.status === "off" || c.f.status === "short") continue;
      items.push({ h: await RHS.hash(`${A.id}:${path}`), ...scoreOf(RS[ci], c.f), portal: A.id, pp: ppOf(c.f), cur: c.f.currency, rooms: c.f.rooms || null, ten: tenOf(c.f), ...factsOf(c.f),
        lat: c.f.lat ?? null, lng: c.f.lng ?? null, area: c.f.area || "", price: c.f.price, sqm: c.f.sqm, url: c.url.split("?")[0], country: c.f.country });
    }
    if (items.length || (bench && pp.length >= 5)) send({ t: "cards", portal: A.id, bench: pp.length >= 5 ? Math.round(bench) : null, n: pp.length, area: A.areaKey(), city: cityHint(null), items: items.filter((x) => x.pp || (x.price && x.rooms)) });
    lastScan = cards.map((c, ci) => ({ c, r: RS[ci], r0: RS[ci] }));
    // v0.12: homes you can see on the page always belong to the ranking of this same area
    if (rk && !rk.restored && !rk.moving && rk.src === location.href && addItems(cards.map((c) => ({ url: c.url, f: c.f })))) { rk.ver = (rk.ver || 0) + 1; renderRank(); }
    paintBadges();
    showFab(cards.length);
    if (!scanCards.tracked) { scanCards.tracked = true; send({ t: "track", kind: "badge", meta: { portal: A.id, n: cards.length } }); }
  }
  // v0.12: one score everywhere. When the whole area is ranked, every badge on the page shows the ranking's score
  // (same fair-price model, same homes) and its place in it: "#3 of 948".
  function paintBadges() {
    if (dead) return;
    const O = overlay();
    const P = rk && !rk.restored && rk.pos ? rk.pos : null;
    const medalOf = new Map(); [...lastScan].filter((x) => x.c.el && x.c.el.isConnected && (x.r || x.r0)).sort((a, b) => (b.r || b.r0).score - (a.r || a.r0).score).slice(0, 3).forEach((x, i) => { if ((x.r || x.r0).score >= 60) medalOf.set(x, ["🥇", "🥈", "🥉"][i]); });
    for (const x of lastScan) {
      const c = x.c; const p = P && P.get(keyOf(c.url));
      x.r = p ? p.r : x.r0; x.pos = p ? p.i : null; const deepX = p ? p.deep : !!c.f.deep;
      const r = x.r;
      if (!c.el || !c.el.isConnected) continue; // homes read from the page's data but not drawn yet get their badge when they appear
      // v0.11: nothing is ever inserted into the site's own page. Badges, frames and fading live in our own layer on
      // top of the page, so frameworks like React (Zillow, Idealista, Rightmove…) never see a foreign node and never break.
      let it = O.items.get(c.el);
      if (!it) {
        const w = document.createElement("div"); w.className = "ovi";
        const fr = document.createElement("div"); fr.className = "fr";
        O.layer.append(fr, w);
        it = { el: c.el, w, fr, sp: undefined };
        O.items.set(c.el, it);
        w.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); const u = it.url; if (e.ctrlKey || e.metaKey || e.shiftKey) window.open(u, "_blank", "noopener"); else location.assign(u); });
        w.addEventListener("auxclick", (e) => { if (e.button === 1) { e.preventDefault(); e.stopPropagation(); window.open(it.url, "_blank", "noopener"); } });
        w.addEventListener("mouseenter", () => rowGlow(keyOf(it.url), true));
        w.addEventListener("mouseleave", () => rowGlow(keyOf(it.url), false));
      }
      it.url = c.url; it.score = r.score;
      const seen = recent && recent.has(c.url.split("?")[0]);
      const like = taste && taste.get(keyOf(c.url));
      it.no = like === -1;
      const hot = r.score >= 85;
      // v0.14.1: small and readable — score, medal for the 3 best on the page, gap. Details live in the tooltip.
      const med = medalOf.get(x);
      const html = `<span class="b${hot ? " hot" : ""}" style="background:${RHS.color(r.score)}">${med || ""}${like === 1 ? "♥" : like === -1 ? "👎" : ""}<b class="n">${deepX ? "" : "≈"}${r.score}${r.check ? "⚠" : ""}</b><small>${x.pos ? `#${x.pos} · ` : ""}RealHunt</small>${r.pct != null && Math.abs(r.pct) >= 3 ? `<i>${r.pct < 0 ? "−" : "+"}${Math.abs(r.pct)}%</i>` : ""}${seen ? `<i class="seen" title="${esc(T("seen_before"))}">👁</i>` : ""}</span>`;
      if (it.html !== html) { it.w.innerHTML = html; it.html = html; }
      it.w.title = (x.pos ? T("badge_pos", [String(x.pos), String(P.size)]) + "\n" : "") + r.verdict + (r.fair ? "\n" + T("fair_short") + " ≈ " + RHS.money(RHS.nice(r.fair), c.f.currency) : "") + "\n\n" + r.parts.filter((p2) => p2.k !== "location").map((p2) => `${T("part_" + p2.k) || p2.label}: ${p2.pts}/${p2.max}`).join("\n") + "\n" + T("badge_hint") + "\n" + T("disclaimer");
    }
    paintPage();
  }
  // v0.12: hovering a home in the ranking lights up its card on the page, and the other way round
  function cardGlow(k, on) {
    if (!ov) return null; let hit = null;
    for (const x of lastScan) if (x.c.el && x.c.el.isConnected && keyOf(x.c.url) === k) { const it = ov.items.get(x.c.el); if (it) { it.glow = on; hit = x.c.el; } }
    ov.sched(); return hit;
  }
  function rowGlow(k, on) {
    const sh = rkEl && rkEl.shadowRoot; if (!sh) return;
    const row = sh.querySelector(`.rk-r[data-k="${CSS.escape(k)}"]`); if (!row) return;
    row.classList.toggle("glow", on); if (on) row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  // v0.7: the 3 best homes on the page get a gold, silver and bronze frame; "hide weak" fades homes under 50
  const MEDAL = ["#E9B80C", "#A7B1BA", "#C9824A"];
  function paintPage() {
    if (!ov) return;
    const vis = lastScan.filter((x) => x.c.el && x.c.el.isConnected);
    const top = [...vis].sort((a, b) => b.r.score - a.r.score).slice(0, 3);
    for (const x of vis) {
      const it = ov.items.get(x.c.el); if (!it) continue;
      const i = top.indexOf(x);
      it.medal = null; void i; // v0.14.1: no more coloured boxes around the site's cards; the medal is in the badge
      it.fade = it.no || (prefs.dim && x.r.score < 50);
    }
    ov.sched();
  }
  // ---------------------------------------------------------------- our own layer over the page (v0.11)
  let ov = null;
  function scrollParent(el) {
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(cs.overflowY + cs.overflowX) && (p.scrollHeight > p.clientHeight + 4 || p.scrollWidth > p.clientWidth + 4)) return p;
    }
    return null;
  }
  function overlay() {
    if (ov && ov.host.isConnected) return ov;
    const { h, sh } = host("div");
    h.style.cssText = "position:fixed!important;left:0!important;top:0!important;width:0!important;height:0!important;z-index:2147483640!important;pointer-events:none!important;display:block!important";
    const st = document.createElement("style");
    st.textContent = `.ovi{position:fixed;left:0;top:0;pointer-events:auto;will-change:transform;display:none}.ovi .b{margin:0;padding:4px 7px 4px 5px;gap:4px;font-size:11px;box-shadow:0 1px 4px rgba(0,0,0,.25)}.ovi .b .n{font:800 13px/1 system-ui;color:#fff;background:rgba(0,0,0,.18);border-radius:999px;padding:3px 6px}.ovi .b small{font-size:9.5px}.ovi .b i{font-size:10px;padding:2px 4px}.ovi:hover{z-index:2}
      .fr{position:fixed;left:0;top:0;pointer-events:none;border-radius:10px;box-sizing:border-box;display:none}
      .fr.m{border:3px solid var(--m)}.fr.g{border:3px solid #2F80ED;box-shadow:0 0 0 6px rgba(47,128,237,.25),0 0 30px rgba(47,128,237,.5);animation:gl 1s ease-in-out infinite alternate}@keyframes gl{from{box-shadow:0 0 0 3px rgba(47,128,237,.2)}to{box-shadow:0 0 0 9px rgba(47,128,237,.35),0 0 34px rgba(47,128,237,.55)}}.fr.f{background:rgba(255,255,255,.62)}@media (prefers-color-scheme: dark){.fr.f{background:rgba(20,24,28,.6)}}`;
    const layer = document.createElement("div"); sh.append(st, layer);
    document.documentElement.appendChild(h);
    const items = new Map();
    ov = { host: h, layer, items, raf: 0 };
    ov.sched = () => { if (!ov.raf) ov.raf = requestAnimationFrame(() => { ov.raf = 0; place(); }); };
    // v0.14.2: while the page scrolls we only move our badges (cheap); the "is it covered?" checks run once it stops
    const onScroll = () => { ov.lastScroll = Date.now(); ov.sched(); clearTimeout(ov.settle); ov.settle = setTimeout(ov.sched, 220); };
    addEventListener("scroll", onScroll, { capture: true, passive: true });
    addEventListener("resize", ov.sched, { passive: true });
    ov.timer = every(() => { if (!document.hidden) ov.sched(); }, 1000);
    return ov;
  }
  // v0.14.1: is a site popup open (filters, cookie banner, gallery, menu)? Then every floating bit of ours steps aside.
  function siteBusy() {
    const de = document.documentElement, b = document.body; if (!b) return false;
    const lock = (el) => { const cs = getComputedStyle(el); return cs.overflowY === "hidden" || cs.overflow === "hidden" || cs.position === "fixed"; };
    let dlg = false;
    for (const d of document.querySelectorAll('dialog[open],[role="dialog"],[aria-modal="true"],[role="alertdialog"]')) {
      if (d.closest("[data-rhs]")) continue; const r = d.getBoundingClientRect();
      if (r.width > 160 && r.height > 120 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(d).visibility !== "hidden" && +getComputedStyle(d).opacity !== 0) { dlg = true; break; }
    }
    const locked = lock(b) || lock(de);
    // some sites always lock the page and scroll an inner box: learn that once, while no popup is open
    if (siteBusy.base === undefined && !dlg) siteBusy.base = locked;
    return dlg || (locked && siteBusy.base === false);
  }
  function applyBusy() {
    if (dead) return;
    const busy = siteBusy();
    for (const h of [ov && ov.host, fab, card]) if (h) h.style.setProperty("visibility", busy ? "hidden" : "visible", "important");
    if (!busy && fab && fab.shadowRoot) dodge(fab.shadowRoot.querySelector(".bar7"));
    return busy;
  }
  // v0.14.1: our bottom bar moves up over the site's own sticky bottom bar (cookie bar, "save search", chat) instead of covering it
  function dodge(bar) {
    if (!bar) return;
    const H = innerHeight; let lift = 16;
    for (const x of [24, 140, 260]) {
      for (const n of document.elementsFromPoint(x, H - 30)) {
        if (n.closest && n.closest("[data-rhs]")) continue;
        let e = n, fixed = null; while (e && e !== document.body && e !== document.documentElement) { const ps = getComputedStyle(e).position; if (ps === "fixed" || ps === "sticky") { fixed = e; break; } e = e.parentElement; }
        if (fixed) { const r = fixed.getBoundingClientRect(); if (r.top > H * 0.45 && r.height < H * 0.5) lift = Math.max(lift, H - r.top + 10); }
        break;
      }
    }
    const v = lift + "px"; if (bar.style.bottom !== v) bar.style.bottom = v;
  }
  // the main photo of a card (the badge sits on it, never on the empty margin of the card)
  function anchorOf(el) {
    let best = null, ba = 0;
    for (const im of el.querySelectorAll("img, picture, video, [style*='background-image']")) {
      const r = im.getBoundingClientRect(); const a = r.width * r.height;
      if (r.width >= 110 && r.height >= 70 && a > ba) { ba = a; best = im; }
      if (ba > 60000) break;
    }
    return best;
  }
  const topAt = (x, y) => { if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return null; for (const n of document.elementsFromPoint(x, y)) { if (n.closest && n.closest("[data-rhs]")) continue; return n; } return null; };
  // is this point of the card really visible, or covered by the site's own header, popup or sticky bar?
  function visibleAt(el, x, y) {
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false;
    const list = document.elementsFromPoint(x, y);
    for (const n of list) { if (n.closest && n.closest("[data-rhs]")) continue; return n === el || el.contains(n) || n.contains(el); }
    return true;
  }
  function place() {
    if (dead) return;
    if (!ov) return;
    const W = innerWidth, H = innerHeight;
    const now = Date.now(), still = now - (ov.lastScroll || 0) > 200;
    if ((still || !ov.busyAt || now - ov.busyAt > 600) && (ov.busyAt = now, applyBusy())) return;
    // the site's fixed header: badges never slide over it while scrolling
    if (still && (!ov.hdrAt || now - ov.hdrAt > 1500)) { ov.hdrAt = now; let hb = 0; for (const x of [W * 0.3, W * 0.5, W * 0.8]) { let e = topAt(x, 6); while (e && e !== document.body && e !== document.documentElement) { const ps = getComputedStyle(e).position; if (ps === "fixed" || ps === "sticky") { const rr = e.getBoundingClientRect(); if (rr.top <= 8 && rr.height < H * 0.4) hb = Math.max(hb, rr.bottom); break; } e = e.parentElement; } } ov.hdr = hb; }
    for (const [el, it] of ov.items) {
      if (!el.isConnected) { it.w.remove(); it.fr.remove(); ov.items.delete(el); continue; }
      const r = el.getBoundingClientRect();
      if (it.sp === undefined) it.sp = scrollParent(el);
      let clip = { left: 0, top: 0, right: W, bottom: H };
      if (it.sp && it.sp.isConnected) { const s = it.sp.getBoundingClientRect(); clip = { left: Math.max(0, s.left), top: Math.max(0, s.top), right: Math.min(W, s.right), bottom: Math.min(H, s.bottom) }; }
      if (!it.an || !it.an.isConnected || !el.contains(it.an)) it.an = anchorOf(el) || null;
      const a = it.an ? it.an.getBoundingClientRect() : r;
      const bh = it.w.offsetHeight || 24, bw = it.w.offsetWidth || 120;
      // a free corner of the photo: not on the site's own labels, photo counter, heart or logo
      let bx = Math.max(r.left, a.left) + 8, by = it.an ? a.bottom - bh - 8 : r.top + 8;
      const inView = r.bottom > 0 && r.top < H && r.right > 0 && r.left < W;
      const check = inView && still && (!it.chk || it.chk < (ov.lastScroll || 0) || now - it.chk > 2500);
      if (it.an) {
        const L0 = Math.max(r.left, a.left) + 8, R0 = Math.min(r.right, a.right) - bw - 8;
        const cands = [[L0, a.bottom - bh - 8], [L0, a.top + 8], [R0, a.bottom - bh - 8], [R0, a.top + 8]];
        if (check || it.corner == null) {
          const free = (x, y) => { for (const [px, py] of [[x + 4, y + bh / 2], [x + bw - 4, y + bh / 2]]) { const top = topAt(px, py); if (top && top !== it.an && !top.contains(it.an)) return false; } return true; };
          const pick = it.corner != null && free(...cands[it.corner]) ? it.corner : cands.findIndex(([x, y]) => free(x, y));
          it.corner = pick >= 0 ? pick : 0;
        }
        [bx, by] = cands[it.corner];
      }
      let on = r.width > 40 && r.height > 30 && bx >= clip.left - 2 && by >= clip.top - 2 && bx + Math.min(bw, 80) < clip.right && by + bh < clip.bottom;
      // hidden when the site's header, a sticky bar or a popup covers that spot
      if (on && (check || it.vis === undefined)) { it.vis = visibleAt(el, bx + Math.min(bw, 90) / 2, by + bh / 2); it.chk = now; }
      if (on) on = it.vis !== false && by >= (ov.hdr || 0);
      if (on) { it.w.style.display = "block"; it.w.style.transform = `translate(${Math.round(bx)}px,${Math.round(by)}px)`; } else it.w.style.display = "none";
      const showFr = on && (it.fade || it.glow);
      if (showFr) {
        const L = Math.max(r.left, clip.left), T2 = Math.max(r.top, clip.top), R2 = Math.min(r.right, clip.right), B = Math.min(r.bottom, clip.bottom);
        Object.assign(it.fr.style, { display: "block", transform: `translate(${Math.round(L) - 2}px,${Math.round(T2) - 2}px)`, width: Math.max(0, R2 - L + 4) + "px", height: Math.max(0, B - T2 + 4) + "px" });
        it.fr.className = "fr" + (it.fade && !it.glow ? " f" : "") + (it.glow ? " g" : "");
      } else it.fr.style.display = "none";
    }
  }

  // v0.13: never a silent change. "In your ranking 84 → 79 now: ⚠ sold as-is (−4) · map and walk counted (+1)"
  function rankDeltaHtml(r, ri) {
    const d = r.score - ri.s;
    const bits = [];
    const newFl = (r.flags || []).filter((x) => !(ri.fl || []).includes(x.k));
    for (const x of newFl.slice(0, 2)) bits.push("⚠ " + x.label.toLowerCase() + (x.word ? ` (“${x.word.trim().slice(0, 30)}”)` : ""));
    const goneFl = (ri.fl || []).filter((k) => !(r.flags || []).some((x) => x.k === k));
    if (goneFl.length) bits.push("✓ " + T("delta_flag_gone"));
    if (ri.pts) {
      for (const p of r.parts) {
        const before = ri.pts[p.k]; if (p.k === "flags") continue;
        if (p.k === "location" && !p.na && r.checked.includes("location") && before != null && Math.abs(p.pts - before) >= 1) { bits.push(T("delta_location", [(p.pts - before > 0 ? "+" : "−") + Math.abs(Math.round(p.pts - before))])); continue; }
        if (before == null || p.na) continue; const dd = Math.round(p.pts - before); if (Math.abs(dd) < 2) continue;
        bits.push(`${T("part_" + p.k) || p.label} ${dd > 0 ? "+" : "−"}${Math.abs(dd)}`);
      }
    }
    const head = Math.abs(d) <= 1 ? T("delta_same", [String(ri.s), String(ri.pos), String(ri.n)]) : T("delta_moved", [String(ri.s), String(r.score), (d > 0 ? "+" : "−") + Math.abs(d), String(ri.pos), String(ri.n)]);
    return `<div class="dl7${d <= -5 ? " dn" : d >= 5 ? " up" : ""}" title="${esc(T("rank_vs_detail_tip"))}">⚡ ${esc(head)}${bits.length && Math.abs(d) > 1 ? `<br><small>${esc(bits.join(" · "))}</small>` : ""}</div>`;
  }
  // ---------------------------------------------------------------- listing pages: the smart card (v0.5)
  // Opens at once with the score, then fills block by block as data arrives: comparables, our server (history,
  // duplicates, city, better options), the map and the AI reading. Every block has a reason; nothing is invented.
  let card = null, cur = null;
  const cityHint = (f) => [f && (f.city || f.province || f.area), (document.querySelector("h1") || {}).textContent || "", dec(location.pathname)].filter(Boolean).join(" ").replace(/\s+/g, " ").slice(0, 200);
  // v0.14.3: closing the card (×) silences this website: no card and no bottom bar here again, on any page, until the
  // person clicks the RealHunt icon (opens the side panel) or presses Alt+Shift+R. The small scores on photos stay.
  const isMuted = () => (prefs.muted || []).includes(HOST);
  function muteSite(on) {
    const L = new Set(prefs.muted || []); on ? L.add(HOST) : L.delete(HOST); prefs.muted = [...L].slice(-300);
    send({ t: "pref", muted: prefs.muted });
    if (on) { if (card) { card.remove(); card = null; } if (fab) { fab.remove(); fab = null; } try { toast(esc(T("muted_site")), 5000); } catch { /* ignore */ } }
    else { cur = null; lastUrl = ""; if (started) run(); }
  }
  async function showDetail() {
    if (dead) return;
    if (isMuted()) { if (card) { card.remove(); card = null; } return; }
    // v0.14.3: single-page sites fill the listing in steps (and for a moment still show the previous page). Read it until
    // two reads in a row agree, so the score is never computed on half a page (it showed 25, then 70 a second later).
    let f = A.detail();
    if (!f) return;
    const u0 = location.href;
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 700));
      if (dead || location.href !== u0) return;
      const g = A.detail(); if (!g) break;
      const same = g.price === f.price && g.sqm === f.sqm && g.rooms === f.rooms && (g.desc || "").length <= (f.desc || "").length + 40;
      f = g; if (same) break;
    }
    RHS.enrich(f);
    await loadRecent();
    const prevSeen = recentFull.find((x) => x.url === location.href.split("?")[0] && x.price && f.price && Math.abs(x.price - f.price) / f.price > 0.005);
    if (f.flagsExtra) f.desc = (f.desc || "") + f.flagsExtra;
    prefs = (await send({ t: "prefs" })) || {};
    const url = location.href.split("?")[0];
    const hash = await RHS.hash(`${A.id}:${location.pathname}`);
    const comps = (await send({ t: "detail", f: { ...f, desc: undefined, _enriched: undefined }, hash, url: location.href })) || {};
    if (comps.mref && !f.country) f.country = comps.mref.country;
    // v0.14: the inputs of this home's score were frozen the first time they were complete: opening it again gives the same number
    const FZ0 = await send({ t: "frozen", hash }); const FZ = FZ0 && FZ0.v === 2 && FZ0.ctx ? FZ0 : null;
    let hasGeo = f.lat != null && f.lng != null;
    const canGeocode = !hasGeo && state.consent;
    // v0.8: a fair price for this exact home from the similar homes you have seen (size, bedrooms, bathrooms, type, area)
    let fairCtx = {};
    // v0.13: if this home is in your last ranking of this site, its fair price comes from exactly the same homes and the same
    // model as the ranking: then the only changes are what the full listing adds, and the card says which
    if (lastRank === undefined) lastRank = (await send({ t: "lastRank", host: HOST })) || null;
    const kSelf = keyOf(url);
    const LR = lastRank && lastRank.items && Date.now() - (lastRank.t || 0) < 4 * 864e5 ? lastRank.items : null;
    const inRank = LR ? LR.find((x) => keyOf(x.url) === kSelf) : null;
    let rows = comps.rows || [], rowsSrc = comps.near ? "near" : "page";
    // the ranking knew a few facts the listing page doesn't repeat (tax assessment, plot): keep them, same inputs = same price
    if (inRank) for (const k of ["tax", "lot", "_zest", "lat", "lng", "sqm", "rooms", "baths"]) if (f[k] == null && inRank.f[k] != null) f[k] = inRank.f[k];
    if (inRank) { const same = LR.filter((x) => x !== inRank && (x.f.deal || "sale") === (f.deal || "sale")).map((x) => ({ ...x.f, _enriched: false })); if (same.length >= 10) { rows = same; rowsSrc = "rank"; } }
    try { if (rows.length >= 10) { rows.forEach(RHS.enrich); const P = RHS.fairPredictor(rows); const p = P && P.predict({ ...f, deep: true }); if (p && p.fair > f.price / 4 && p.fair < f.price * 4) fairCtx = { fair: p.fair, fairN: P.n, fairSrc: rowsSrc === "rank" ? "page" : rowsSrc === "near" ? "near" : p.local ? "local" : "page", conf: Math.min(1, RHS.modelConf(P.M, p.local || rowsSrc === "near") + (p.zest ? 0.1 : 0)), u: p.u, zest: p.zest }; } } catch { /* fall back to the median */ }
    const me = (cur = { url, hash, f, comps, ins: state.consent ? undefined : null, priceChange: prevSeen ? { from: prevSeen.price, t: prevSeen.t } : null, ctx: FZ && FZ.ctx ? { ...FZ.ctx, mref: comps.mref || FZ.ctx.mref || null, profile: profileFor(f.deal), ai: null } : { profile: profileFor(f.deal), mref: comps.mref || null, bench: comps.bench, benchN: comps.n, benchSource: comps.source, benchKm: comps.km, official: comps.official, loc: hasGeo || canGeocode ? undefined : null, ai: null, ...fairCtx }, expanded: !!prefs.why && !!state.email, gate: null, open: !state.min && innerWidth >= 760 });
    send({ t: "note", hash }).then((n) => { me.note = n || {}; if (cur === me) renderCard(); });
    // v0.12.1/v0.13: the same home in your last ranking: its score there, and exactly what reading the listing changed
    if (inRank) {
      me.rankInfo = { s: inRank.s, pos: inRank.p, n: (inRank.f.deal === "rent" ? lastRank.nr : lastRank.n) || LR.length, pts: inRank.pts || null, fl: inRank.fl || [] };
      // and the other way round: the saved ranking keeps this fuller score (marked ✓)
      setTimeout(() => { if (!me.r || !lastRank || lastRank.items !== LR) return; inRank.s = me.r.score; inRank.f = { ...inRank.f, deep: true, year: f.year || inRank.f.year, hoa: f.hoa || inRank.f.hoa, sub: f.sub || inRank.f.sub, desc: String(f.desc || "").slice(0, 1200) }; send({ t: "lastRank", save: lastRank }); }, 12000);
    }
    // v0.13: the ranking is open in this same tab (Zillow opens homes over the search): update its row right away
    if (rk && rk.items && rk.items.get(kSelf)) { const it = rk.items.get(kSelf); setTimeout(() => { if (!rk || rk.items.get(kSelf) !== it) return; RHS.mergeDeep(it.f, { ...f, structured: true }, ""); rk.ver = (rk.ver || 0) + 1; renderRank(true); }, 1500); }
    const rescore = () => { if (cur !== me) return; me.r = RHS.score(f, me.ctx); renderCard(); };
    me.ready = !!FZ; // a frozen home already has its final inputs
    setTimeout(() => { if (cur === me && !me.ready) { me.ready = true; rescore(); } }, 4000);
    rescore();
    const q = await send({ t: "useReport", hash }); // the first full report of the day is free; after that, with a free email
    me.allowed = !!(q && q.allowed); state.quotaLeft = q ? q.quotaLeft : state.quotaLeft;
    const jobs = [];
    // v0.9: no map point on the page -> find the address on the map (OpenStreetMap through our server, cached)
    if (canGeocode) {
      const place = [f.addr || (/\d/.test(f.title || "") ? f.title : ""), f.city || f.area, f.zip, countryName(f.country || RHS.siteCountry(location.hostname))].filter(Boolean).join(", ");
      const g = place.length > 6 ? await send({ t: "geocode", q: place }) : null;
      if (cur !== me) return;
      if (g && g.lat != null) { f.lat = g.lat; f.lng = g.lng; hasGeo = true; if (!FZ) me.ctx.geoApprox = (g.rank || 0) < 30; } else if (!FZ) { me.ctx.loc = null; rescore(); }
    }
    if (hasGeo && !FZ) jobs.push(send({ t: "nearby", lat: f.lat, lng: f.lng }).then((loc) => { me.ctx.loc = loc || null; rescore(); }));
    if (state.consent) jobs.push(send({ t: "insights", p: { hash, lat: f.lat, lng: f.lng, price: f.price, sqm: f.sqm, rooms: f.rooms, currency: f.currency, country: f.country, city: cityHint(f), area: f.area, url, portal: A.id, deal: f.deal || "sale" } }).then((ins) => {
      me.ins = ins || null;
      if (FZ) return; // frozen: what the server says now is shown in the report, the score keeps its first inputs
      // v0.9: the neighbourhood against the city, and the distance to the centre
      if (ins && ins.near && ins.city && ins.city.median) me.ctx.areaIdx = ins.near.median / ins.city.median;
      if (ins && ins.city && ins.city.lat != null && f.lat != null) { me.ctx.centreKm = RHS.km(f.lat, f.lng, ins.city.lat, ins.city.lng); me.ctx.cityName = ins.city.name; }
      const b = RHS.bestBench(comps, ins);
      if (b) Object.assign(me.ctx, { bench: b.bench, benchN: b.n, benchSource: b.source, benchKm: b.km });
      // the server's nearby median is only used when our fair-price model has too few homes
      if (me.ctx.fair && ins && ins.near && ins.near.n >= 25 && (me.ctx.fairN || 0) < 15) delete me.ctx.fair;
      rescore();
    }));
    if (state.consent && (f.desc || "").length > 60) jobs.push(send({ t: "analyze", hash, text: f.desc, lang: RHS.lang }).then((ai) => { me.aiDone = true; if (ai) me.ctx.ai = ai; rescore(); }));
    const report = (first) => { const r = me.r; send({ t: "report", report: { first, hash, url, portal: A.id, deal: f.deal || "sale", fair: r.fair ? Math.round(r.fair) : null, pct: r.pct, title: String(f.title || "").slice(0, 120), baths: f.baths || null, price: f.price, currency: f.currency, sqm: f.sqm, rooms: f.rooms, area: f.area, country: f.country, ptype: f.ptype, days: f.days, city: cityHint(f),
      lat: f.lat, lng: f.lng, score: r.score, grade: RHS.grade(r.score), verdict: r.verdict, parts: r.parts, flags: r.flags.map((x) => x.label), plus: r.plus.map((x) => x.label), ppsqm: r.ppsqm, ai: r.ai, final: !r.pending } }); };
    report(true);
    send({ t: "seen", add: { url, hash, portal: A.id, price: f.price, cur: f.currency, sqm: f.sqm, rooms: f.rooms, score: me.r.score, title: (f.title || document.title || "").slice(0, 90) } });
    await Promise.all(jobs);
    if (cur !== me) return;
    if (!me.ready) { me.ready = true; rescore(); }
    if (!FZ && me.r && !me.r.pending) { const c = me.ctx; send({ t: "frozen", hash, save: { v: 2, ctx: { mref: c.mref || null, fair: c.fair || null, fairN: c.fairN || null, fairSrc: c.fairSrc || null, conf: c.conf || null, u: c.u || null, zest: c.zest || null,
      bench: c.bench || null, benchN: c.benchN || null, benchSource: c.benchSource || null, benchKm: c.benchKm || null, official: c.official || null, loc: c.loc === undefined ? null : c.loc, areaIdx: c.areaIdx || null, centreKm: c.centreKm ?? null, cityName: c.cityName || null, geoApprox: !!c.geoApprox } } }); }
    report();
  }

  const countryName = (cc) => ({ ES: "Spain", PT: "Portugal", IT: "Italy", FR: "France", DE: "Germany", GB: "United Kingdom", US: "USA", DK: "Denmark", SE: "Sweden", NO: "Norway", NL: "Netherlands", BE: "Belgium", AT: "Austria", CH: "Switzerland", IE: "Ireland", ID: "Indonesia", TH: "Thailand", MX: "Mexico", CA: "Canada", AU: "Australia", GR: "Greece", HR: "Croatia", CY: "Cyprus", MT: "Malta", TR: "Turkey", PL: "Poland", AE: "UAE" })[cc] || "";
  const FREE = { es: "GRATIS", da: "GRATIS", de: "GRATIS", it: "GRATIS", pt: "GRÁTIS", fr: "GRATUIT", nl: "GRATIS", sv: "GRATIS", nb: "GRATIS" }[RHS.lang] || "FREE";
  function gateHtml(g) {
    if (g.step === "code") return `<div class="gate"><b>${esc(T("code_title"))}</b><br><span>${esc(T("code_sent", [g.email]))}</span>
      <input class="in" id="rh-code" inputmode="numeric" maxlength="6" placeholder="123456" autocomplete="one-time-code">
      <button class="k" data-a="code" style="margin-top:6px">${esc(T("code_cta"))}</button> <button class="k s2" data-a="back" style="margin-top:6px">${esc(T("change_email"))}</button>
      <div class="err">${esc(g.err || "")}</div></div>`;
    return `<div class="gate"><span class="free">${FREE}</span> <b>${esc(T("unlock_title"))}</b><br><span>${esc(T("unlock_body"))}</span>
      <input class="in" id="rh-email" type="email" placeholder="you@email.com" autocomplete="email" value="${esc(g.email || "")}">
      <label class="ck"><input type="checkbox" id="rh-mk" ${g.mk ? "checked" : ""}> ${esc(T("marketing_ok"))}</label>
      <button class="k" data-a="email" style="margin-top:6px;width:100%">${esc(T("unlock_cta"))}</button>
      <div class="fine">${esc(T("unlock_fine"))}</div><div class="err">${esc(g.err || "")}</div></div>`;
  }
  const M = (n, c) => RHS.money(n, c);
  const skel = `<div class="sk"><i></i><i></i></div>`;
  function blk(id, title, body, opt = {}) {
    return `<section class="blk${opt.lock ? " lock" : ""}${opt.wide ? " wide" : ""}" data-b="${id}"><h4>${opt.icon || ""} ${esc(title)}${opt.badge ? ` <em>${esc(opt.badge)}</em>` : ""}</h4>${body}</section>`;
  }

  function blocksHtml(me) {
    const { f, r, ins } = me; const cc = f.country || RHS.siteCountry(location.hostname) || RHS.ccFromCur(f.currency) || "";
    const bench = me.ctx.bench; const hist = ins && ins.history;
    // v0.14: with a market reference the fair value is the market price of a home this size there, minus the work it needs
    const mk = r.mref && f.sqm ? r.mref : null; const mkFair = mk ? Math.round(mk.ppsqm * f.sqm - (r.renoCost || 0)) : null;
    const offer = RHS.offer(f, mk ? null : bench, hist, mkFair || me.ctx.fair);
    const out = [];
    // 1. price in money
    const rb = me.comps && me.comps.room;
    if (mk && offer && offer.diff != null) {
      const d = offer.diff, pct = r.pct;
      out.push(blk("price", T("b_price_mkt") || T("b_price"), `<div class="big ${d > 0 ? "neg" : "pos"}">${d > 0 ? "+" : "−"}${esc(M(Math.abs(d), f.currency))}</div><p>${esc(T(d > 0 ? "mkt_over" : "mkt_under", [String(Math.abs(pct || 0))]))}</p><p class="mut">${esc(T("mkt_value"))}: <b>${esc(M(mkFair, f.currency))}</b> · ${esc(T("mkt_src", [M(mk.ppsqm, f.currency), mk.place, mk.src + " " + mk.period]))}</p>${r.renoCost ? `<p class="mut">${esc(T("mkt_reno", [M(r.renoCost, f.currency)]))}</p>` : ""}`, { icon: "€" }));
    } else if (offer && offer.diff != null && (me.ctx.fair || (bench && f.sqm))) {
      const d = offer.diff, pct = r.pct;
      const src = me.ctx.fair ? T("src_model", [String(me.ctx.fairN)]) : me.ctx.benchSource === "near" ? T("src_near", [String(me.ctx.benchN), String(me.ctx.benchKm || 2)]) : me.ctx.benchSource === "area" ? T("src_area", [String(me.ctx.benchN)]) : T("src_page", [String(me.ctx.benchN)]);
      out.push(blk("price", T("b_price"), `<div class="big ${d > 0 ? "neg" : "pos"}">${d > 0 ? "+" : "−"}${esc(M(Math.abs(d), f.currency))}</div><p>${esc(T(d > 0 ? "price_over" : "price_under", [String(Math.abs(pct || 0))]))}</p><p class="mut">${esc(T(me.ctx.fair ? "fair_value_model" : "fair_value"))}: <b>${esc(M(offer.fair, f.currency))}</b>${r.range ? " " + esc(T("fair_range", [String(r.range)])) : ""} · ${esc(src)}</p>${me.ctx.zest ? `<p class="mut">${esc(T("zest_line", [M(RHS.nice ? RHS.nice(f._zest) : f._zest, f.currency)]))}</p>` : ""}${f.lastSold && f.lastSold.price ? `<p class="mut">${esc(T("bought_for", [M(f.lastSold.price, f.currency), f.lastSold.date || ""]))}</p>` : ""}`, { icon: "€" }));
    } else if (!f.sqm && rb && f.rooms && f.price) {
      // v0.7: no m² on this site: compare the price per bedroom with similar homes you have seen
      const per = f.price / f.rooms, pct = Math.round((per / rb.bench - 1) * 100);
      out.push(blk("price", T("b_price"), `<div class="big ${pct > 0 ? "neg" : "pos"}">${pct > 0 ? "+" : "−"}${Math.abs(pct)}%</div><p>${esc(T("price_room", [String(Math.abs(pct)), String(rb.n)]))}</p><p class="mut">${esc(M(per, f.currency))} / ${esc(T("unit_room"))} · ${esc(T("median"))} ${esc(M(rb.bench, f.currency))}</p>`, { icon: "€" }));
    } else if (me.ins === undefined || me.ctx.loc === undefined) out.push(blk("price", T("b_price"), skel, { icon: "€" }));
    else out.push(blk("price", T("b_price"), `<p class="mut">${esc(T("price_nocomps"))}</p>`, { icon: "€" }));
    if (f.tenure && f.tenure.k === "lease") out.push(blk("lease", T("b_lease"), `<p>${f.tenure.years ? esc(T("lease_line", [String(f.tenure.years), M(f.price / f.tenure.years, f.currency)])) : esc(T("lease_noyears"))}</p><p class="mut">${esc(T("lease_note"))}</p>`, { icon: "📜" }));
    // 2. what to offer
    if (offer) out.push(blk("offer", T(f.deal === "rent" ? "b_offer_rent" : "b_offer"), `<div class="two"><div><small>${esc(T("offer_open"))}</small><b>${esc(MP(offer.open, f))}</b></div><div><small>${esc(T("offer_max"))}</small><b>${esc(MP(offer.max, f))}</b></div></div><p class="mut">${esc(T(offer.hasFair ? (offer.stale ? "offer_why_stale" : "offer_why") : "offer_why_nocomps"))}</p><button class="k s2 sm" data-a="haggle">✉ ${esc(T("haggle"))}</button>`, { icon: "🤝", badge: T("estimate") }));
    const lock = !(state.email || me.allowed);
    // 3. money: mortgage and rent for a sale; yearly cost and rent-vs-buy for a rental (v0.10)
    const c = prefs.calc || {}; const cityI = ins && ins.city;
    if (f.deal === "rent") {
      const yr = f.price * 12, buy = cityI && cityI.sale_median && f.sqm ? cityI.sale_median * f.sqm : null;
      out.push(blk("cost", T("b_cost_rent"), `<div class="two"><div><small>${esc(T("rent_year"))}</small><b>${esc(M(yr, f.currency))}</b></div><div><small>${esc(T(f.depositMonths ? "rent_deposit_n" : "rent_deposit"))}</small><b>${esc(M(f.price * (f.depositMonths || 2), f.currency))}</b></div></div>
        ${f.sqm ? `<p class="mut">${esc(M(f.price / f.sqm, f.currency))}/m² ${esc(T("per_month"))}${cityI && cityI.rent_median ? " · " + esc(T("city_rent_median", [M(cityI.rent_median, f.currency), cityI.name])) : ""}</p>` : ""}
        ${buy ? `<p>${esc(T("rent_vs_buy", [M(RHS.nice(buy), f.currency), String(Math.round(buy / yr))]))}</p><p class="mut">${esc(T("rent_vs_buy_note", [String(Math.round((yr / buy) * 1000) / 10)]))}</p>` : ""}`, { icon: "🔑", badge: T("estimate"), lock }));
    } else {
      const mo = RHS.monthly(f.price, cc, c);
      // the real rent level of the city when we know it, else the country's typical yield
      const realRent = cityI && cityI.rent_median && f.sqm ? cityI.rent_median * f.sqm : null;
      const realY = realRent ? Math.round((realRent * 12 / f.price) * 1000) / 10 : null;
      const re = realY && realY > 1 && realY < 15 && !c.yield ? { month: RHS.nice(realRent), yield: realY, real: true } : RHS.rent(f.price, cc, c.yield);
      if (mo) out.push(blk("cost", T("b_cost"), `<div class="two"><div><small>${esc(T("cost_month"))}</small><b>${esc(M(mo.pay, f.currency))}</b></div><div><small>${esc(T("cost_cash"))}</small><b>${esc(M(mo.cash, f.currency))}</b></div></div>
      <div class="calc"><label>${esc(T("cost_down"))} <input type="number" min="0" max="100" step="5" data-c="down" value="${mo.down}">%</label><label>${esc(T("cost_rate"))} <input type="number" min="0" max="20" step="0.1" data-c="rate" value="${mo.rate}">%</label><label>${esc(T("cost_years"))} <input type="number" min="5" max="40" step="1" data-c="years" value="${mo.years}"></label></div>
      <p class="mut">${esc(T("cost_note", [String(mo.costsPct)]))}</p>
      ${re ? `<p>${esc(T("rent_line", [M(re.month, f.currency), String(re.yield)]))}${mo.pay ? ` ${esc(T(re.month >= mo.pay ? "rent_covers" : "rent_short"))}` : ""}</p>${re.real ? `<p class="mut">${esc(T("rent_real", [cityI.name]))}</p>` : ""}` : ""}`, { icon: "🏦", badge: T("estimate"), lock }));
    }
    // 4. price history and time on the market
    const hb = [];
    if (hist === undefined && me.ins === undefined) hb.push(skel);
    else {
      if (hist && hist.length > 1) hb.push(`<ul class="hist">${hist.slice(-5).map((h, i, a) => `<li><span>${esc(new Date(h.t).toLocaleDateString(RHS.lang, { day: "numeric", month: "short" }))}</span><b>${esc(M(h.price, f.currency))}</b>${i && h.price < a[i - 1].price ? ` <em class="pos">▼ ${Math.round((1 - h.price / a[i - 1].price) * 100)}%</em>` : i && h.price > a[i - 1].price ? ` <em class="neg">▲</em>` : ""}</li>`).join("")}</ul>`);
      else hb.push(`<p class="mut">${esc(T(hist && hist.length === 1 ? "hist_one" : "hist_none"))}</p>`);
      if (f.days != null) hb.push(`<p>${esc(T("days_listed", [String(f.days)]))}</p>`);
    }
    out.push(blk("hist", T("b_hist"), hb.join(""), { icon: "📈", lock }));
    // 5. same home elsewhere
    const dups = ins && ins.dups;
    if (me.ins === undefined) out.push(blk("dups", T("b_dups"), skel, { icon: "🔁", lock }));
    else if (dups && dups.length) out.push(blk("dups", T("b_dups"), `<ul class="lk">${dups.map((d) => `<li><a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(RHS.portalName(d.portal))}</a> <b>${esc(M(d.price, f.currency))}</b>${d.price < f.price ? ` <em class="pos">−${esc(M(f.price - d.price, f.currency))}</em>` : ""}</li>`).join("")}</ul>`, { icon: "🔁", lock }));
    else if (ins) out.push(blk("dups", T("b_dups"), `<p class="mut">${esc(T("dups_none"))}</p>`, { icon: "🔁", lock }));
    // 6. within a walk, the neighbourhood, the centre and your place (v0.9)
    const loc = me.ctx.loc;
    const mp = prefs.myPlace;
    const myKm = mp && f.lat != null ? RHS.km(f.lat, f.lng, mp.lat, mp.lng) : null;
    const placeHtml = `<div class="lk2" style="margin-top:6px">${mp ? `<span class="mut">🏢 ${esc(T("my_place"))}: ${myKm != null ? `<b>${myKm < 1 ? Math.round(myKm * 1000) + " m" : myKm.toFixed(1) + " km"}</b> · ~${Math.max(2, Math.round(myKm * 1.35 / 35 * 60))} min 🚗 · ~${Math.max(2, Math.round(myKm * 1.25 / 18 * 60))} min 🚲` : esc(mp.label || mp.q)}</span> <button data-a="myplace">✎</button>` : `<button data-a="myplace">🏢 ${esc(T("my_place_set"))}</button>`}</div>${me.placeEdit ? `<div class="lk2"><input class="in" id="rh-place" placeholder="${esc(T("my_place_ph"))}" value="${esc(mp ? mp.q : "")}" style="margin-top:4px"><button data-a="placesave">${esc(T("save"))}</button>${mp ? `<button data-a="placedel">×</button>` : ""}</div><div class="err" id="rh-place-err"></div>` : ""}`;
    const areaLine = (() => { const bits = []; const ai = me.ctx.areaIdx; if (ai) { const d = Math.round((ai - 1) * 100); bits.push(d >= 5 ? "📈 " + T("area_hot", [String(d)]) : d <= -5 ? "📉 " + T("area_cheap", [String(-d)]) : "≈ " + T("area_avg")); } if (me.ctx.centreKm != null && me.ctx.cityName) bits.push("🎯 " + (me.ctx.centreKm < 1 ? T("centre_in", [me.ctx.cityName]) : T("centre_km", [me.ctx.centreKm.toFixed(1), me.ctx.cityName]))); return bits.length ? `<p class="mut">${bits.map(esc).join(" · ")}</p>` : ""; })();
    if (loc === undefined) out.push(blk("walk", T("b_walk"), skel, { icon: "🚶", lock }));
    else if (loc) {
      const it = [["transit", "🚌"], ["shop", "🛒"], ["food", "🍽"], ["school", "🏫"], ["health", "💊"], ["park", "🌳"], ["beach", "🏖"]].filter(([k]) => loc[k] != null);
      out.push(blk("walk", T("b_walk"), `<div class="chips">${it.map(([k, i]) => `<span class="${loc[k] > 0 ? "" : "off"}">${i} ${loc[k] >= 10 ? "10+" : loc[k]} ${esc(T("w_" + k))}</span>`).join("")}</div>${areaLine}<p class="mut">OpenStreetMap · 800 m${me.ctx.geoApprox ? " · " + esc(T("geo_approx")) : ""}</p>${placeHtml}`, { icon: "🚶", lock }));
    } else out.push(blk("walk", T("b_walk"), `<p class="mut">${esc(T(f.lat != null ? "loc_fail" : "loc_none"))}</p>${areaLine}${placeHtml}`, { icon: "🚶" }));
    // 7. size check and questions for the agent
    const sz = RHS.sizeNote(f);
    const qs = RHS.questions(f, r);
    out.push(blk("ask", T("b_ask"), `${sz ? `<p class="${sz.k === "small" ? "neg" : "pos"}">${esc(T("size_" + sz.k, [String(f.rooms), String(sz.per)]))}</p>` : ""}<ol class="qs">${qs.map((k) => `<li>${esc(T(k))}</li>`).join("")}</ol><button class="k s2 sm" data-a="copyq">⧉ ${esc(T("copy_questions"))}</button>`, { icon: "❓", lock }));
    // 8. better options in the same city
    const alts = ins && ins.alts;
    if (alts && alts.length) out.push(blk("alts", T("b_alts", [ins.city ? ins.city.name : ""]), `<ul class="lk">${alts.map((a) => `<li><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(M(a.price, f.currency))} · ${esc(a.sqm)} m²${a.rooms ? " · " + a.rooms + " " + esc(T("rank_rooms")) : ""}</a> <em class="pos">${esc(M(a.ppsqm, f.currency))}/m²</em>${a.area ? `<br><small>${esc(a.area)} · ${esc(RHS.portalName(a.portal))}</small>` : ""}</li>`).join("")}</ul>`, { icon: "✨", lock }));
    // 9. the city on RealHunt
    if (ins && ins.city && ins.city.median) out.push(blk("city", T("b_city", [ins.city.name]), `<p>${esc(T("city_line", [M(ins.city.median, f.currency), String(ins.city.n)]))}${ins.city.trend != null ? ` · <b class="${ins.city.trend > 0 ? "neg" : "pos"}">${ins.city.trend > 0 ? "▲" : "▼"} ${Math.abs(ins.city.trend)}%</b> ${esc(T("city_trend"))}` : ""}</p>`, { icon: "🏙" }));
    // 10. map and street view (v0.7)
    const where = f.lat != null && f.lng != null ? `${f.lat},${f.lng}` : [f.area, f.city, f.province].filter(Boolean).join(", ");
    if (where) out.push(blk("map", T("b_map"), `<div class="lk2"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}" target="_blank" rel="noopener">📍 ${esc(T("map_open"))}</a>${f.lat != null ? `<a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(where)}" target="_blank" rel="noopener">🛣 ${esc(T("street_view"))}</a>` : ""}</div>${f.lat == null ? `<p class="mut">${esc(where)}</p>` : ""}`, { icon: "🗺" }));
    // 11. your private notes and 👍/👎 (v0.7, kept in this browser only)
    const nt = me.note || {};
    out.push(blk("notes", T("b_notes"), `<textarea class="nt" id="rh-note" maxlength="1000" placeholder="${esc(T("notes_ph"))}">${esc(nt.text || "")}</textarea><div class="lk2"><button data-a="like" class="${nt.like === 1 ? "on" : ""}">👍 ${esc(T("like"))}</button><button data-a="dislike" class="${nt.like === -1 ? "on" : ""}">👎 ${esc(T("dislike"))}</button></div>`, { icon: "📝" }));
    // 12. share (v0.7)
    if (me.shareOpen) out.push(blk("share", T("b_share"), `<div class="lk2"><button data-a="sumcopy">⧉ ${esc(T("share_copy"))}</button><a href="https://wa.me/?text=${encodeURIComponent(summaryText(me))}" target="_blank" rel="noopener" data-a="wa">WhatsApp</a><a href="mailto:?subject=${encodeURIComponent((f.title || document.title || "").slice(0, 80))}&body=${encodeURIComponent(summaryText(me))}" data-a="mail">✉ Email</a></div>`, { icon: "↗" }));
    return out.join("");
  }
  // a plain-text summary of the home, for copy, WhatsApp or email
  function summaryText(me) {
    const { f, r } = me; const o = RHS.offer(f, me.ctx.bench, me.ins && me.ins.history, me.ctx.fair);
    const L = [`🏠 ${(f.title || document.title || "").trim().slice(0, 100)}`, `${M(f.price, f.currency)}${f.sqm ? " · " + f.sqm + " m²" : ""}${f.rooms ? " · " + f.rooms + " " + T("rank_rooms") : ""}`,
      `RealHunt Score ${r.score}/100 (${RHS.grade(r.score)})${r.pct != null ? ` · ${r.pct > 0 ? "+" : ""}${r.pct}% vs similar homes` : ""}`, r.verdict];
    if (o && o.hasFair) L.push(`${T("offer_open")}: ${M(o.open, f.currency)} · ${T("offer_max")}: ${M(o.max, f.currency)}`);
    L.push(location.href.split("?")[0]);
    return L.filter(Boolean).join("\n");
  }

  function siteLink(me) {
    const c = me.ins && me.ins.city;
    const u = (c ? c.url : "https://realhunt.co/best") + "?utm_source=extension&utm_medium=card&utm_campaign=" + encodeURIComponent(A.id);
    return `<a class="cta" href="${esc(u)}" target="_blank" rel="noopener" data-a="site">🏆 ${esc(c ? T("top10_city", [c.name]) : T("top10_any"))} →</a>`;
  }

  const noteFacts = (me) => ({ url: me.url, price: me.f.price, cur: me.f.currency, score: me.r && me.r.score, sqm: me.f.sqm || null, rooms: me.f.rooms || null, city: me.f.city || (me.ins && me.ins.city && me.ins.city.name) || null, deal: me.f.deal || "sale", ptype: me.f.ptype || null, country: me.f.country || null, portal: A.id });
  async function haggleText(me) {
    const { f, r } = me; const o = RHS.offer(f, me.ctx.bench, me.ins && me.ins.history, me.ctx.fair) || { open: f.price ? RHS.nice(f.price * 0.94) : null };
    return T("haggle_body", [M(o.open, f.currency), r.pct != null && r.pct > 0 ? T("haggle_arg_over", [String(r.pct)]) : T("haggle_arg_gen"), location.href.split("?")[0]]);
  }
  async function copy(text) { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } }

  function renderCard() {
    const me = cur; if (!me || !me.r) return;
    // v0.14.3: no provisional number. Until every input is in (or 4 s have passed) the card says "calculating",
    // then shows one score that doesn't move.
    if (!me.ready) {
      if (card) card.remove();
      const { h, sh } = host("div"); card = h;
      const pill = document.createElement("div"); pill.className = "pill"; pill.style.background = "#8a9098";
      pill.innerHTML = `<b>…</b><span>RealHunt</span>`; pill.title = T("calculating") || "…"; pill.setAttribute("role", "status"); pill.setAttribute("aria-busy", "true"); pill.setAttribute("aria-label", "RealHunt Score: " + (T("calculating") || "…"));
      sh.appendChild(pill); document.documentElement.appendChild(h); return;
    }
    const { f, r, hash } = me;
    const keepFocus = card && card.shadowRoot && card.shadowRoot.activeElement && card.shadowRoot.activeElement.id;
    const scroll = card && card.shadowRoot && card.shadowRoot.querySelector(".body") ? card.shadowRoot.querySelector(".body").scrollTop : 0;
    const typed = {}; if (card && card.shadowRoot) for (const id of ["rh-email", "rh-code", "rh-note", "rh-place"]) { const el = card.shadowRoot.getElementById(id); if (el) typed[id] = el.value; }
    if (card) card.remove();
    const { h, sh } = host("div"); card = h;
    if (!me.open) {
      const pill = document.createElement("div"); pill.className = "pill"; pill.style.background = RHS.color(r.score);
      pill.innerHTML = `<b>${r.score}</b><span>${RHS.grade(r.score)} · RealHunt</span>`; pill.title = r.verdict + "  (Alt+Shift+R)";
      pill.addEventListener("click", () => { me.open = true; state.min = false; send({ t: "pref", min: false }); renderCard(); });
      pill.tabIndex = 0; pill.setAttribute("role", "button"); pill.setAttribute("aria-label", "RealHunt Score " + r.score + " " + RHS.grade(r.score) + ". " + r.verdict);
      pill.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pill.click(); } });
      sh.appendChild(pill); document.documentElement.appendChild(h); return;
    }
    const quotaOk = state.email || me.allowed;
    const mini = r.parts.map((p) => `<div class="row${p.pending ? " pend" : ""}"${quotaOk && p.why && !p.pending ? ` title="${esc(p.why)}"` : ""}><span>${esc(T("part_" + p.k) || p.label)}</span><div class="bar"><i style="width:${Math.round((p.pts / p.max) * 100)}%;background:${RHS.color((p.pts / p.max) * 100)}"></i></div><b>${p.pending ? "…" : p.na ? "—" : p.pts + "/" + p.max}</b></div>`).join("");
    const rows = me.expanded && quotaOk ? r.parts.map((p) => `<div class="r"><div class="l"><span>${esc(T("part_" + p.k) || p.label)}</span><span>${p.pending ? "…" : p.pts + "/" + p.max}</span></div><p>${esc(p.why)}</p></div>`).join("") : "";
    const gate = me.gate ? gateHtml(me.gate) : "";
    const consentAsk = !state.consent && !me.gate ? `<div class="gate">${esc(T("consent_short"))}<br><span class="mut">${esc(T("consent_more"))}</span><br><button class="k" data-a="consent" style="margin-top:8px">${esc(T("allow"))}</button></div>` : "";
    const locked = !quotaOk && !me.gate ? `<div class="unlock" data-a="open-gate"><span class="free">${FREE}</span> ${esc(T("unlock_blocks"))} →<br><small style="opacity:.75">${esc(T("unlock_once"))}</small></div>` : "";
    const bits = RHS.summaryBits(r, { f, offer: RHS.offer(f, me.ctx.bench, me.ins && me.ins.history, me.ctx.fair), hist: me.ins && me.ins.history, dups: me.ins && me.ins.dups, size: RHS.sizeNote(f) });
    // v0.9: what pushes the score up or down, and how sure we are
    const kn = r.parts.filter((p) => !p.na && !p.pending).map((p) => ({ k: p.k, q: p.pts / p.max }));
    const ups = kn.filter((p) => p.q >= 0.7).sort((a, b) => b.q - a.q).slice(0, 2), downs = kn.filter((p) => p.q <= 0.4).sort((a, b) => a.q - b.q).slice(0, 1);
    const reasons = ups.map((p) => "＋ " + T("part_" + p.k)).concat(downs.map((p) => "－ " + T("part_" + p.k)));
    const confK = (r.conf || 0) >= 0.75 && r.checked.includes("location") ? "conf_high" : (r.conf || 0) >= 0.5 ? "conf_med" : "conf_low";
    if (me.priceChange) bits.unshift({ k: me.priceChange.from > f.price ? "pc_down" : "pc_up", v: [MP(me.priceChange.from, f), MP(f.price, f), new Date(me.priceChange.t).toLocaleDateString(RHS.lang, { day: "numeric", month: "short" })] });
    const sum = `<div class="sum">${reasons.length ? `<b>${reasons.map(esc).join(" · ")}</b> · ` : ""}<span class="mut" title="${esc(T("conf_tip"))}">${esc(T(confK))}</span>${bits.length ? "<br>" + bits.map((b) => esc(T(b.k, b.v))).join(" · ") : ""}${cur && cur.rankInfo ? rankDeltaHtml(r, cur.rankInfo) : ""}</div>`;
    const loading = me.ins === undefined || me.ctx.loc === undefined || (state.consent && !me.ctx.ai && (f.desc || "").length > 60 && !me.aiDone);
    const onb = !prefs.onb ? `<div class="onb"><b>${esc(T("onb_title"))}</b><ol><li>${esc(T("onb_1"))}</li><li>${esc(T("onb_2"))}</li><li>${esc(T("onb_3"))}</li></ol><button class="k sm" data-a="onb">${esc(T("onb_ok"))}</button></div>` : "";
    const div = document.createElement("div"); div.className = "c v5"; div.setAttribute("role", "dialog"); div.setAttribute("aria-label", "RealHunt Score");
    if (prefs.pos) { div.style.left = Math.max(0, Math.min(innerWidth - 200, prefs.pos.x)) + "px"; div.style.top = Math.max(0, Math.min(innerHeight - 120, prefs.pos.y)) + "px"; div.style.right = "auto"; div.style.bottom = "auto"; }
    div.innerHTML = `<div class="h" data-drag="1"><div class="s" style="background:${RHS.color(r.score)}">${r.score}<small>${RHS.grade(r.score)}</small></div><div class="t"><b>RealHunt Score${r.ai ? ` <span class="ai">AI</span>` : ""}</b><small>${esc(MP(f.price, f))}${f.sqm ? " · " + f.sqm + " m²" : ""}${r.ppsqm ? " · " + esc(M(r.ppsqm, f.currency)) + "/m²" : f.rooms ? " · " + esc(M(f.price / f.rooms, f.currency)) + "/" + esc(T("unit_room")) : ""}${f.tenure && f.tenure.k === "lease" && f.tenure.years ? " · " + esc(M(f.price / f.tenure.years, f.currency)) + esc(T("per_lease_year")) : ""}</small></div><button class="x" data-a="min" aria-label="Minimise" title="Minimise (Alt+Shift+R)">–</button><button class="x" data-a="close" aria-label="Close">×</button></div>
      ${loading ? `<div class="ld"><i></i></div>` : ""}
      <div class="body">
      <div class="v">${esc(r.verdict)}</div>${sum}<div class="sr" aria-live="polite">${esc("RealHunt Score " + r.score + " " + RHS.grade(r.score) + ". " + r.verdict)}</div>${state.offline ? `<div class="off7">${esc(T("offline_note"))}</div>` : ""}
      ${onb}${consentAsk}
      <div class="blocks">${blocksHtml(me)}</div>
      ${locked}${gate ? `<div class="p">${gate}</div>` : ""}
      <details class="det"${me.expanded ? " open" : ""}><summary>${esc(T("see_why"))}</summary><div class="mini">${mini}</div><div class="p">${rows}</div></details>
      </div>
      ${siteLink(me)}
      <div class="f"><button class="k s2" data-a="save">♡ ${esc(T("save"))}</button><button class="k s2" data-a="cmp">⇄ ${esc(T("compare"))}${me.cmpN ? ` (${me.cmpN})` : ""}</button><button class="k s2" data-a="share">↗ ${esc(T("share_short"))}</button><button class="k s2" data-a="panel">${esc(T("open_panel"))}</button></div>
      <div class="n">${esc(T("disclaimer"))} · <a href="#" data-a="wrong" style="color:inherit">⚑ ${esc(T("wrong_data"))}</a></div>`;
    div.addEventListener("toggle", (e) => { if (e.target.classList && e.target.classList.contains("det")) { me.expanded = e.target.open; if (quotaOk) send({ t: "pref", why: me.expanded }); if (me.expanded && !quotaOk && !me.gate) { me.gate = { step: "email" }; send({ t: "track", kind: "email_prompt" }); renderCard(); } } }, true);
    div.addEventListener("input", (e) => {
      if (e.target.id !== "rh-note") return;
      me.note = { ...(me.note || {}), text: e.target.value }; clearTimeout(div._nt);
      div._nt = setTimeout(() => send({ t: "note", hash, set: { text: me.note.text, ...noteFacts(me) } }), 500);
    });
    div.addEventListener("change", (e) => {
      const k = e.target.dataset && e.target.dataset.c; if (!k) return;
      prefs.calc = { ...(prefs.calc || {}), [k]: Number(e.target.value) }; send({ t: "pref", calc: prefs.calc }); renderCard();
    });
    div.addEventListener("click", async (e) => {
      const lockedBlk = e.target.closest(".blk.lock");
      if (lockedBlk && !me.gate) { const le = await send({ t: "lastEmail" }); me.gate = { step: "email", email: le || "" }; send({ t: "track", kind: "email_prompt", meta: { from: "blur" } }); renderCard(); const g = sh.querySelector(".gate"); g && g.scrollIntoView({ block: "center" }); return; }
      const el = e.target.closest("[data-a]"); const a = el && el.dataset.a; if (!a) return;
      if (a === "myplace") { me.placeEdit = !me.placeEdit; renderCard(); setTimeout(() => sh.getElementById("rh-place")?.focus(), 30); return; }
      if (a === "placedel") { prefs.myPlace = null; send({ t: "pref", myPlace: null }); me.placeEdit = false; renderCard(); return; }
      if (a === "placesave") {
        const q = ($("rh-place").value || "").trim(); if (q.length < 4) return;
        el.textContent = "…"; const g = await send({ t: "geocode", q });
        if (g && g.lat != null) { prefs.myPlace = { q, lat: g.lat, lng: g.lng, label: g.label || q }; send({ t: "pref", myPlace: prefs.myPlace }); me.placeEdit = false; send({ t: "track", kind: "my_place" }); renderCard(); }
        else { el.textContent = T("save"); const er = $("rh-place-err"); if (er) er.textContent = state.consent ? T("place_notfound") : T("consent_needed"); }
        return;
      }
      if (a === "wrong") { e.preventDefault(); send({ t: "track", kind: "wrong_data", meta: { url: me.url, price: f.price, sqm: f.sqm, rooms: f.rooms, portal: A.id } }); el.textContent = "✓ " + T("thanks"); return; }
      const $ = (id) => sh.getElementById(id);
      if (a === "site") { send({ t: "track", kind: "to_site", meta: { where: "card", city: me.ins && me.ins.city ? me.ins.city.slug : "" } }); return; }
      if (a === "close") { card.remove(); card = null; cur && (cur.closed = true); muteSite(true); }
      if (a === "min") { state.min = true; me.open = false; send({ t: "pref", min: true }); renderCard(); }
      if (a === "onb") { prefs.onb = true; send({ t: "pref", onb: true }); renderCard(); }
      if (a === "open-gate") { const le = await send({ t: "lastEmail" }); me.gate = { step: "email", email: le || "" }; send({ t: "track", kind: "email_prompt" }); renderCard(); }
      if (a === "panel") { const ok = await send({ t: "openPanel" }); if (!ok) { me.expanded = true; renderCard(); } }
      if (a === "save") { await send({ t: "track", kind: "save", hash, price: f.price }); el.textContent = "♥ " + T("saved"); el.title = T(state.email ? "saved_alert" : "saved_alert_email"); const n = sh.querySelector(".n"); if (n) n.textContent = T(state.email ? "saved_alert" : "saved_alert_email"); }
      if (a === "share") { me.shareOpen = !me.shareOpen; renderCard(); if (me.shareOpen) { const s2 = sh.querySelector('[data-b="share"]'); s2 && s2.scrollIntoView({ block: "nearest" }); } }
      if (a === "sumcopy") { const ok = await copy(summaryText(me)); el.textContent = ok ? "✓ " + T("copied") : T("try_again"); send({ t: "track", kind: "share_copy" }); }
      if (a === "wa" || a === "mail") { send({ t: "track", kind: "share_" + a }); return; }
      if (a === "like" || a === "dislike") { const v = a === "like" ? 1 : -1; const nl = (me.note || {}).like === v ? 0 : v; me.note = { ...(me.note || {}), like: nl }; send({ t: "note", hash, set: { like: nl, ...noteFacts(me) } }); loadTaste(true); renderCard(); }
      if (a === "cmp") {
        const res = await send({ t: "compare", op: "add", item: { url: me.url, portal: A.id, price: f.price, cur: f.currency, sqm: f.sqm, rooms: f.rooms, score: r.score, pct: r.pct, area: f.area } });
        const n = res && res.list ? res.list.length : 1; me.cmpN = n;
        if (n >= 2 && me.cmpReady) { await send({ t: "compare", op: "open" }); me.cmpReady = false; }
        else { me.cmpReady = n >= 2; renderCard(); }
      }
      if (a === "haggle") { const ok = await copy(await haggleText(me)); el.textContent = ok ? "✓ " + T("copied") : T("try_again"); send({ t: "track", kind: "haggle" }); }
      if (a === "copyq") { const ok = await copy(RHS.questions(f, r).map((k, i) => `${i + 1}. ${T(k)}`).join("\n")); el.textContent = ok ? "✓ " + T("copied") : T("try_again"); }
      if (a === "consent") { await send({ t: "consent" }); await getState(); showDetail(); }
      if (a === "back") { me.gate = { step: "email", email: me.gate.email }; renderCard(); }
      if (a === "email") {
        const email = ($("rh-email").value || "").trim(), mk = $("rh-mk").checked;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { me.gate = { step: "email", email, mk, err: T("bad_email") }; return renderCard(); }
        if (!state.consent) { await send({ t: "consent" }); await getState(); }
        el.disabled = true; el.textContent = "…";
        const res = await send({ t: "verifyStart", email, lang: RHS.lang });
        me.gate = res && res.ok ? { step: "code", email, mk } : { step: "email", email, mk, err: res && res.error === "wait" ? T("wait_code") : T("try_again") };
        renderCard();
      }
      if (a === "code") {
        const code = ($("rh-code").value || "").replace(/\D/g, "");
        const res = await send({ t: "verifyCheck", code, marketing: !!me.gate.mk });
        if (res && res.ok) { await getState(); me.gate = null; me.expanded = true; renderCard(); send({ t: "track", kind: "lead" }); }
        else { me.gate = { ...me.gate, err: res && res.error === "expired" ? T("code_expired") : T("code_wrong") }; renderCard(); }
      }
    });
    // drag the card by its header; the position is remembered
    div.querySelector("[data-drag]").addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      const r0 = div.getBoundingClientRect(), dx = e.clientX - r0.left, dy = e.clientY - r0.top;
      const mv = (ev) => { const x = Math.max(0, Math.min(innerWidth - 120, ev.clientX - dx)), y = Math.max(0, Math.min(innerHeight - 60, ev.clientY - dy)); Object.assign(div.style, { left: x + "px", top: y + "px", right: "auto", bottom: "auto" }); };
      const up = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); const b = div.getBoundingClientRect(); prefs.pos = { x: Math.round(b.left), y: Math.round(b.top) }; send({ t: "pref", pos: prefs.pos }); };
      addEventListener("pointermove", mv); addEventListener("pointerup", up);
    });
    div.querySelector("[data-drag]").addEventListener("dblclick", () => { prefs.pos = null; send({ t: "pref", pos: null }); renderCard(); });
    div.addEventListener("keydown", (e) => { if (e.key === "Enter") { const id = e.target.id; if (id === "rh-email") div.querySelector('[data-a="email"]').click(); if (id === "rh-code") div.querySelector('[data-a="code"]').click(); if (id === "rh-place") div.querySelector('[data-a="placesave"]')?.click(); } e.stopPropagation(); });
    sh.appendChild(div);
    document.documentElement.appendChild(h);
    // v0.15: the score counts up from 0 the first time it appears (skipped when the user prefers less motion)
    if (!me.counted) { me.counted = true; const sEl = div.querySelector(".h .s"); const tn = sEl && sEl.firstChild;
      if (tn && tn.nodeType === 3 && !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
        const t0 = performance.now(), end = r.score; const step = (t) => { const k = Math.min(1, (t - t0) / 650); tn.nodeValue = String(Math.round(end * (1 - Math.pow(1 - k, 3)))); if (k < 1 && tn.isConnected) requestAnimationFrame(step); }; requestAnimationFrame(step);
      } }
    const b = sh.querySelector(".body"); if (b) b.scrollTop = scroll;
    for (const id in typed) { const el = sh.getElementById(id); if (el && !el.value) el.value = typed[id]; }
    if (keepFocus) sh.getElementById(keepFocus)?.focus();
  }
  // v0.7: Esc minimises the open card (not while typing in the page)
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !cur || !cur.r || !cur.open || !card || e.defaultPrevented || siteBusy()) return; // Escape closing the site's own popup is the site's
    const t = document.activeElement; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    cur.open = false; renderCard();
  });
  // Alt+Shift+R: open or minimise the card (on a search page: rank the whole search)
  addEventListener("keydown", (e) => {
    if (!(e.altKey && e.shiftKey && (e.key === "R" || e.key === "r" || e.code === "KeyR"))) return;
    if (isMuted()) { muteSite(false); return; }
    if (cur && cur.r) { cur.open = !cur.open; state.min = !cur.open; send({ t: "pref", min: state.min }); renderCard(); }
    else if (!rk && !isDet() && lastScan.length >= 3) { if (fab) { fab.remove(); fab = null; } startRank(); }
  });


  // ---------------------------------------------------------------- rank the whole search: one click, reads page after page (up to 500)
  const RANK_MAX = 500;
  let rk = null, fab = null;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const HOST = location.hostname.replace(/^www\./, "");
  let lastRank; // the last ranking saved for this site (v0.7)
  // v0.7: one bar at the bottom left: rank the whole search, jump to the best home here, hide weak homes, reopen the last ranking
  async function showFab(n) {
    if (dead) return;
    if (rk || isDet() || n < 3 || isMuted()) { if (fab) { fab.remove(); fab = null; } return; }
    if (lastRank === undefined) lastRank = (await send({ t: "lastRank", host: HOST })) || null;
    const off = (prefs.fabOff || []).includes(HOST);
    const best = [...lastScan].filter((x) => x.c.el && x.c.el.isConnected).sort((a, b) => b.r.score - a.r.score)[0];
    const sig = [off, best && best.c.url, best && best.r.score, !!prefs.dim, !!lastRank].join("|");
    if (fab && fab.isConnected && fab._sig === sig) return;
    if (fab) fab.remove();
    const { h, sh } = host("div"); fab = h; fab._sig = sig;
    const bar = document.createElement("div"); bar.className = "bar7";
    if (off) bar.innerHTML = `<button class="chip dk" data-a="unhide" title="${esc(T("rank_cta"))}">⚡</button>`;
    else bar.innerHTML = `<button class="chip dk" data-a="rank" title="${esc(T("rank_sub"))}"><b class="y">⚡</b>${esc(T(RHS.pageDeal === "rent" ? "rank_cta_rent" : "rank_cta"))}</button>`
      + (best ? `<button class="chip" data-a="best" title="${esc(T("best_here"))} · ${esc(RHS.money(best.c.f.price, best.c.f.currency))}">🏆 <i style="background:${RHS.color(best.r.score)}">${best.r.score}</i></button>` : "")
      + `<button class="chip more" data-a="more" title="…">⋯</button><span class="ext">`
      + `<button class="chip${prefs.dim ? " on" : ""}" data-a="dim">◐ ${esc(T(prefs.dim ? "show_all" : "hide_weak"))}</button>`
      + (lastRank && lastRank.items && lastRank.items.length ? `<button class="chip" data-a="last">↺ ${esc(T("last_rank", [String(lastRank.items.length)]))}</button>` : "")
      + `<button class="chip xx" data-a="hide" title="${esc(T("fab_hide"))}">×</button></span>`;
    bar.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]")?.dataset.a; if (!a) return;
      if (a === "rank") { fab.remove(); fab = null; startRank(); }
      if (a === "best" && best) { best.c.el.scrollIntoView({ behavior: "smooth", block: "center" }); const k0 = keyOf(best.c.url); cardGlow(k0, true); setTimeout(() => cardGlow(k0, false), 2200); send({ t: "track", kind: "best_jump" }); }
      if (a === "dim") { prefs.dim = !prefs.dim; send({ t: "pref", dim: prefs.dim }); paintPage(); showFab(n); }
      if (a === "hide" || a === "unhide") { const L = new Set(prefs.fabOff || []); a === "hide" ? L.add(HOST) : L.delete(HOST); prefs.fabOff = [...L].slice(-200); send({ t: "pref", fabOff: prefs.fabOff }); showFab(n); }
      if (a === "last") { fab.remove(); fab = null; openLastRank(); }
      if (a === "more") bar.classList.toggle("open");
    });
    sh.appendChild(bar); document.documentElement.appendChild(h); applyBusy();
  }
  const keyOf = (u) => { try { const x = new URL(u, location.href); return x.hostname + x.pathname.replace(/\/$/, ""); } catch { return u; } };
  function addItems(list) {
    let fresh = 0;
    const add = [];
    for (const c of list) { if (!c || !c.url || !c.f || !c.f.price) continue; const k = keyOf(c.url); if (rk.items.has(k)) continue; rk.items.set(k, { url: c.url.split("#")[0], f: c.f, page: rk.pages + 1 }); add.push(c); fresh++; }
    if (add.length) { const me0 = rk; attachMref(add.map((c) => c.f), add.map((c) => c.url)).then((n) => { if (n && rk === me0) { rk.ver = (rk.ver || 0) + 1; renderRank(); } }); }
    return fresh;
  }
  function guessNext(u, n) {
    const x = new URL(u); for (const k of ["page", "pag", "pagina", "pn", "p", "pagenumber", "pageNr", "o"]) if (x.searchParams.has(k) && /^\d+$/.test(x.searchParams.get(k))) { x.searchParams.set(k, String(+x.searchParams.get(k) + 1)); return x.href; }
    if ((RHS.recipe && RHS.recipe.pageParam) || n === 1) { x.searchParams.set((RHS.recipe && RHS.recipe.pageParam) || "page", String(n + 1)); return x.href; }
    return null;
  }
  async function toServer(list) {
    const items = [];
    for (const c of list) { let path = ""; try { path = new URL(c.url).pathname; } catch { continue; } if (sent.has(path)) continue; sent.add(path);
      const f = c.f; if (!f.price || !(f.sqm || f.rooms)) continue; // v0.7: homes without m² go with their bedrooms
      if (f.status === "off" || f.status === "short") continue;
      items.push({ h: await RHS.hash(`${A.id}:${path}`), deal: f.deal || "sale", portal: A.id, pp: ppOf(f), cur: f.currency, rooms: f.rooms || null, ten: tenOf(f), ...factsOf(f), lat: f.lat ?? null, lng: f.lng ?? null, area: f.area || "", price: f.price, sqm: f.sqm, url: c.url.split("?")[0], country: f.country }); }
    for (let i = 0; i < items.length; i += 60) send({ t: "cards", rank: true, portal: A.id, area: A.areaKey(), city: cityHint(null), items: items.slice(i, i + 60) });
  }
  // how many homes the search says it has ("1.234 results"), to show progress and time left
  function totalOf(doc) {
    const t = [doc.title, (doc.querySelector("h1") || {}).textContent || "", RHS.bodyText(doc, 4000)].join(" \n ");
    const m = t.match(/(\d{1,3}(?:[.,\s]\d{3})+|\d{2,6})\s*(?:\+\s*)?(?:results|resultados|resultats|résultats|risultati|ergebnisse|resultaten|resultater|homes|properties|propiedades|inmuebles|viviendas|pisos|casas|boliger|annonces|biens|immobili|annunci|objekte|immobilien|woningen|imóveis|listings|villas)\b/i);
    const n = m ? RHS.num(m[1]) : null; return n && n >= 10 && n < 200000 ? n : null;
  }
  async function startRank(keep) {
    if (rk) { rk.stop = true; if (rk.deep) rk.deep.stop = true; }
    const old = keep && rk ? { flt: rk.flt, sort: rk.sort, min: rk.min, newOnly: rk.newOnly } : { sort: (prefs.rkSort || {})[HOST] };
    rk = { items: new Map(), pages: 0, running: true, stop: false, blocked: false, visited: new Set([keyOf(location.href) + location.search]), onlySqm: false, t0: Date.now(), total: totalOf(document), times: [], ...old, src: location.href, place: A.areaKey ? A.areaKey() : "" };
    // v0.12: what each home cost in your last ranking here, to show price changes since then
    rk.prev = new Map(); if (lastRank && lastRank.items) for (const x of lastRank.items) if (x.f && x.f.price) rk.prev.set(keyOf(x.url), x.f.price);
    const me = rk;
    const first = A.cards().map((c) => ({ url: c.url, f: c.f }));
    addItems(first); rk.pages = 1; rk.perPage = first.length || 20; renderRank(); toServer(first);
    send({ t: "track", kind: keep ? "rank_follow" : "rank_start", meta: { portal: A.id, n: first.length } });
    if (state.consent) { const g = first.find((c) => c.f.lat != null); send({ t: "insights", p: { city: cityHint(null), country: RHS.siteCountry(location.hostname) || (first[0] && first[0].f.country), lat: g ? g.f.lat : null, lng: g ? g.f.lng : null, url: location.href, currency: first[0] && first[0].f.currency } }).then((ins) => { if (rk && ins && ins.city) { rk.city = ins.city; renderRank(true); } }); }
    // v0.12: sites with a search service (Zillow) are ranked from it: the whole map area in seconds, no pages opened
    if (A.apiPage) { let ok = false; try { ok = await apiRank(me); } catch { ok = false; } if (rk !== me) return; if (ok) return finishRank(me); }
    const url = RHS.nextPageUrl(document, location.href) || (first.length >= 8 ? guessNext(location.href, 1) : null);
    // learn the page-number pattern from page 2's address, so we can keep going when a page shows no "next" link
    const re2 = /([/=_-]|page|pagina|pag|side|seite)2(?=\/?$|\/?[?&#]|\.\w{2,5}$)/i;
    rk.tpl = url && re2.test(url) ? (n) => url.replace(re2, "$1" + n) : null;
    await rankLoop(url);
  }
  async function apiRank(me) {
    const qs = A.queryState && A.queryState(); if (!qs) return false;
    me.loading = 1; renderRank();
    const t1 = Date.now();
    const r = await A.apiPage(qs, 1, true);
    if (rk !== me) return true;
    if (!r || r.err || r.blocked || !r.items.length) { if (r && r.blocked) me.blocked = true; return false; }
    me.api = true; me.total = r.total || me.total; if (r.place) me.place = r.place;
    addItems(r.items); me.times.push(Date.now() - t1); me.perPage = 41; toServer(r.items); me.ver = (me.ver || 0) + 1; renderRank(true);
    const maxP = Math.min(20, r.pages || Math.ceil((me.total || 0) / 41) || 1);
    let misses = 0;
    for (let p = 2; p <= maxP && !me.stop && me.items.size < (me.total || 1e9); p++) {
      await sleep(650 + Math.random() * 700); // polite, about what scrolling Zillow's list does
      if (me.stop || rk !== me) break;
      me.loading = p; renderRank();
      const t2 = Date.now();
      const x = await A.apiPage(qs, p, false);
      if (rk !== me) return true;
      if (!x || x.blocked) { me.blocked = true; break; } if (x.err) break;
      const fresh = addItems(x.items); me.pages = p; me.times.push(Date.now() - t2); if (me.times.length > 8) me.times.shift();
      if (!fresh) { if (++misses >= 2) break; } else { misses = 0; toServer(x.items); }
      renderRank();
    }
    return true;
  }
  async function rankLoop(url) {
    const me = rk; let misses = 0; me.running = true; me.blocked = false; me.stop = false; me.next = null;
    while (url && !me.stop && me.pages < RANK_MAX) {
      const vk = keyOf(url) + new URL(url).search; if (me.visited.has(vk)) break; me.visited.add(vk);
      me.loading = me.pages + 1; renderRank();
      const t1 = Date.now();
      await sleep(1100 + Math.random() * 1400); // polite: about one page every 1-2.5 seconds, like a person clicking "next"
      if (me.stop) { me.visited.delete(vk); me.next = url; break; }
      let html = "";
      try { const res = await fetch(url, { credentials: "include" }); if (res.status === 403 || res.status === 429) { me.blocked = true; me.visited.delete(vk); me.next = url; break; } if (!res.ok) break; html = await res.text(); } catch { me.next = url; me.visited.delete(vk); break; }
      if (html.length < 80000 && /captcha|are you a robot|access denied|px-captcha|cf-chl|datadome|geo\.captcha|unusual traffic/i.test(html)) { me.blocked = true; me.visited.delete(vk); me.next = url; break; }
      const doc = new DOMParser().parseFromString(html, "text/html");
      let got = []; try { got = A.cardsFrom(doc, url); } catch { got = []; }
      const fresh = addItems(got); me.pages++; me.times.push(Date.now() - t1); if (me.times.length > 8) me.times.shift();
      if (!fresh) { if (++misses >= 2) break; } else { misses = 0; toServer(got); }
      if (rk !== me) return;
      renderRank();
      const nx = RHS.nextPageUrl(doc, url);
      url = (nx && !me.visited.has(keyOf(nx) + new URL(nx).search) ? nx : null) || (me.tpl ? me.tpl(me.pages + 1) : null) || guessNext(url, me.pages);
    }
    if (rk !== me) return;
    finishRank(me);
  }
  function finishRank(me) {
    me.running = false; me.loading = 0; me.doneAt = Date.now(); me.secs = Math.max(0.1, Math.round((me.doneAt - me.t0) / 100) / 10); me.ver = (me.ver || 0) + 1;
    renderRank(true); saveRank(); uploadScores();
    // v0.8: then read the best 30 listings in full (v0.12: not on sites that guard against bots; there it's one click)
    if (!me.stop && me.items.size >= 5) deepCheck(A.noAutoDeep ? 20 : 30, !!A.noAutoDeep);
    // v0.13: how good is the fair price here? Test it on the homes of this very search (5-fold) and say it
    setTimeout(() => { try { if (rk === me) { me.acc = accuracy(); renderRank(true); } } catch { /* not enough homes */ } }, 50);
    send({ t: "track", kind: "rank_done", meta: { portal: A.id, pages: me.pages, n: me.items.size, blocked: me.blocked, api: !!me.api, secs: Math.round((Date.now() - me.t0) / 1000) } });
  }
  // v0.12: you moved the map or changed a filter: the ranking follows (after you stop moving for a moment)
  function followArea() {
    if (!rk || rk.restored || prefs.rkFollow === false || isDet()) return;
    if (rk.src === location.href) return;
    clearTimeout(followArea.t);
    rk.moving = true; renderRank(true);
    followArea.t = setTimeout(() => { if (rk && !rk.restored && rk.src !== location.href && !isDet()) startRank(true); }, 1600);
  }
  // v0.7: keep the last ranking of this site, to reopen it without reading the pages again
  function accuracy() {
    const use = [...rk.items.values()].map((x) => x.f).filter((f) => f.status !== "off" && f.status !== "short" && (f.deal || "sale") === (rk.deal || "sale") && f.price > 0);
    if (use.length < 60) return null;
    const E = [];
    for (let k = 0; k < 5; k++) { const train = use.filter((_, i) => i % 5 !== k).map((f) => ({ ...f, _zest: null })); const P = RHS.fairPredictor(train); if (!P) continue; for (const f of use.filter((_, i) => i % 5 === k)) { const p = P.predict({ ...f, _zest: null }); if (p) E.push(Math.abs(Math.log(f.price / p.fair))); } }
    if (E.length < 30) return null; E.sort((a, b) => a - b);
    return { err: Math.round((Math.exp(E[E.length >> 1]) - 1) * 100), n: E.length };
  }
  function saveRank() {
    if (!rk || rk.items.size < 3) return;
    ranked();
    // v0.13: every home (not only the top 300), with its parts, so a listing opened later uses the same comparables and can
    // say exactly what changed and why
    const byDeal = { sale: [], rent: [] };
    for (const x of rk._cache.list) if (x.f.status !== "off" && x.f.status !== "short") byDeal[x.f.deal === "rent" ? "rent" : "sale"].push(x);
    for (const k in byDeal) byDeal[k].sort((a, b) => b.r.score - a.r.score);
    const list = [...byDeal.sale, ...byDeal.rent].slice(0, 1500);
    const posOf = new Map(); for (const k in byDeal) byDeal[k].forEach((x, i) => posOf.set(x, i + 1));
    lastRank = { host: HOST, src: location.href.split("#")[0], title: ((document.querySelector("h1") || {}).textContent || document.title).trim().slice(0, 110), pages: rk.pages,
      n: byDeal.sale.length, nr: byDeal.rent.length, items: list.map((x) => ({ url: x.url, s: x.r.score, p: posOf.get(x), pts: Object.fromEntries(x.r.parts.map((q) => [q.k, q.pts])), fl: x.r.flags.map((q) => q.k), f: { deal: x.f.deal || "sale", lat: x.f.lat ?? null, lng: x.f.lng ?? null, tax: x.f.tax || null, _zest: x.f._zest || null, rentEst: x.f.rentEst || null, hoa: x.f.hoa || null, sub: x.f.sub || null, loc: x.f.loc || null, status: x.f.status || null, price: x.f.price, currency: x.f.currency, sqm: x.f.sqm, rooms: x.f.rooms, baths: x.f.baths || null, year: x.f.year || null, lot: x.f.lot || null, drop: x.f.drop || null, days: x.f.days ?? null, img: x.f.img || null, ptype: x.f.ptype || null, zip: x.f.zip || null, city: x.f.city || null, area: x.f.area || "", title: (x.f.title || "").slice(0, 90), desc: x.f.deep ? (x.f.desc || "").slice(0, 1200) : (x.f.desc || "").slice(0, 200), deep: !!x.f.deep, tenure: x.f.tenure || null } })) };
    send({ t: "lastRank", save: lastRank });
  }
  function openLastRank() {
    if (!lastRank) return;
    rk = { items: new Map(), pages: lastRank.pages || 1, running: false, stop: true, blocked: false, visited: new Set(), onlySqm: false, t0: Date.now(), restored: lastRank.t, times: [] };
    for (const x of lastRank.items) rk.items.set(keyOf(x.url), { url: x.url, f: { ...x.f, _enriched: false }, page: 1 });
    renderRank(true);
  }
  // v0.8: open the best homes one by one (politely, in the background) and read the whole listing: description, photos,
  // map point, year, bathrooms, plot, days listed and every red-flag word. Then score them again with everything, map included.
  // v0.8: open the best homes one by one (politely, in the background) and read the whole listing: description, photos,
  // map point, year, bathrooms, plot, days listed and every red-flag word. Then score them again with everything.
  // v0.13: it always checks the CURRENT top (the list re-sorts as checks land), until the top n are all read in full.
  async function readOne(x) {
    const res = await fetch(x.url, { credentials: "include" });
    if (res.status === 403 || res.status === 429) return "blocked";
    if (!res.ok) return "skip";
    const html = await res.text();
    if (html.length < 80000 && /captcha|are you a robot|access denied|px-captcha|cf-chl|datadome/i.test(html)) return "blocked";
    const doc = new DOMParser().parseFromString(html, "text/html");
    let d = null; try { d = (A.detailFrom && A.detailFrom(doc, x.url)) || RHS.genericDetail(doc, x.url, RHS.recipe || null); } catch { d = null; }
    const body = ((doc.body && doc.body.textContent) || "").replace(/\s+/g, " ");
    RHS.mergeDeep(x.f, d || {}, d && d.structured ? "" : body.slice(0, 12000));
    if (!x.f._mref) { x.f._mref = undefined; await attachMref([x.f], [x.url]); }
    return "ok";
  }
  async function deepCheck(n, auto) {
    if (!rk || (rk.deep && rk.deep.running)) return;
    const me = rk;
    const pending = () => ranked().list.slice(0, n).filter((x) => !x.f.deep && !x.f._tried);
    if (!pending().length) return;
    me.deep = { running: true, done: 0, total: pending().length, stop: false, auto: !!auto }; renderRank(true);
    send({ t: "track", kind: auto ? "rank_verify" : "rank_deep", meta: { n } });
    let geo = 0, steps = 0;
    while (!me.deep.stop && rk === me && steps < n * 2) {
      const next = pending()[0]; if (!next) break;
      me.deep.total = me.deep.done + pending().length;
      await sleep(auto ? 2600 + Math.random() * 2400 : 900 + Math.random() * 1300); // automatic checks go slower: a person reading
      if (me.deep.stop || rk !== me) break;
      next.f._tried = true; steps++;
      let st = "skip"; try { st = await readOne(next); } catch { st = "skip"; }
      if (st === "blocked") { me.deep.blocked = true; break; }
      const f = next.f;
      if (st === "ok" && f.lat != null && geo < 12) { geo++; send({ t: "nearby", lat: f.lat, lng: f.lng }).then((loc) => { f._loc = loc || null; if (rk === me) { me.ver = (me.ver || 0) + 1; renderRank(); } }); }
      me.deep.done++; me.ver = (me.ver || 0) + 1; renderRank();
    }
    me.deep.running = false; me.ver = (me.ver || 0) + 1; renderRank(true); saveRank(); uploadScores();
  }
  // v0.10: send the final scores (after reading the best ones in full) so the top homes appear on realhunt.co
  async function uploadScores() {
    if (!rk || !state.consent) return;
    const { list } = ranked(); const items = []; let top = 0;
    for (const x of list) { let path = ""; try { path = new URL(x.url).pathname; } catch { continue; } const f = x.f; if (!f.price || !(f.sqm || f.rooms)) continue;
      if (x.r.score >= 85) top++;
      items.push({ h: await RHS.hash(`${A.id}:${path}`), ...scoreOf(x.r, f), portal: A.id, pp: ppOf(f), cur: f.currency, rooms: f.rooms || null, ten: tenOf(f), ...factsOf(f), lat: f.lat ?? null, lng: f.lng ?? null, area: f.area || "", price: f.price, sqm: f.sqm, url: x.url.split("?")[0], country: f.country }); }
    for (let i = 0; i < items.length; i += 60) send({ t: "cards", rank: true, portal: A.id, area: A.areaKey(), city: cityHint(null), items: items.slice(i, i + 60), top: i ? 0 : top });
    rk.uploaded = items.length; rk.topN = top; renderRank(true);
  }
  function ranked() {
    const all = [...rk.items.values()];
    const pp = all.map((x) => (x.f.price && x.f.sqm ? x.f.price / x.f.sqm : null)).filter(Boolean);
    const bench = pp.length >= 5 ? RHS.median(pp) : null;
    // v0.8: one fair-price model over every home read so far (size, bedrooms, bathrooms, lot, age, type, exact area)
    if (!rk._cache || rk._cache.n !== all.length || rk._cache.v !== rk.ver) {
      all.forEach((x) => RHS.enrich(x.f));
      const RS = RHS.scoreGroup(all.map((x) => x.f), { profile: profileFor(rk.deal || RHS.pageDeal), loc: null });
      rk._cache = { n: all.length, v: rk.ver, list: all.map((x, i) => ({ ...x, r: RS[i] })) };
    }
    let out = rk._cache.list;
    rk.off = out.filter((x) => x.f.status === "off").length;
    const F = rk.flt || {};
    const mp = prefs.myPlace;
    for (const x of out) x.km = mp && x.f.lat != null ? RHS.km(x.f.lat, x.f.lng, mp.lat, mp.lng) : null;
    rk.deals = { sale: 0, rent: 0 }; for (const x of out) if (x.f.status !== "off" && x.f.status !== "short") rk.deals[x.f.deal === "rent" ? "rent" : "sale"]++;
    if (!rk.deal) rk.deal = rk.deals.rent > rk.deals.sale ? "rent" : "sale";
    const seenAP = new Set();
    const inDeal = out.filter((x) => { if (x.f.status === "off" || x.f.status === "short" || (x.f.deal === "rent" ? "rent" : "sale") !== rk.deal) return false;
      const ap = String(x.f.title || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40) + "|" + x.f.price + "|" + (x.f.sqm || ""); if (ap.length > 12 && seenAP.has(ap)) return false; seenAP.add(ap); return true; }); // the same home listed twice
    rk.base = inDeal; // v0.12: for the score histogram and the quick chips (before your filters)
    out = inDeal.filter((x) => (!prefs.rkHideNo || !taste || taste.get(keyOf(x.url)) !== -1) && (!prefs.rkOnlyDeep || x.f.deep) && (!rk.onlySqm || x.f.sqm) && (!rk.newOnly || (x.f.days != null && x.f.days <= 3)) && (!F.pmax || x.f.price <= F.pmax) && (!F.smin || (x.f.sqm || 0) >= F.smin) && (!F.rmin || (x.f.rooms || 0) >= F.rmin) && (!F.scmin || x.r.score >= F.scmin));
    const S = rk.sort || "score";
    const fit = (x) => (x.r.parts.find((p) => p.k === "fit") || {}).pts || 0;
    const by = {
      near: (a, b) => (a.km ?? 1e9) - (b.km ?? 1e9) || b.r.score - a.r.score,
      fairgap: (a, b) => (a.r.pct ?? 999) - (b.r.pct ?? 999),
      ppsqm: (a, b) => (a.r.ppsqm || 1e12) - (b.r.ppsqm || 1e12),
      price: (a, b) => a.f.price - b.f.price,
      fit: (a, b) => fit(b) - fit(a) || b.r.score - a.r.score,
      new: (a, b) => (a.f.days ?? 1e6) - (b.f.days ?? 1e6) || b.r.score - a.r.score,
      cut: (a, b) => (b.f.drop || 0) / (b.f.price || 1) - (a.f.drop || 0) / (a.f.price || 1) || b.r.score - a.r.score,
      big: (a, b) => (b.f.sqm || 0) - (a.f.sqm || 0) || b.r.score - a.r.score,
      score: (a, b) => b.r.score - a.r.score || (a.r.pct ?? 0) - (b.r.pct ?? 0),
    };
    out.sort(by[S] || by.score);
    return { list: out, bench, cur: (all[0] && all[0].f.currency) || "EUR", total: all.length };
  }
  const csvCell = (v) => { const x = String(v ?? ""); return /[",\n;]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
  // v0.12: what a home for sale costs a month with a typical mortgage (20% down, 30 years, the usual rate there)
  const RATE = { USD: 6.5, GBP: 4.6, EUR: 3.4, CAD: 4.9, AUD: 6.2, CHF: 1.9, SEK: 3.6, NOK: 5.2, DKK: 4, NZD: 6.4 };
  const mortgage = (f) => { if (!f.price || f.deal === "rent") return null; const r = (RATE[f.currency] || 5) / 1200, n = 360, P = f.price * 0.8; return Math.round((P * r) / (1 - Math.pow(1 + r, -n))); };
  const ago = (t) => { const s2 = Math.round((Date.now() - t) / 1000); return s2 < 60 ? T("ago_s", [String(Math.max(1, s2))]) : s2 < 3600 ? T("ago_m", [String(Math.round(s2 / 60))]) : T("ago_h", [String(Math.round(s2 / 3600))]); };
  function toast(html, ms) {
    const { h, sh } = host("div"); const d = document.createElement("div"); d.className = "toast"; d.innerHTML = html; sh.appendChild(d);
    document.documentElement.appendChild(h); setTimeout(() => { d.classList.add("out"); setTimeout(() => h.remove(), 400); }, ms || 4500);
    return d;
  }
  // v0.12: a picture of your top 3, made for sharing (WhatsApp, X, Instagram stories)
  async function sharePng(L) {
    const W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    const g2 = x.createLinearGradient(0, 0, 0, H); g2.addColorStop(0, "#0F6B34"); g2.addColorStop(1, "#08391c"); x.fillStyle = g2; x.fillRect(0, 0, W, H);
    x.fillStyle = "#FFE14D"; x.font = "800 54px system-ui,sans-serif"; x.fillText("⚡ RealHunt Score", 70, 120);
    x.fillStyle = "#fff"; x.font = "600 36px system-ui,sans-serif";
    const place = (rk.place || A.areaKey() || HOST).slice(0, 40);
    x.fillText(T("png_sub", [String(rk.items.size), place]).slice(0, 60), 70, 180);
    const top = L.slice(0, 3);
    for (let i = 0; i < top.length; i++) {
      const y = 250 + i * 330, it = top[i];
      x.fillStyle = "rgba(255,255,255,.96)"; x.beginPath(); x.roundRect ? x.roundRect(60, y, W - 120, 300, 36) : x.rect(60, y, W - 120, 300); x.fill();
      x.fillStyle = RHS.color(it.r.score); x.beginPath(); x.arc(190, y + 150, 95, 0, Math.PI * 2); x.fill();
      x.fillStyle = "#fff"; x.font = "800 86px system-ui,sans-serif"; x.textAlign = "center"; x.fillText(String(it.r.score), 190, y + 180); x.textAlign = "left";
      x.fillStyle = "#14181c"; x.font = "800 56px system-ui,sans-serif"; x.fillText(`${["🥇", "🥈", "🥉"][i]} ${MP(it.f.price, it.f)}`, 320, y + 105);
      x.font = "600 36px system-ui,sans-serif"; x.fillStyle = "#3b4540";
      x.fillText([it.f.rooms ? it.f.rooms + " " + T("rank_rooms") : "", it.f.sqm ? it.f.sqm + " m²" : "", it.r.pct != null && it.r.pct < -2 ? `${Math.abs(it.r.pct)}% ${T("under_fair")}` : ""].filter(Boolean).join(" · ").slice(0, 44), 320, y + 165);
      x.fillStyle = "#6b746f"; x.font = "500 30px system-ui,sans-serif"; x.fillText(String(it.f.title || it.f.area || "").slice(0, 42), 320, y + 220);
    }
    x.fillStyle = "#fff"; x.font = "700 38px system-ui,sans-serif"; x.fillText(T("png_cta"), 70, H - 110);
    x.fillStyle = "#FFE14D"; x.font = "800 44px system-ui,sans-serif"; x.fillText("realhunt.co", 70, H - 50);
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    let copied = false; try { await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); copied = true; } catch { /* not allowed here */ }
    const href = URL.createObjectURL(blob); const el = document.createElement("a"); el.href = href; el.download = `realhunt-top3-${A.id}-${new Date().toISOString().slice(0, 10)}.png`; el.click(); setTimeout(() => URL.revokeObjectURL(href), 4000);
    return copied;
  }
  let rkEl = null, rkT = 0;
  function renderRank(force) {
    if (!rk) return;
    const now = Date.now(); if (!force && (rk.running || (rk.deep && rk.deep.running)) && now - rkT < 350) { clearTimeout(renderRank.t); renderRank.t = setTimeout(() => renderRank(true), 360); return; } rkT = now;
    const old = rkEl && rkEl.shadowRoot;
    const scroll = old && old.querySelector(".rk-l") ? old.querySelector(".rk-l").scrollTop : 0;
    // v0.7: keep the cursor in a filter box while the list refreshes underneath
    const ae = old && old.activeElement; const focusF = ae && ae.dataset && ae.dataset.f; const caret = ae && ae.selectionStart != null ? (() => { try { return ae.selectionStart; } catch { return null; } })() : null; const typedV = ae && focusF ? ae.value : null;
    const hadFocus = rkEl && document.activeElement === rkEl;
    if (rkEl) rkEl.remove();
    const { h, sh } = host("div"); rkEl = h; h.tabIndex = -1;
    const { list, bench, cur } = ranked();
    rk.pos = new Map(list.map((x, i) => [keyOf(x.url), { r: x.r, i: i + 1, deep: !!x.f.deep }]));
    clearTimeout(renderRank.pb); renderRank.pb = setTimeout(() => { if (lastScan.length) paintBadges(); }, 60);
    const best = list[0];
    // v0.12: a 90+ appears while ranking: tell at once
    if (best && best.r.score >= 90 && rk.toasted !== best.url && (rk.running || (rk.deep && rk.deep.running) || !rk.toasted)) { rk.toasted = best.url; toast(`<b style="background:${RHS.color(best.r.score)}">🔥 ${best.r.score}</b><span>${esc(T("toast_found"))} · ${esc(MP(best.f.price, best.f))}${best.f.rooms ? " · " + best.f.rooms + " " + esc(T("rank_rooms")) : ""}</span>`); }
    const hot = (rk.base || []).filter((x) => x.r.score >= 85).length;
    send({ t: "rankBadge", n: hot });
    if (rk.min) {
      const pill = document.createElement("div"); pill.className = "rkpill" + (prefs.rkDock === "right" ? " rt" : "");
      pill.innerHTML = `⚡ <b>${rk.items.size}</b> ${esc(T("pill_homes"))}${best ? ` · ${esc(T("pill_best"))} <i style="background:${RHS.color(best.r.score)}">${best.r.score}</i>` : ""}${rk.running || rk.moving ? " ⏳" : ""}`;
      pill.addEventListener("click", () => { rk.min = false; renderRank(true); });
      sh.appendChild(pill); document.documentElement.appendChild(h); return;
    }
    let st = rk.running ? (rk.api ? T("rank_loading_api", [String(rk.items.size), String(rk.total || "…")]) : T("rank_loading", [String(rk.loading || rk.pages), String(rk.items.size)])) : rk.blocked ? T("rank_blocked", [String(rk.items.size), String(rk.pages)]) : rk.api ? T("rank_done_api", [String(rk.items.size), String(rk.secs || "")]) : T("rank_done", [String(rk.items.size), String(rk.pages)]);
    if (rk.deep && rk.deep.running) st = rk.deep.auto ? T("rank_verify", [String(rk.deep.done), String(rk.deep.total)]) : T("rank_deep", [String(rk.deep.done), String(rk.deep.total)]);
    if (rk.restored) st = T("rank_restored", [String(rk.items.size), new Date(rk.restored).toLocaleDateString(RHS.lang, { day: "numeric", month: "short" })]);
    if (rk.moving) st = "🗺 " + T("rank_moving");
    // progress and time left, when the site tells how many homes the search has
    let prog = 100, eta = "";
    if (rk.total) { prog = Math.min(100, Math.round((rk.items.size / rk.total) * 100)); }
    if (rk.running && rk.total && rk.times.length && !rk.api) { const per = rk.times.reduce((a, b) => a + b, 0) / rk.times.length; const left = Math.max(0, Math.ceil((rk.total - rk.items.size) / Math.max(1, rk.perPage))); const mins = Math.max(1, Math.round((Math.min(left, RANK_MAX - rk.pages) * per) / 60000)); if (left > 0) eta = " · " + T("rank_eta", [String(mins)]); }
    // v0.12: how the scores spread, in 10 bars you can click (shows that score and up)
    const base = rk.base || [];
    const bins = Array(10).fill(0); for (const x of base) bins[Math.min(9, Math.floor(x.r.score / 10))]++;
    const bmax = Math.max(1, ...bins); const F = rk.flt || {};
    const hist = base.length >= 5 ? `<div class="hist7">${bins.map((n, i) => `<button data-a="hb" data-v="${i * 10}" title="${i * 10}–${i * 10 + 9}: ${n}" class="${F.scmin && F.scmin <= i * 10 ? "on" : ""}"><i style="height:${Math.max(n ? 3 : 0, Math.round((n / bmax) * 26))}px;background:${RHS.color(i * 10 + 5)}"></i></button>`).join("")}</div>
      <div class="bands">${[[90, "🏆"], [80, "🔥"], [70, "👍"]].map(([v, e]) => `<span>${e} ${v}+ <b>${base.filter((x) => x.r.score >= v).length}</b></span>`).join("")}</div>` : "";
    const n80 = base.filter((x) => x.r.score >= 80).length, nNew = base.filter((x) => x.f.days != null && x.f.days <= 3).length;
    const dockR = prefs.rkDock === "right";
    const rows = list.slice(0, 300).map((x, i) => { const f = x.f, r = x.r; const k = keyOf(x.url);
      const pct = r.pct != null && Math.abs(r.pct) >= 3 ? `<i style="background:${r.pct < 0 ? "#E3F4E8;color:#0F6B34" : "#FBE9E5;color:#C2412D"}">${r.pct < 0 ? "−" : "+"}${Math.abs(r.pct)}%</i>` : "";
      const seen = recent && recent.has(x.url.split("?")[0]) ? ` <i title="${esc(T("seen_before"))}" style="background:#eef0f2;color:#14181c">👁</i>` : "";
      const mo = mortgage(f);
      const facts = [f.baths ? f.baths + " " + T("baths_short") : "", f.year ? "🏗 " + f.year : "", f.drop ? "↓ " + RHS.money(f.drop, f.currency) : "", r.fair ? T("fair_short") + " ≈ " + RHS.money(RHS.nice(r.fair), f.currency) + (r.range ? " " + T("fair_range", [String(r.range)]) : "") : "", mo ? "≈ " + RHS.money(mo + (f.hoa || 0), f.currency) + T("per_month") + (f.hoa ? ` (${T("hoa_mo")} ${RHS.money(f.hoa, f.currency)})` : "") : "", f.rentEst && f.deal !== "rent" && f.price ? `${T("yield_short")} ${((f.rentEst * 12 / f.price) * 100).toFixed(1)}%` : ""].filter(Boolean).join(" · ");
      const fl = r.flags && r.flags.length ? ` <i style="background:#FBE9E5;color:#C2412D" title="${esc(r.flags.map((y) => y.label).join("; "))}">⚠ ${esc(r.flags[0].label.slice(0, 26))}</i>` : "";
      const tl = taste && taste.get(k); const likeM = tl === 1 ? " ♥" : tl === -1 ? " 👎" : "";
      const kmM = x.km != null ? ` <i style="background:#eef0f2;color:#14181c" title="${esc(T("my_place"))}">🏢 ${x.km < 1 ? Math.round(x.km * 1000) + " m" : x.km.toFixed(1) + " km"}</i>` : "";
      const deep = f.deep ? ` <i style="background:#E3F4E8;color:#0F6B34" title="${esc(T("deep_done"))}">✓</i>` : "";
      const nw = f.days != null && f.days <= 3 ? ` <i style="background:#E8F0FE;color:#1A56C4">🆕 ${f.days ? f.days + "d" : T("today")}</i>` : f.days != null && f.days > 60 ? ` <i style="background:#eef0f2;color:#5b636b" title="${esc(T("days_listed"))}">🕒 ${f.days}d</i>` : "";
      const pv = rk.prev && rk.prev.get(k); const chg = pv && Math.abs(pv - f.price) / f.price > 0.005 ? ` <i style="background:${f.price < pv ? "#E3F4E8;color:#0F6B34" : "#FBE9E5;color:#C2412D"}" title="${esc(T("since_last_rank"))}">${f.price < pv ? "↓" : "↑"} ${esc(RHS.money(Math.abs(pv - f.price), f.currency))}</i>` : "";
      const onPage = lastScan.some((y) => y.c.el && y.c.el.isConnected && keyOf(y.c.url) === k);
      const tip = r.parts.map((p2) => `${T("part_" + p2.k) || p2.label}: ${p2.na ? "—" : p2.pts + "/" + p2.max}`).join("\n");
      const th = f.img ? `<img class="th" src="${esc(f.img)}" loading="lazy" alt="" referrerpolicy="no-referrer">` : "";
      return `<a class="rk-r${i === 0 && r.score >= 70 ? " first" : ""}${rk.sel === i ? " sel" : ""}" data-k="${esc(k)}" data-i="${i}" href="${esc(x.url)}" target="_blank" rel="noopener"><span class="n">${i === 0 && r.score >= 70 ? "👑" : i + 1}</span><span class="sc${f.deep ? " ok" : " pv"}" style="background:${RHS.color(r.score)}" title="${esc((f.deep ? "✓ " + T("verified") : r.check ? "⚠ " + T("check_tip") : T("unverified_tip")) + "\n\n" + tip)}">${f.deep ? "" : "≈"}${r.score}${r.check ? "<em>⚠</em>" : f.deep ? "<em>✓</em>" : ""}</span>${th}<span class="d"><b>${esc(MP(f.price, f))}</b>${f.sqm ? ` · ${f.sqm} m²` : ""}${f.rooms ? ` · ${f.rooms} ${esc(T("rank_rooms"))}` : ""}${pct}${chg}${nw}${likeM}${deep}${kmM}${seen}${fl}${facts ? `<span class="fx">${esc(facts)}</span>` : ""}<span>${esc((f.title || f.area || f.desc || "").slice(0, 90))}</span></span>${onPage ? `<button class="pin" data-a="pin" data-k="${esc(k)}" title="${esc(T("show_on_page"))}">📍</button>` : ""}</a>`; }).join("");
    const anyF = !!(F.pmax || F.smin || F.rmin || F.scmin || rk.newOnly || rk.onlySqm || prefs.rkOnlyDeep);
    const empty = `<div class="empty">${rk.running || rk.moving ? `⏳ ${esc(T("rank_wait"))}` : anyF ? `🔎 ${esc(T("rank_empty_f"))}<br><button class="go" data-a="clearf">✕ ${esc(T("clear_filters"))}</button>` : esc(T("rank_empty"))}</div>`;
    const div = document.createElement("div"); div.className = "rk" + (dockR ? " rt" : "");
    div.innerHTML = `<div class="rk-h"><div class="top"><b>⚡ ${esc(T("rank_title"))}</b><span class="sp"></span><button class="ic" data-a="refresh" title="${esc(T("rank_refresh"))}">↻</button><button class="ic" data-a="dock" title="${esc(T("rank_dock"))}">${dockR ? "⇤" : "⇥"}</button><button class="ic" data-a="min" title="${esc(T("rank_min"))}">–</button><button class="x" data-a="close" aria-label="Close">×</button></div>
      ${rk.place ? `<div class="plc" title="${esc(rk.place)}">📍 ${esc(rk.place.slice(0, 60))}</div>` : ""}
      <div class="st">${esc(st)}${esc(eta)}${bench ? " · " + esc(T("rank_median")) + " " + esc(RHS.money(bench, cur)) + "/m²" + (rk.deal === "rent" ? esc(T("per_month")) : "") : ""}${rk.doneAt && !rk.running && !rk.moving ? ` · <span class="ago">${esc(ago(rk.doneAt))}</span>` : ""}</div>
      ${rk.acc ? `<div class="st acc">🎯 ${esc(T("acc_line", [String(rk.acc.err), String(rk.acc.n)]))}</div>` : ""}
      <div class="rk-bar${rk.running || rk.moving || (rk.deep && rk.deep.running) ? " run" : ""}"><i style="width:${rk.deep && rk.deep.running ? Math.max(4, Math.round((rk.deep.done / rk.deep.total) * 100)) : rk.running ? Math.max(4, prog) : 100}%"></i></div>
      ${hist}
      <div class="rk-tools"><button data-a="hot" class="${F.scmin === 80 ? "on" : ""}">🔥 80+ (${n80})</button>${nNew ? `<button data-a="new" class="${rk.newOnly ? "on" : ""}">🆕 ≤3d (${nNew})</button>` : ""}<button data-a="follow" class="${prefs.rkFollow === false ? "" : "on"}" title="${esc(T("rank_follow_tip"))}">🗺 ${esc(T("rank_follow"))}</button>${rk.running ? `<button data-a="stop">${esc(T("rank_stop"))}</button>` : rk.next && !rk.restored ? `<button class="go" data-a="resume">▶ ${esc(T("rank_continue"))}</button>` : ""}<button data-a="more" class="${rk.more ? "on" : ""}">⋯ ${esc(T(rk.more ? "less" : "more"))}</button>${rk.more ? `<span class="more">` : `<span class="more" hidden>`}<button data-a="sqm" class="${rk.onlySqm ? "on" : ""}">${esc(T("rank_only_sqm"))}</button><button data-a="onlydeep" class="${prefs.rkOnlyDeep ? "on" : ""}">✓ ${esc(T("rank_only_deep"))}</button><button data-a="hideno" class="${prefs.rkHideNo ? "on" : ""}">👎 ${esc(T("rank_hide_no"))}</button>${!rk.running && !(rk.deep && rk.deep.running) && list.length ? `<button class="go" data-a="deep">🔍 ${esc(T("rank_deep_btn"))}</button>` : ""}${rk.deep && rk.deep.running ? `<button data-a="deepstop">${esc(T("rank_stop"))}</button>` : ""}${rk.deals && rk.deals.sale && rk.deals.rent ? `<button data-a="dsale" class="${rk.deal === "sale" ? "on" : ""}">🏠 ${esc(T("deal_sale"))} (${rk.deals.sale})</button><button data-a="drent" class="${rk.deal === "rent" ? "on" : ""}">🔑 ${esc(T("deal_rent"))} (${rk.deals.rent})</button>` : ""}</span><button class="go" data-a="png">📸 ${esc(T("rank_png"))}</button><span class="more"${rk.more ? "" : " hidden"}><button data-a="cmp3">⇄ ${esc(T("rank_cmp3"))}</button><button data-a="top10">⧉ ${esc(T("rank_copy10"))}</button><button data-a="csv">CSV</button><button data-a="rshare">↗ ${esc(T("rank_share"))}</button></span></div>
      <div class="rk-filt"><label>${esc(T("f_pmax"))}<input type="number" data-f="pmax" value="${F.pmax || ""}" placeholder="—"></label><label>m² ≥<input type="number" data-f="smin" value="${F.smin || ""}" placeholder="—"></label><label>${esc(T("rank_rooms"))} ≥<input type="number" data-f="rmin" value="${F.rmin || ""}" placeholder="—"></label><label>${esc(T("f_score"))} ≥<input type="number" data-f="scmin" value="${F.scmin || ""}" placeholder="—"></label>${anyF ? `<button class="clr" data-a="clearf" title="${esc(T("clear_filters"))}">✕</button>` : ""}
        <select data-f="sort">${["score", "fairgap", "ppsqm", "price", "fit", "new", "cut", "big"].concat(prefs.myPlace ? ["near"] : []).map((k) => `<option value="${k}"${(rk.sort || "score") === k ? " selected" : ""}>${esc(T("sort_" + k))}</option>`).join("")}</select></div>
      ${rk.city ? `<a class="cta sm2" href="${esc(rk.city.url)}?utm_source=extension&utm_medium=ranking" target="_blank" rel="noopener" data-a="site">🏆 ${esc(T("top10_city", [rk.city.name]))} →</a>` : ""}
      ${list.length !== rk.items.size ? `<div class="st">${esc(T("rank_showing", [String(list.length), String(rk.items.size)]))}${rk.off ? " · " + esc(T("hidden_off", [String(rk.off)])) : ""}</div>` : ""}
      <div class="st">${esc(T(A.noAutoDeep ? "rank_basis_manual" : "rank_basis"))} <span class="kb">↑↓ Enter · Esc</span></div>${rk.uploaded ? `<div class="st">🌍 ${esc(T("rank_uploaded", [String(rk.uploaded), String(rk.topN || 0)]))} <a href="https://realhunt.co/best?utm_source=extension&utm_medium=ranking" target="_blank" rel="noopener" data-a="site">realhunt.co/best →</a></div>` : ""}</div>
      <div class="rk-l">${rows || empty}</div>
      <div class="rk-f">${esc(T("rank_fine"))}</div>`;
    div.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-a]"); const a = btn && btn.dataset.a; if (!a) return;
      if (a !== "site") { if (btn.tagName === "BUTTON") { e.preventDefault(); e.stopPropagation(); } }
      if (a === "close") { rk.stop = true; if (rk.deep) rk.deep.stop = true; if (!rk.restored) saveRank(); rkEl.remove(); rkEl = null; rk = null; send({ t: "rankBadge", n: 0 }); for (const x of lastScan) { x.r = x.r0; x.pos = null; } paintBadges(); showFab(lastScan.length); return; }
      if (a === "stop") { rk.stop = true; }
      if (a === "min") { rk.min = true; renderRank(true); return; }
      if (a === "more") { rk.more = !rk.more; renderRank(true); return; }
      if (a === "dock") { prefs.rkDock = prefs.rkDock === "right" ? "left" : "right"; send({ t: "pref", rkDock: prefs.rkDock }); renderRank(true); return; }
      if (a === "refresh") { startRank(true); send({ t: "track", kind: "rank_refresh" }); return; }
      if (a === "follow") { prefs.rkFollow = prefs.rkFollow === false; send({ t: "pref", rkFollow: prefs.rkFollow }); renderRank(true); if (prefs.rkFollow) followArea(); return; }
      if (a === "hot") { rk.flt = { ...F, scmin: F.scmin === 80 ? 0 : 80 }; renderRank(true); send({ t: "track", kind: "rank_hot" }); return; }
      if (a === "new") { rk.newOnly = !rk.newOnly; renderRank(true); return; }
      if (a === "hb") { const v = +btn.dataset.v; rk.flt = { ...F, scmin: F.scmin === v ? 0 : v }; renderRank(true); return; }
      if (a === "clearf") { rk.flt = {}; rk.newOnly = false; rk.onlySqm = false; if (prefs.rkOnlyDeep) { prefs.rkOnlyDeep = false; send({ t: "pref", rkOnlyDeep: false }); } renderRank(true); return; }
      if (a === "pin") { const el = cardGlow(btn.dataset.k, true); if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => cardGlow(btn.dataset.k, false), 2600); } return; }
      if (a === "png") { const { list: L } = ranked(); if (!L.length) return; btn.textContent = "…"; sharePng(L).then((cp) => { btn.textContent = cp ? "✓ " + T("png_copied") : "✓ " + T("png_saved"); }); send({ t: "track", kind: "rank_png" }); return; }
      if (a === "deep") { deepCheck(30); }
      if (a === "dsale" || a === "drent") { rk.deal = a === "drent" ? "rent" : "sale"; rk.ver = (rk.ver || 0) + 1; renderRank(true); }
      if (a === "cmp3") { const { list: L } = ranked(); (async () => { await send({ t: "compare", op: "clear" }); for (const x of L.slice(0, 3)) await send({ t: "compare", op: "add", item: { url: x.url, portal: A.id, price: x.f.price, cur: x.f.currency, sqm: x.f.sqm, rooms: x.f.rooms, score: x.r.score, pct: x.r.pct, area: x.f.area || x.f.city || "" } }); const r = await send({ t: "compare", op: "open" }); btn.textContent = r && r.url ? "✓" : T(r && r.error === "few" ? "compare_hint" : "consent_needed"); })(); }
      if (a === "deepstop" && rk.deep) { rk.deep.stop = true; }
      if (a === "resume" && rk.next) { const u = rk.next; rk.next = null; rankLoop(u); send({ t: "track", kind: "rank_resume" }); }
      if (a === "sqm") { rk.onlySqm = !rk.onlySqm; renderRank(true); }
      if (a === "onlydeep") { prefs.rkOnlyDeep = !prefs.rkOnlyDeep; send({ t: "pref", rkOnlyDeep: prefs.rkOnlyDeep }); renderRank(true); }
      if (a === "hideno") { prefs.rkHideNo = !prefs.rkHideNo; send({ t: "pref", rkHideNo: prefs.rkHideNo }); loadTaste(true).then(() => renderRank(true)); }
      if (a === "site") { send({ t: "track", kind: "to_site", meta: { where: "ranking" } }); return; }
      if (a === "top10") {
        const { list: L } = ranked();
        const txt = [`⚡ RealHunt · ${((document.querySelector("h1") || {}).textContent || document.title).trim().slice(0, 80)}`, ...L.slice(0, 10).map((x, i) => `${i + 1}. ${x.r.score}/100 · ${RHS.money(x.f.price, x.f.currency)}${x.f.sqm ? " · " + x.f.sqm + " m²" : ""}${x.f.rooms ? " · " + x.f.rooms + " " + T("rank_rooms") : ""} — ${x.url}`)].join("\n");
        copy(txt).then((ok) => { btn.textContent = ok ? "✓ " + T("copied") : T("try_again"); }); send({ t: "track", kind: "rank_copy10" });
      }
      if (a === "rshare") {
        const { list: L } = ranked(); btn.textContent = "…";
        send({ t: "shareRanking", title: ((document.querySelector("h1") || {}).textContent || document.title).trim().slice(0, 110), cc: RHS.siteCountry(location.hostname), city: rk.city ? rk.city.name : "", src: location.href.split("#")[0],
          items: L.slice(0, 300).map((x) => ({ url: x.url, portal: A.id, price: x.f.price, cur: x.f.currency, sqm: x.f.sqm, rooms: x.f.rooms, score: x.r.score, pct: x.r.pct, area: x.f.area || "" })) })
          .then((r) => { btn.textContent = r && r.url ? "✓ " + T("rank_shared") : (r && r.error === "consent" ? T("consent_needed") : T("try_again")); if (r && r.url) copy(r.url); });
      }
      if (a === "csv") { const { list: L } = ranked(); const csv = ["rank,score,deal,price,currency,fair_price,vs_fair_pct,sqm,price_per_sqm,bedrooms,bathrooms,year_built,price_drop,city,area,read_in_full,red_flags,title,url", ...L.map((x, i) => [i + 1, x.r.score, x.f.deal || "sale", x.f.price, x.f.currency, x.r.fair ? Math.round(x.r.fair) : "", x.r.pct ?? "", x.f.sqm || "", x.r.ppsqm ? Math.round(x.r.ppsqm * 100) / 100 : "", x.f.rooms || "", x.f.baths || "", x.f.year || "", x.f.drop || "", x.f.city || "", x.f.area || "", x.f.deep ? "yes" : "", (x.r.flags || []).map((y) => y.label).join("; "), x.f.title || "", x.url].map(csvCell).join(","))].join("\n");
        const href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })); const el = document.createElement("a"); el.href = href; el.download = `realhunt-ranking-${A.id}-${new Date().toISOString().slice(0, 10)}.csv`; el.click(); setTimeout(() => URL.revokeObjectURL(href), 4000); send({ t: "track", kind: "rank_csv", meta: { n: L.length } }); }
    });
    // hover a home here: its card on the page lights up
    let hk = null;
    div.addEventListener("mouseover", (e) => { const r = e.target.closest(".rk-r"); const k = r ? r.dataset.k : null; if (k === hk) return; if (hk) cardGlow(hk, false); hk = k; if (k) cardGlow(k, true); });
    div.addEventListener("mouseleave", () => { if (hk) cardGlow(hk, false); hk = null; });
    div.addEventListener("input", (e) => {
      const k = e.target.dataset && e.target.dataset.f; if (!k || k === "sort") return;
      rk.flt = { ...(rk.flt || {}), [k]: Number(e.target.value) || 0 }; clearTimeout(div._ft); div._ft = setTimeout(() => renderRank(true), 400);
    });
    div.addEventListener("change", (e) => { if (e.target.dataset && e.target.dataset.f === "sort") { rk.sort = e.target.value; const o = { ...(prefs.rkSort || {}) }; o[HOST] = rk.sort; prefs.rkSort = o; send({ t: "pref", rkSort: o }); renderRank(true); } });
    // v0.12: the keyboard: ↑ ↓ to move, Enter to open, Esc to minimise
    div.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      const rowsEl = [...sh.querySelectorAll(".rk-r")]; if (!rowsEl.length && e.key !== "Escape") return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "j" || e.key === "k") { e.preventDefault(); const d = e.key === "ArrowDown" || e.key === "j" ? 1 : -1; const i = Math.max(0, Math.min(rowsEl.length - 1, (rk.sel ?? -1) + d)); if (rk.sel != null && rowsEl[rk.sel]) { rowsEl[rk.sel].classList.remove("sel"); cardGlow(rowsEl[rk.sel].dataset.k, false); } rk.sel = i; rowsEl[i].classList.add("sel"); rowsEl[i].scrollIntoView({ block: "nearest" }); cardGlow(rowsEl[i].dataset.k, true); }
      else if (e.key === "Enter" && rk.sel != null && rowsEl[rk.sel]) { e.preventDefault(); window.open(rowsEl[rk.sel].href, "_blank", "noopener"); }
      else if (e.key === "Escape") { rk.min = true; renderRank(true); }
    });
    sh.appendChild(div); document.documentElement.appendChild(h);
    const l = sh.querySelector(".rk-l"); if (l) l.scrollTop = scroll;
    if (focusF) { const inp = sh.querySelector(`[data-f="${focusF}"]`); if (inp) { if (typedV != null && inp.value !== typedV) inp.value = typedV; inp.focus(); try { if (caret != null) inp.setSelectionRange(caret, caret); } catch { /* number inputs */ } } }
    else if (hadFocus) h.focus({ preventScroll: true });
    div.addEventListener("pointerdown", (e) => { if (!/^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(e.target.tagName)) h.focus({ preventScroll: true }); });
  }
  // keep "updated 2 min ago" true without redrawing the list
  every(() => { if (rk && rk.doneAt && rkEl && rkEl.shadowRoot) { const a2 = rkEl.shadowRoot.querySelector(".ago"); if (a2) a2.textContent = ago(rk.doneAt); } }, 15000);
  // Esc anywhere on the page (not while typing) minimises the ranking when no listing card is open
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !rk || rk.min || !rkEl || (cur && cur.open) || e.defaultPrevented || siteBusy()) return;
    const t2 = document.activeElement; if (t2 && /^(INPUT|TEXTAREA|SELECT)$/.test(t2.tagName)) return;
    rk.min = true; renderRank(true);
  });

  // ---------------------------------------------------------------- run, and re-run on SPA navigation
  let lastUrl = "";
  async function run() {
    if (dead) return;
    if (location.href === lastUrl) return; lastUrl = location.href; siteBusy.base = undefined;
    await getState();
    prefs = (await send({ t: "prefs" })) || {};
    send({ t: "alive", host: location.hostname });
    RHS.pageDeal = RHS.pageDealOf(document, location.href); RHS.pagePlaceV = RHS.pagePlace(document);
    await loadTaste(true);
    if (RHS.recipe === undefined) RHS.recipe = (await send({ t: "recipe", host: location.hostname.replace(/^www\./, "") })) || null;
    try { if (isDet()) { if (fab) { fab.remove(); fab = null; } await showDetail(); } else { if (card) { card.remove(); card = null; } await scanCards(); followArea(); } } catch (e) { /* never break the page */ }
  }
  let t = null, started = false;
  const ours = (n) => n.nodeType !== 1 || (n.getAttribute && n.getAttribute("data-rhs"));
  // v0.14.1: never work while the person is using the site (sliders, filters, typing): wait until they stop, then run when idle
  let lastInput = 0;
  for (const ev of ["pointerdown", "keydown", "input", "wheel", "touchstart"]) addEventListener(ev, () => { lastInput = Date.now(); }, { capture: true, passive: true });
  function idleScan() {
    clearTimeout(scanCards.tt);
    const quiet = Date.now() - lastInput, wait = Math.max(1500 - (Date.now() - (scanCards.last || 0)), quiet < 1500 ? 1500 - quiet : 0);
    scanCards.tt = setTimeout(() => {
      if (Date.now() - lastInput < 1200) return idleScan();
      const go = () => { scanCards.last = Date.now(); scanCards(); };
      window.requestIdleCallback ? requestIdleCallback(go, { timeout: 2000 }) : go();
    }, Math.max(0, wait));
  }
  // the side panel tells the page when the person clicks the RealHunt icon: show the card again on a silenced website
  try { chrome.runtime.onMessage.addListener((m) => {
    if (!m || dead) return;
    if (m.t === "rhsOpen" && isMuted()) muteSite(false);
    if (m.t === "rhsToggle") { // v0.15: same as pressing Alt+Shift+R on the page, now a real Chrome shortcut
      if (isMuted()) { muteSite(false); return; }
      if (cur && cur.r) { cur.open = !cur.open; state.min = !cur.open; send({ t: "pref", min: state.min }); renderCard(); }
      else if (!rk && !isDet() && lastScan.length >= 3) { if (fab) { fab.remove(); fab = null; } startRank(); }
    }
  }); } catch { /* old Chrome */ }
  function start() {
    if (started) return; started = true;
    run();
    const mo = new MutationObserver((muts) => { if (dead) return; if (muts.every((m) => m.addedNodes.length + m.removedNodes.length > 0 && [...m.addedNodes, ...m.removedNodes].every(ours))) return; clearTimeout(t); t = setTimeout(() => { if (location.href !== lastUrl) { if (Date.now() - lastInput > 1200) { A._list = null; run(); } } else if (!isDet()) idleScan(); }, 900); })
    ; mo.observe(document.documentElement, { childList: true, subtree: true }); observers.add(mo);
    every(() => { if (!document.hidden && (card || fab)) applyBusy(); }, 700);
    // v0.12: some sites change the address without touching the page (map moves): notice that too
    every(() => { if (!document.hidden && location.href !== lastUrl && Date.now() - lastInput > 1200) { A._list = null; run(); } }, 1200);
  }
  // v0.13.1: on realhunt.co itself the extension never re-scores a home from other homes (it compared a Fuerteventura flat
  // with cheap houses from other countries and gave 30). It shows the score the site already gives, with the same parts.
  if (/(^|\.)realhunt\.co$/.test(location.hostname)) {
    let siteCard = null, siteUrl = "", siteOpen = innerWidth >= 760;
    const DK = ["price", "value", "space", "condition", "extras", "location", "beach", "facilities", "water", "weather", "access", "delivery", "developer", "costs", "photos", "transparency", "demand", "interest"];
    const drawSite = (d) => {
      if (siteCard) { siteCard.remove(); siteCard = null; }
      if (!d || d.nota == null) return;
      const { h, sh } = host("div"); siteCard = h;
      const n = d.nota, col = RHS.color(n);
      if (!siteOpen) {
        const pill = document.createElement("div"); pill.className = "pill"; pill.style.background = col;
        pill.innerHTML = `<b>${n}</b><span>${esc(RHS.grade(n))} · RealHunt</span>`;
        pill.addEventListener("click", () => { siteOpen = true; drawSite(d); });
        sh.appendChild(pill); document.documentElement.appendChild(h); return;
      }
      const dims = d.dims || {};
      const rows = DK.filter((k) => dims[k] != null).map((k) => `<div class="row"><span>${esc(T("dim_" + k))}</span><div class="bar"><i style="width:${Math.max(4, Math.min(100, dims[k]))}%;background:${RHS.color(dims[k])}"></i></div><b>${Math.round(dims[k])}</b></div>`).join("");
      const div = document.createElement("div"); div.className = "c";
      div.innerHTML = `<div class="h"><div class="s" style="background:${col}">${n}<small>${esc(RHS.grade(n))}</small></div><div class="t"><b>${esc(T("site_title"))}</b><small>${esc(T("site_sub"))}</small></div><button class="x" data-a="min" aria-label="–">–</button></div>`
        + `<div class="mini">${rows}</div><div class="n">${esc(T("site_note"))} <a href="https://realhunt.co/method" target="_blank" rel="noopener">${esc(T("site_more"))}</a></div>`;
      div.querySelector('[data-a="min"]').addEventListener("click", () => { siteOpen = false; drawSite(d); });
      sh.appendChild(div); document.documentElement.appendChild(h);
    };
    const siteRun = async () => {
      if (location.href === siteUrl) return; siteUrl = location.href;
      const m = location.pathname.match(/^\/deal\/([^/?#]+)/), t = location.pathname.match(/^\/top\/([^/?#]+)\/([^/?#]+)/);
      if (!m && !t) { drawSite(null); return; }
      const d = await send({ t: "siteScore", slug: m ? decodeURIComponent(m[1]) : decodeURIComponent(t[2]), dest: t ? t[1] : null });
      if (location.href === siteUrl) drawSite(d);
    };
    setTimeout(siteRun, 1500); every(() => { if (!document.hidden) siteRun(); }, 1200);
    return;
  }
  // The extension loads on every site but only wakes up on pages about homes (any agency or portal, any country).
  const known = ["idealista", "zillow", "rightmove"].includes(A.id);
  const check = () => { try { return known || RHS.looksLikeProperty(document, location.href); } catch { return false; } };
  // v0.11: start only after the site has finished loading and its own scripts have settled (React/Next "hydration"),
  // so we never touch a page while its framework is still building it
  const settled = (fn) => { const go = () => setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2500 }) : fn()), 1200); if (document.readyState === "complete") go(); else addEventListener("load", go, { once: true }); };
  if (window.top !== window) { /* never inside frames */ }
  else if (check()) settled(start);
  else {
    let tries = 0, href = location.href;
    const iv = every(() => {
      if (started) return clearInterval(iv);
      if (location.href !== href) { href = location.href; tries = 0; } // single-page sites: check again after navigation
      if (++tries > 3 && location.href === href) { if (tries > 40) clearInterval(iv); return; } // nothing to do on this page: stay asleep
      if (check()) { clearInterval(iv); settled(start); }
    }, 2500);
  }
})();
