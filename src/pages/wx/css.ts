// Styles for /weather. Shared by the page and by the static first paint that vite.config.ts prerenders,
// so the page looks the same before and after the app loads (no flash of a different page).
export const WX_CSS = `
.wx{max-width:1240px;margin:0 auto;padding:18px 16px 70px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#14181c}
.wx a{color:#D4420C}
.wx-crumb{font-size:13px;color:#6b737a;margin-bottom:8px}.wx-crumb a{color:#6b737a;text-decoration:none}
.wx-hero h1{font:800 clamp(28px,4.4vw,48px)/1.04 system-ui;letter-spacing:-.02em;margin:0;max-width:20ch}
.wx-hero p{font-size:16px;color:#3b4540;max-width:720px;margin:10px 0 14px}
.wx-search{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.wx-search input{flex:1;min-width:220px;border:1.5px solid #dfe3e6;border-radius:14px;padding:12px 14px;font:16px system-ui;outline:none;background:#fff}
.wx-search input:focus{border-color:#14181c}
.wx-seg{display:flex;background:#eef0f2;border-radius:12px;padding:3px}
.wx-seg button{border:0;background:none;padding:9px 14px;border-radius:10px;font:700 14px system-ui;cursor:pointer;color:#14181c}
.wx-seg button.on{background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.12)}
.wx-tools{position:sticky;top:0;z-index:600;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);margin:14px -16px 12px;padding:10px 16px 8px;border-bottom:1px solid #eef0f2}
.wx-chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}.wx-chips::-webkit-scrollbar{display:none}
.wx-chip{flex:0 0 auto;border:1.5px solid #e1e5e8;background:#fff;border-radius:999px;padding:8px 12px;font:600 13.5px system-ui;cursor:pointer;color:#14181c;display:flex;gap:6px;align-items:center;transition:all .15s}
.wx-chip small{font-size:11px;color:#8a9098;font-weight:700}
.wx-chip:hover{border-color:#14181c}
.wx-chip.on{background:#14181c;color:#fff;border-color:#14181c}.wx-chip.on small{color:#cfd5da}
.wx-chip.clear{border-style:dashed;color:#C2412D}
.wx-row2{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap}
.wx-regions{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}.wx-regions::-webkit-scrollbar{display:none}
.wx-regions button{flex:0 0 auto;border:0;background:#eef0f2;border-radius:999px;padding:6px 11px;font:700 12.5px system-ui;cursor:pointer;color:#14181c}
.wx-regions button.on{background:#D4420C;color:#fff}
.wx-sort{font-size:13px;color:#5b636b;display:flex;gap:6px;align-items:center}
.wx-sort select{border:1.5px solid #e1e5e8;border-radius:10px;padding:6px 8px;font:600 13px system-ui;background:#fff}
.wx-count{font-size:12.5px;color:#5b636b;margin-top:6px}
.wx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}
.wx-card{all:unset;box-sizing:border-box;cursor:pointer;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08),0 8px 24px rgba(0,0,0,.06);transition:transform .15s,box-shadow .15s;display:flex;flex-direction:column}
.wx-card:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(0,0,0,.14)}
.wx-card:focus-visible{outline:3px solid #D4420C}
.wx-card.skel{height:330px;background:linear-gradient(90deg,#f1f3f4,#e7eaec,#f1f3f4);background-size:200% 100%;animation:wxs 1.2s infinite}
@keyframes wxs{to{background-position:-200% 0}}
.wx-card.ebc{box-shadow:0 0 0 3px #D4420C,0 8px 24px rgba(212,66,12,.2)}
.wx-ph{position:relative;height:190px;background-size:cover;background-position:center}
.wx-ph:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.65))}
.wx-rank{position:absolute;left:10px;top:10px;z-index:2;background:rgba(0,0,0,.55);color:#fff;font:800 12px system-ui;border-radius:8px;padding:3px 7px}
.wx-score{position:absolute;right:10px;top:10px;z-index:2;color:#fff;font:900 18px system-ui;border-radius:12px;padding:6px 9px;box-shadow:0 2px 8px rgba(0,0,0,.25)}
.wx-ebc{position:absolute;left:10px;top:40px;z-index:2;background:#D4420C;color:#fff;font:800 11.5px system-ui;border-radius:8px;padding:3px 7px}
.wx-name{position:absolute;left:12px;right:12px;bottom:10px;z-index:2;color:#fff}
.wx-name b{display:block;font:800 20px/1.15 system-ui;text-shadow:0 1px 6px rgba(0,0,0,.4)}
.wx-name small{font-size:12.5px;opacity:.9}
.wx-hover{position:absolute;inset:0;z-index:3;background:rgba(20,24,28,.88);padding:14px 14px;display:flex;flex-direction:column;justify-content:center;gap:7px;opacity:0;transition:opacity .15s;color:#fff}
@media (hover:hover){.wx-card:hover .wx-hover{opacity:1}}
.wx-bar{display:grid;grid-template-columns:110px 1fr auto;gap:8px;align-items:center;font-size:12.5px}
.wx-bar-l{white-space:nowrap}
.wx-bar-t{height:9px;border-radius:5px;background:rgba(128,128,128,.25);overflow:hidden}.wx-bar-t i{display:block;height:100%;border-radius:5px}
.wx-bar-v{font-weight:700;white-space:nowrap;font-size:12px}
.wx-meta{display:flex;flex-wrap:wrap;gap:4px 12px;padding:10px 12px 0;font-size:12.5px;color:#3b4540}
.wx-months{display:flex;gap:3px;align-items:flex-end;height:26px;padding:8px 12px 0}
.wx-mo{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center}
.wx-mo i{display:block;width:100%;border-radius:3px 3px 1px 1px}
.wx-months.big{height:90px;padding:4px 0 18px}.wx-months.big .wx-mo{position:relative}.wx-months.big small{position:absolute;bottom:-17px;font-size:11px;color:#6b737a}
.wx-foot{padding:10px 12px 12px;font-size:13.5px;color:#14181c;margin-top:auto}
.wx-cta{color:#D4420C;font-weight:800}
.wx-empty{grid-column:1/-1;text-align:center;padding:40px;color:#5b636b}.wx-empty button{margin-left:8px;border:0;background:#14181c;color:#fff;border-radius:999px;padding:8px 14px;font:700 13px system-ui;cursor:pointer}
.wx-how{margin-top:40px;background:#F6F8F7;border-radius:18px;padding:18px 20px;font-size:14px;color:#3b4540;line-height:1.55}.wx-how h2{font:800 20px system-ui;margin:0 0 8px;color:#14181c}.wx-how p{margin:6px 0}
.wx-sheet-bg{position:fixed;inset:0;z-index:2000;background:rgba(10,14,18,.45);display:flex;justify-content:flex-end;animation:wxf .15s}
@keyframes wxf{from{opacity:0}}
.wx-sheet{width:min(560px,100%);height:100%;background:#fff;overflow-y:auto;animation:wxi .22s cubic-bezier(.2,.9,.3,1)}
@keyframes wxi{from{transform:translateX(40px);opacity:.4}}
.wx-sh-top{position:relative;height:230px;background-size:cover;background-position:center;color:#fff;display:flex;align-items:flex-end;justify-content:space-between;padding:16px 18px}
.wx-sh-top h2{font:900 30px/1.05 system-ui;margin:2px 0 0;text-shadow:0 2px 10px rgba(0,0,0,.4)}
.wx-sh-top small{font-size:13px;opacity:.9}
.wx-x{position:absolute;right:14px;top:14px;border:0;background:rgba(0,0,0,.5);color:#fff;width:36px;height:36px;border-radius:50%;font:700 16px system-ui;cursor:pointer}
.wx-score.big{position:static;font-size:30px;padding:8px 12px;border-radius:16px}.wx-score.big small{font-size:12px;opacity:.85;margin-left:2px}
.wx-sh-body{padding:16px 18px 40px}
.wx-sh-body h3{font:800 16px system-ui;margin:20px 0 8px}
.wx-actions{display:flex;gap:8px;flex-wrap:wrap}
.wx-btn{border:0;border-radius:12px;padding:11px 16px;font:800 14px system-ui;cursor:pointer;background:#eef0f2;color:#14181c !important;text-decoration:none;display:inline-block}
.wx-btn.main{background:#D4420C;color:#fff !important}
.wx-bars{display:flex;flex-direction:column;gap:9px}.wx-bars .wx-bar{grid-template-columns:150px 1fr auto;font-size:13.5px}.wx-bars .wx-bar-v{font-size:13px}
.wx-note{font-size:13.5px;color:#3b4540;line-height:1.5;margin:10px 0 0}
.wx-homes{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.wx-home{text-decoration:none;color:#14181c !important;font-size:13px}
.wx-hi{position:relative;height:110px;border-radius:12px;background:#eef0f2 center/cover;margin-bottom:5px}
.wx-hi span{position:absolute;right:6px;top:6px;color:#fff;font:800 12px system-ui;border-radius:8px;padding:2px 6px}
.wx-home b{display:block;font-size:14px}.wx-home small{display:block;color:#5b636b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wx-findbox{margin-top:22px;background:#FFF4EE;border:1px solid #F8D5C4;border-radius:14px;padding:12px 14px;font-size:13.5px;line-height:1.5}
.wx-mapwrap{position:relative}
.wx-map{height:min(74vh,700px);min-height:420px;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.12)}
.wx-legend{position:absolute;left:12px;bottom:12px;z-index:500;background:rgba(255,255,255,.95);border-radius:12px;padding:8px 10px;font-size:11.5px;box-shadow:0 2px 8px rgba(0,0,0,.15);width:230px}
.wx-ramp{height:10px;border-radius:4px;margin:4px 0 2px}.wx-ticks{display:flex;justify-content:space-between}.wx-legend label{display:flex;gap:6px;align-items:center;margin-top:4px}.wx-legend input{width:110px}
.wx-pin{background:var(--c);color:#fff;font:800 12px system-ui;border-radius:999px;width:34px;height:24px;display:grid;place-items:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);cursor:pointer}
.wx-pin.empty{opacity:.75;border-style:dashed}
.wx-pin.ebc{width:auto;padding:0 10px;background:#D4420C;white-space:nowrap;box-shadow:0 0 0 6px rgba(212,66,12,.25),0 4px 12px rgba(0,0,0,.35)}
@media (max-width:640px){
 .wx-grid{grid-template-columns:1fr 1fr;gap:10px}
 .wx-ph{height:140px}.wx-name b{font-size:16px}.wx-score{font-size:15px;padding:4px 7px}
 .wx-meta{font-size:11.5px;gap:2px 8px;padding:8px 9px 0}.wx-meta span:nth-child(4){display:none}
 .wx-foot{font-size:12px;padding:8px 9px 10px}.wx-months{padding:6px 9px 0;height:20px}
 .wx-sheet{width:100%;height:94%;margin-top:auto;border-radius:20px 20px 0 0;animation:wxu .25s cubic-bezier(.2,.9,.3,1)}
 .wx-sheet-bg{align-items:flex-end}
 .wx-bars .wx-bar{grid-template-columns:118px 1fr auto;font-size:12.5px}
 .wx-search input{font-size:16px}
}
@keyframes wxu{from{transform:translateY(60px)}}
@media (max-width:380px){.wx-grid{grid-template-columns:1fr}}
.wx-sh-grab{display:none}
.wx-chip small:empty{display:none}
.wx-chip.zero{opacity:.45}
.wx-count.loading b{display:inline-block;width:28px;height:11px;border-radius:4px;background:#e7eaec;vertical-align:middle}
.wx-pin.more{display:flex;align-items:center;justify-content:center;width:auto;min-width:34px;padding:0 7px;gap:3px;white-space:nowrap}.wx-pin.more i{font-style:normal;font-size:10px;opacity:.9}
.wx-maphint{position:absolute;right:12px;top:12px;z-index:500;background:rgba(20,24,28,.82);color:#fff;font:600 12px system-ui;border-radius:10px;padding:6px 9px;pointer-events:none}
.wx-mapload{height:min(74vh,700px);min-height:420px;border-radius:18px;background:linear-gradient(90deg,#f1f3f4,#e7eaec,#f1f3f4);background-size:200% 100%;animation:wxs 1.2s infinite}
.wx-shell input{pointer-events:none}
html[data-lang=es] .wx-en,html:not([data-lang=es]) .wx-es{display:none}
@media (max-width:640px){
 .wx-sh-grab{display:block;position:absolute;left:50%;top:8px;width:44px;height:5px;margin-left:-22px;border-radius:3px;background:rgba(255,255,255,.85);z-index:3}
 .wx-maphint{display:none}
}
`;
