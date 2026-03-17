// ==UserScript==
// @name        【月白】Itzagud Stats
// @description A tool to handle infos on Itzagud.
// @author      星空優月 & 💟 めぐ 🍫 みん (Megumin 💥) 💟 | Forked by ONYX!
// @iconURL     https://www.itzagud.net/apple-touch-icon.png
// @match       *://www.itzagud.net/*
// @grant       none
// @run-at      document-start
// @version     0.8
// ==/UserScript==

(function () {
    'use strict';

    const CHAT_LS_KEY = 'itz_chat_nextAt'; // absolute ms timestamp of next reset

    // ─────────────────────────────────────────────────────────────────────────
    // Read the chat countdown from the page.
    // The page shows: "Chat bonus resets in 04:06:50"
    // In React apps the time (bold "04:06:50") is often a child <span>/<strong>
    // so the text nodes are SPLIT. We scan element.innerText instead which
    // collapses all children into one string.
    // ─────────────────────────────────────────────────────────────────────────
    function readChatDOMCountdown() {
        if (!document.body) return null;

        // Strategy 1: scan every element's innerText for the combined string
        // We only look at leaf-ish elements (not body/html) to avoid mega strings
        const all = document.body.querySelectorAll('*');
        for (const el of all) {
            // Skip script/style/widget itself
            if (['SCRIPT','STYLE','NOSCRIPT'].includes(el.tagName)) continue;
            if (el.id === 'itzagud-widget') continue;
            // Only check elements that have the keyword
            const raw = el.innerText || '';
            if (!/resets?\s+in/i.test(raw)) continue;

            // Try to match HH:MM:SS anywhere in the combined text
            const m = raw.match(/(\d{1,2}):(\d{2}):(\d{2})/);
            if (m) {
                const ms = (parseInt(m[1],10)*3600 + parseInt(m[2],10)*60 + parseInt(m[3],10)) * 1000;
                if (ms > 0 && ms <= 6*60*60*1000) { // sanity: must be ≤ 6h
                    const nextAt = Date.now() + ms;
                    try { localStorage.setItem(CHAT_LS_KEY, String(nextAt)); } catch(e){}
                    return nextAt;
                }
            }
        }

        // Strategy 2: just find ANY HH:MM:SS-shaped element near "resets" text
        // Walk text nodes and grab the time value from a sibling/parent
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            const t = node.textContent || '';
            // The static label node
            if (/resets?\s+in/i.test(t)) {
                // Check next sibling text nodes and parent's full innerText
                const parent = node.parentElement;
                if (parent) {
                    const full = parent.innerText || parent.textContent || '';
                    const m = full.match(/(\d{1,2}):(\d{2}):(\d{2})/);
                    if (m) {
                        const ms = (parseInt(m[1],10)*3600 + parseInt(m[2],10)*60 + parseInt(m[3],10)) * 1000;
                        if (ms > 0 && ms <= 6*60*60*1000) {
                            const nextAt = Date.now() + ms;
                            try { localStorage.setItem(CHAT_LS_KEY, String(nextAt)); } catch(e){}
                            return nextAt;
                        }
                    }
                    // Try grandparent too
                    const gp = parent.parentElement;
                    if (gp) {
                        const gfull = gp.innerText || gp.textContent || '';
                        const gm = gfull.match(/(\d{1,2}):(\d{2}):(\d{2})/);
                        if (gm) {
                            const ms = (parseInt(gm[1],10)*3600 + parseInt(gm[2],10)*60 + parseInt(gm[3],10)) * 1000;
                            if (ms > 0 && ms <= 6*60*60*1000) {
                                const nextAt = Date.now() + ms;
                                try { localStorage.setItem(CHAT_LS_KEY, String(nextAt)); } catch(e){}
                                return nextAt;
                            }
                        }
                    }
                }
            }
            // The time node itself (just "04:06:50")
            if (/^\s*\d{1,2}:\d{2}:\d{2}\s*$/.test(t)) {
                // Verify a nearby element mentions "resets"
                const parent = node.parentElement;
                const nearby = parent?.closest('[class]') || parent?.parentElement;
                if (nearby && /resets?\s+in/i.test(nearby.innerText || '')) {
                    const m = t.match(/(\d{1,2}):(\d{2}):(\d{2})/);
                    if (m) {
                        const ms = (parseInt(m[1],10)*3600 + parseInt(m[2],10)*60 + parseInt(m[3],10)) * 1000;
                        if (ms > 0 && ms <= 6*60*60*1000) {
                            const nextAt = Date.now() + ms;
                            try { localStorage.setItem(CHAT_LS_KEY, String(nextAt)); } catch(e){}
                            return nextAt;
                        }
                    }
                }
            }
        }

        return null; // not found
    }

    // Check if the bonus is currently available (no timer shown, or claimed button visible)
    function isChatReady() {
        if (!document.body) return false;
        const bodyText = document.body.innerText || '';
        const hasTimer = /resets?\s+in\s+\d/i.test(bodyText);
        return !hasTimer;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Watch the chat page — MutationObserver to catch timer updates
    // ─────────────────────────────────────────────────────────────────────────
    let _lastDOMRead = 0;

    function watchChatPage() {
        if (!location.pathname.startsWith('/chat')) return;

        const tryRead = () => {
            // Throttle: don't re-read more than once per second
            if (Date.now() - _lastDOMRead < 900) return;
            _lastDOMRead = Date.now();
            const nextAt = readChatDOMCountdown();
            if (nextAt !== null) {
                uChatSection();
            } else if (isChatReady()) {
                try { localStorage.removeItem(CHAT_LS_KEY); } catch(e){}
                uChatSection();
            }
        };

        // Wait for body then observe
        const attach = () => {
            tryRead(); // initial read
            const obs = new MutationObserver(tryRead);
            obs.observe(document.body, { childList: true, subtree: true, characterData: true });
        };

        if (document.body) attach();
        else {
            document.addEventListener('DOMContentLoaded', attach);
            // Also try after a short delay in case DOMContentLoaded already fired
            setTimeout(attach, 500);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Chat reward state
    // ─────────────────────────────────────────────────────────────────────────
    function getChatState() {
        if (location.pathname.startsWith('/chat') && document.body) {
            // Live read from DOM — most accurate
            const nextAt = readChatDOMCountdown();
            if (nextAt !== null) return { ready: false, nextAt };
            if (isChatReady()) return { ready: true, nextAt: null };
        }

        // Other pages — use cached value
        try {
            const cached = localStorage.getItem(CHAT_LS_KEY);
            if (cached) {
                const nextAt = parseInt(cached, 10);
                if (!isNaN(nextAt)) return { ready: Date.now() >= nextAt, nextAt };
            }
        } catch(e){}

        return { ready: null, nextAt: null };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────
    function fC(endTime) {
        const diff = new Date(endTime).getTime() - Date.now();
        if (diff <= 0) return "Ended";
        return `${Math.floor(diff/3600000)}h ${Math.floor((diff%3600000)/60000)}m`;
    }
    function fMS(ms) {
        if (ms <= 0) return "00:00:00";
        const s = Math.floor(ms/1000);
        return `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // API fetchers
    // ─────────────────────────────────────────────────────────────────────────
    async function fUD() {
        try { const r=await fetch("https://www.itzagud.net/api/me",{credentials:"include"}); const d=await r.json(); if(d.user) return d.user; } catch(e){}
        return null;
    }
    async function fSG() {
        try { const r=await fetch("https://www.itzagud.net/slots/api/giveaway",{credentials:"include"}); const d=await r.json(); if(d.ok) return d.items||[]; } catch(e){}
        return [];
    }
    async function fSE() {
        try { const r=await fetch("https://www.itzagud.net/slots/api/my-entries",{credentials:"include"}); const d=await r.json(); if(d.ok) return{oneHour:d.byKind.SLOTS_1H||0,twentyFourHour:d.byKind.SLOTS_24H||0}; } catch(e){}
        return {oneHour:0,twentyFourHour:0};
    }
    async function fTasks() {
        try { const r=await fetch("https://www.itzagud.net/api/tasks",{credentials:"include"}); const d=await r.json(); return d.tasks||[]; } catch(e){}
        return [];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Chat section UI
    // ─────────────────────────────────────────────────────────────────────────
    let _chatTick = null;

    function uChatSection() {
        const card = document.getElementById("itz-chat-card");
        if (!card) return;
        const info = getChatState();
        if (_chatTick) { clearInterval(_chatTick); _chatTick = null; }

        if (info.ready === null) {
            card.className = "itz-chat-card unknown";
            card.innerHTML = `
                <div class="itz-chat-header"><span>💬 Chat Reward</span><span class="itz-chat-badge unknown">? Unknown</span></div>
                <div style="font-size:12px;color:#71717a;text-align:center;line-height:1.5;">
                    Visit <a href="https://www.itzagud.net/chat" target="_blank" style="color:var(--itz-accent);">the chat page</a> once<br>to sync the timer.
                </div>`;
            return;
        }

        if (info.ready) {
            card.className = "itz-chat-card ready";
            card.innerHTML = `
                <div class="itz-chat-header"><span>💬 Chat Reward</span><span class="itz-chat-badge ready">✅ READY</span></div>
                <div class="itz-chat-cd" style="color:#4ade80;font-size:18px;text-align:center;font-weight:700;padding:4px 0;">💵 +250 Clams!</div>
                <div class="itz-chat-prog-outer"><div class="itz-chat-prog-inner ready" style="width:100%;"></div></div>
                <a class="itz-chat-link" href="https://www.itzagud.net/chat" target="_blank">→ Send a message to claim!</a>`;
            return;
        }

        const TOTAL = 6 * 60 * 60 * 1000;
        card.className = "itz-chat-card waiting";
        card.innerHTML = `
            <div class="itz-chat-header"><span>💬 Chat Reward</span><span class="itz-chat-badge waiting">⏳ Waiting</span></div>
            <div class="itz-chat-cd itz-val-timer" id="itz-chat-cd">${fMS(info.nextAt - Date.now())}</div>
            <div class="itz-chat-prog-outer"><div id="itz-chat-prog" class="itz-chat-prog-inner waiting" style="width:0%;"></div></div>
            <a class="itz-chat-link" href="https://www.itzagud.net/chat" target="_blank">→ Go to Chat</a>`;

        function tick() {
            const rem = info.nextAt - Date.now();
            if (rem <= 0) { clearInterval(_chatTick); uChatSection(); return; }
            const el=document.getElementById("itz-chat-cd"), pg=document.getElementById("itz-chat-prog");
            if (el) el.textContent = fMS(rem);
            if (pg) pg.style.width = Math.min(100,((TOTAL-rem)/TOTAL)*100)+'%';
        }
        tick();
        _chatTick = setInterval(tick, 1000);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Other updaters
    // ─────────────────────────────────────────────────────────────────────────
    function uPB(id, done, total) {
        const bar=document.getElementById(id), cnt=document.getElementById(id+"-counter");
        if (bar) bar.style.width=total>0?`${Math.min(100,(done/total)*100)}%`:"0%";
        if (cnt) cnt.textContent=`${done}/${total}`;
    }

    async function uUS() {
        const user=await fUD(), el=document.getElementById("itz-user-stats");
        if (!el||!user) return;
        el.innerHTML=`
            <div class="itz-user-card">
                <div class="itz-stat-row"><span>🪙 Points</span><span class="itz-val-points">${user.points.toLocaleString()}</span></div>
                <div class="itz-stat-row"><span>💵 Clams</span><span class="itz-val-clams">${user.clams.toLocaleString()}</span></div>
                <div class="itz-stat-row" style="border-top:1px solid rgba(255,255,255,0.05);padding-top:5px;margin-top:2px;">
                    <span class="itz-val-luck">🍀 ${user.wheelDayEarned}/10</span>
                    <span class="itz-val-timer">⏰ ${fC(user.wheelNextAt)}</span>
                </div>
            </div>`;
    }

    async function uTC() {
        const tasks=await fTasks();
        let sTot=0,sDone=0,wTot=0,wDone=0;
        for (const t of tasks) {
            if (t.type.startsWith("STEAM")) { sTot++; if(!t.isAvailable&&t.availabilityReason==="MAX_COMPLETIONS_REACHED") sDone++; }
            else { wTot++; if(!t.isAvailable&&(t.availabilityReason==="COOLDOWN_ACTIVE"||t.availabilityReason==="MAX_COMPLETIONS_REACHED")) wDone++; }
        }
        uPB("itz-task-bar",sDone+wDone,sTot+wTot);
        const cnt=document.getElementById("itz-task-bar-counter");
        if (cnt) cnt.textContent=`📺 ${wDone}/${wTot} 🎮 ${sDone}/${sTot}`;
    }

    async function uSGD() {
        const [giveaways,entries]=await Promise.all([fSG(),fSE()]);
        const el=document.getElementById("itz-slot-giveaways");
        if (!el) return;
        let html=`<div class="itz-giveaway-grid">`;
        giveaways.forEach((g,idx)=>{
            const label=g.kind==="SLOTS_1H"?"1H":"24H";
            const tickets=g.kind==="SLOTS_1H"?entries.oneHour:entries.twentyFourHour;
            const total=g.totalEntries||0;
            const wR=total>0?((tickets/total)*100).toFixed(2):"0.00";
            const col=idx+1;
            const sIM=g.prize.imageUrl.match(/steam\/apps\/(\d+)\//);
            const link=sIM?`https://s.team/a/${sIM[1]}`:"https://www.itzagud.net/slots";
            html+=`
                <div class="itz-label" style="grid-column:${col};grid-row:1">${label}</div>
                <div style="grid-column:${col};grid-row:2"><img src="${g.prize.imageUrl}" alt="${g.prize.name}" class="itz-prize-img"></div>
                <div style="grid-column:${col};grid-row:3"><a href="${link}" target="_blank" class="itz-prize-name">${g.prize.name}</a></div>
                <div class="itz-meta-val" style="grid-column:${col};grid-row:4;color:#facc15;">⌛ ${fC(g.endsAt)}</div>
                <div class="itz-meta-val" style="grid-column:${col};grid-row:5;color:#93c5fd;">🎫 ${tickets.toLocaleString()}</div>
                <div class="itz-meta-val" style="grid-column:${col};grid-row:6;color:var(--itz-accent);">👥 ${total.toLocaleString()}</div>
                <div class="itz-meta-val" style="grid-column:${col};grid-row:7;color:var(--itz-luck);">📊 ${wR}%</div>`;
        });
        html+=`</div>`;
        el.innerHTML=html;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Styles
    // ─────────────────────────────────────────────────────────────────────────
    const iS = () => {
        if (document.getElementById("itzagud-styles")) return;
        const style=document.createElement("style");
        style.id="itzagud-styles";
        style.textContent=`
            @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap');
            :root{--itz-bg:rgba(9,9,11,0.88);--itz-border:rgba(63,63,70,0.4);--itz-glass:blur(12px);--itz-accent:#a78bfa;--itz-points:#fbbf24;--itz-clams:#ef4444;--itz-luck:#22c55e;--itz-timer:#38bdf8;--itz-font:'Rajdhani',sans-serif;}
            #itzagud-widget{position:fixed;top:50%;right:16px;transform:translateY(-50%);z-index:10000;width:260px;font-family:var(--itz-font);background:var(--itz-bg);backdrop-filter:var(--itz-glass);-webkit-backdrop-filter:var(--itz-glass);border:1px solid var(--itz-border);border-radius:14px;padding:12px 14px 14px;box-shadow:0 8px 24px rgba(0,0,0,0.55),0 0 16px rgba(167,139,250,0.08);color:#f4f4f5;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);}
            #itzagud-widget.itz-hidden{background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border-color:transparent!important;box-shadow:none!important;}
            #itzagud-widget.itz-hidden #itz-widget-content,#itzagud-widget.itz-hidden .itz-title-label,#itzagud-widget.itz-hidden .itz-title-icon{display:none;}
            .itz-title-row{display:flex;align-items:center;gap:6px;margin-bottom:10px;border-bottom:1px solid var(--itz-border);padding-bottom:8px;cursor:grab;user-select:none;}
            #itz-toggle-btn{margin-left:auto;background:rgba(167,139,250,0.1);border:1px solid rgba(167,139,250,0.28);color:var(--itz-accent);border-radius:6px;padding:2px 7px;font-family:var(--itz-font);font-size:11px;font-weight:700;cursor:pointer;line-height:1.5;user-select:none;transition:background 0.2s;}
            #itz-toggle-btn:hover{background:rgba(167,139,250,0.24);}
            .itz-section{margin-bottom:10px;}.itz-section:last-child{margin-bottom:0;}
            .itz-user-card{background:rgba(39,39,42,0.5);border:1px solid var(--itz-border);border-radius:10px;padding:9px 11px;display:flex;flex-direction:column;gap:6px;}
            .itz-stat-row{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:600;}
            .itz-val-points{color:var(--itz-points);}.itz-val-clams{color:var(--itz-clams);}.itz-val-luck{color:var(--itz-luck);}.itz-val-timer{color:var(--itz-timer);}
            .itz-progress-container{display:flex;flex-direction:column;gap:3px;}
            .itz-progress-label{display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:#a1a1aa;}
            .itz-progress-outer{height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;}
            .itz-progress-inner{height:100%;background:linear-gradient(to right,#6366f1,#4ade80);transition:width 0.3s ease;}
            .itz-giveaway-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px 8px;background:rgba(24,24,27,0.4);border:1px solid var(--itz-border);border-radius:10px;padding:8px;text-align:center;}
            .itz-label{font-size:11px;color:var(--itz-accent);font-weight:700;}
            .itz-prize-img{width:100%;max-width:90px;margin:0 auto;aspect-ratio:16/9;object-fit:cover;border-radius:5px;box-shadow:0 2px 6px rgba(0,0,0,0.3);}
            .itz-prize-name{display:block;font-size:11px;font-weight:700;color:var(--itz-luck);text-decoration:none;line-height:1.2;margin:4px 0;}
            .itz-prize-name:hover{opacity:0.8;}
            .itz-meta-val{font-size:11px;font-weight:700;padding:1px 0;}
            .itz-chat-card{border-radius:10px;padding:9px 11px;display:flex;flex-direction:column;gap:6px;border:1px solid;transition:border-color 0.4s,background 0.4s;}
            .itz-chat-card.ready{background:rgba(34,197,94,0.07);border-color:rgba(34,197,94,0.35);}
            .itz-chat-card.waiting{background:rgba(56,189,248,0.05);border-color:rgba(56,189,248,0.25);}
            .itz-chat-card.unknown{background:rgba(39,39,42,0.5);border-color:var(--itz-border);}
            .itz-chat-header{display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:700;}
            .itz-chat-badge{font-size:11px;font-weight:700;padding:1px 7px;border-radius:5px;}
            .itz-chat-badge.ready{background:rgba(34,197,94,0.18);color:#4ade80;}
            .itz-chat-badge.waiting{background:rgba(56,189,248,0.14);color:#38bdf8;}
            .itz-chat-badge.unknown{background:rgba(100,100,110,0.18);color:#a1a1aa;}
            .itz-chat-cd{font-size:20px;font-weight:700;text-align:center;letter-spacing:1px;padding:2px 0;}
            .itz-chat-prog-outer{height:5px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;}
            .itz-chat-prog-inner{height:100%;border-radius:3px;transition:width 1s linear;}
            .itz-chat-prog-inner.ready{background:linear-gradient(to right,#4ade80,#22c55e);}
            .itz-chat-prog-inner.waiting{background:linear-gradient(to right,#38bdf8,#6366f1);}
            .itz-chat-link{display:block;text-align:center;font-size:11px;font-weight:700;color:var(--itz-accent);text-decoration:none;opacity:0.75;transition:opacity 0.2s;}
            .itz-chat-link:hover{opacity:1;}
        `;
        document.head.appendChild(style);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Drag
    // ─────────────────────────────────────────────────────────────────────────
    function mkDrag(titleEl, widgetEl) {
        let dragging=false,ox=0,oy=0;
        try {
            const saved=localStorage.getItem('itz_widget_pos');
            if (saved) {
                const pos=JSON.parse(saved);
                Object.assign(widgetEl.style,{transition:'none',transform:'none',left:Math.max(0,Math.min(pos.x,window.innerWidth-260))+'px',top:Math.max(0,Math.min(pos.y,window.innerHeight-50))+'px',right:'auto'});
            }
        } catch(e){}
        titleEl.addEventListener("pointerdown",e=>{
            if (e.button&&e.button!==0) return;
            if (e.target.closest?.('#itz-toggle-btn')) return;
            dragging=true;
            const r=widgetEl.getBoundingClientRect();
            ox=e.clientX-r.left; oy=e.clientY-r.top;
            titleEl.setPointerCapture(e.pointerId);
            Object.assign(widgetEl.style,{transition:'none',transform:'none',top:r.top+'px',left:r.left+'px',right:'auto'});
        });
        titleEl.addEventListener("pointermove",e=>{
            if (!dragging) return;
            widgetEl.style.left=Math.max(0,Math.min(e.clientX-ox,window.innerWidth-widgetEl.offsetWidth))+'px';
            widgetEl.style.top=Math.max(0,Math.min(e.clientY-oy,window.innerHeight-widgetEl.offsetHeight))+'px';
        });
        titleEl.addEventListener("pointerup",()=>{
            dragging=false; widgetEl.style.transition="";
            const r=widgetEl.getBoundingClientRect();
            try{localStorage.setItem('itz_widget_pos',JSON.stringify({x:r.left,y:r.top}));}catch(e){}
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Build widget
    // ─────────────────────────────────────────────────────────────────────────
    function wg() {
        if (document.getElementById("itzagud-widget")) return;
        iS();
        const widget=document.createElement("div"); widget.id="itzagud-widget";
        let isHidden=false;
        try{isHidden=localStorage.getItem('itz_widget_hidden')==='1';}catch(e){}
        if (isHidden) widget.classList.add('itz-hidden');

        const titleRow=document.createElement("div"); titleRow.className="itz-title-row";
        const toggleBtn=document.createElement("button"); toggleBtn.id="itz-toggle-btn";
        toggleBtn.textContent=isHidden?"👁 Show":"👁 Hide";
        toggleBtn.addEventListener("click",e=>{
            e.stopPropagation();
            const h=widget.classList.toggle('itz-hidden');
            toggleBtn.textContent=h?"👁 Show":"👁 Hide";
            try{localStorage.setItem('itz_widget_hidden',h?'1':'0');}catch(e){}
        });
        titleRow.innerHTML=`<img class="itz-title-icon" src="https://www.itzagud.net/favicon.ico" style="width:16px;height:16px;"><span class="itz-title-label" style="font-weight:700;font-size:14px;letter-spacing:0.5px;color:var(--itz-accent);">ITZAGUD STATS</span>`;
        titleRow.appendChild(toggleBtn);
        mkDrag(titleRow,widget);
        widget.appendChild(titleRow);

        const content=document.createElement("div"); content.id="itz-widget-content";

        const userDiv=document.createElement("div"); userDiv.id="itz-user-stats"; userDiv.className="itz-section";
        userDiv.innerHTML=`<div style="font-size:12px;color:#a1a1aa;text-align:center;">Loading...</div>`;

        const taskDiv=document.createElement("div"); taskDiv.className="itz-section";
        taskDiv.innerHTML=`<div class="itz-progress-container"><div class="itz-progress-label"><span>Tasks</span><span id="itz-task-bar-counter">0/0</span></div><div class="itz-progress-outer"><div id="itz-task-bar" class="itz-progress-inner" style="width:0%"></div></div></div>`;

        const chatDiv=document.createElement("div"); chatDiv.className="itz-section";
        const chatCard=document.createElement("div"); chatCard.id="itz-chat-card"; chatCard.className="itz-chat-card unknown";
        chatCard.innerHTML=`<div style="font-size:12px;color:#a1a1aa;text-align:center;">Loading chat...</div>`;
        chatDiv.appendChild(chatCard);

        const slotDiv=document.createElement("div"); slotDiv.id="itz-slot-giveaways"; slotDiv.className="itz-section";
        slotDiv.innerHTML=`<div style="font-size:12px;color:#a1a1aa;text-align:center;">Loading giveaways...</div>`;

        content.appendChild(userDiv); content.appendChild(taskDiv);
        content.appendChild(chatDiv); content.appendChild(slotDiv);
        widget.appendChild(content);
        document.body.appendChild(widget);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Boot
    // ─────────────────────────────────────────────────────────────────────────
    function bt() {
        watchChatPage();
        wg();
        uUS(); uTC(); uSGD(); uChatSection();
        setInterval(uUS,  30*1000);
        setInterval(uTC,   5*60*1000);
        setInterval(uSGD,  60*1000);
        // Re-sync chat every 10s — on chat page this re-reads DOM, elsewhere uses cache
        setInterval(uChatSection, 10*1000);
    }

    if (document.readyState==="complete"||document.readyState==="interactive"){bt();}
    else{window.addEventListener("DOMContentLoaded",bt);window.addEventListener("load",bt);}
})();
