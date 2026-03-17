// ==UserScript==
// @name        【月白】Itzagud Stats
// @description A tool to handle infos on Itzagud.
// @author      星空優月 & 💟 めぐ 🍫 みん (Megumin 💥) 💟 | ONYX - added toggle button
// @iconURL     https://www.itzagud.net/apple-touch-icon.png
// @match       *://www.itzagud.net/*
// @grant       none
// @run-at      document-start
// @version     0.3
// ==/UserScript==

(function () {
    'use strict';
    const iS = () => {
        if (document.getElementById("itzagud-styles")) return;
        const style = document.createElement("style");
        style.id = "itzagud-styles";
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap');
            :root {--itz-bg: rgba(9, 9, 11, 0.85);--itz-border: rgba(63, 63, 70, 0.4);--itz-glass: blur(12px);--itz-accent: #a78bfa;--itz-points: #fbbf24;--itz-clams: #ef4444;--itz-luck: #22c55e;--itz-timer: #38bdf8;--itz-font: 'Rajdhani', sans-serif;}
            #itzagud-widget {position: fixed;top: 50%;right: 20px;transform: translateY(-50%);z-index: 10000;width: 280px;font-family: var(--itz-font);background: var(--itz-bg);backdrop-filter: var(--itz-glass);-webkit-backdrop-filter: var(--itz-glass);border: 1px solid var(--itz-border);border-radius: 16px;padding: 16px;box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(167, 139, 250, 0.1);color: #f4f4f5;transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);}
            #itzagud-widget.itz-hidden {background: transparent !important;backdrop-filter: none !important;-webkit-backdrop-filter: none !important;border-color: transparent !important;box-shadow: none !important;}
            #itzagud-widget.itz-hidden #itz-widget-content {display: none;}
            #itzagud-widget.itz-hidden .itz-title-label {display: none;}
            #itzagud-widget.itz-hidden .itz-title-icon {display: none;}
            #itz-toggle-btn {margin-left: auto;background: rgba(167,139,250,0.12);border: 1px solid rgba(167,139,250,0.3);color: var(--itz-accent);border-radius: 8px;padding: 3px 8px;font-family: var(--itz-font);font-size: 13px;font-weight: 700;cursor: pointer;transition: background 0.2s, color 0.2s;line-height: 1.5;user-select: none;}
            #itz-toggle-btn:hover {background: rgba(167,139,250,0.28);}
            .itz-section {margin-bottom: 16px;}
            .itz-section:last-child {margin-bottom: 0;}
            .itz-user-card {background: rgba(39, 39, 42, 0.5);border: 1px solid var(--itz-border);border-radius: 12px;padding: 12px;display: flex;flex-direction: column;gap: 8px;}
            .itz-stat-row {display: flex;justify-content: space-between;align-items: center;font-size: 14px;font-weight: 600;}
            .itz-val-points { color: var(--itz-points); }
            .itz-val-clams { color: var(--itz-clams); }
            .itz-val-luck { color: var(--itz-luck); }
            .itz-val-timer { color: var(--itz-timer); }
            .itz-giveaway-grid {display: grid;grid-template-columns: 1fr 1fr;gap: 8px 12px;background: rgba(24, 24, 27, 0.4);border: 1px solid var(--itz-border);border-radius: 12px;padding: 12px;text-align: center;}
            .itz-label {font-size: 13px;color: var(--itz-accent);font-weight: 700;margin-bottom: 4px;}
            .itz-prize-img {width: 100%;max-width: 100px;margin: 0 auto;aspect-ratio: 16/9;object-fit: cover;border-radius: 6px;box-shadow: 0 4px 8px rgba(0,0,0,0.3);}
            .itz-prize-name {display: block;font-size: 13px;font-weight: 700;color: var(--itz-luck);text-decoration: none;line-height: 1.2;margin: 6px 0;}
            .itz-prize-name:hover { opacity: 0.8; }
            .itz-meta-val {font-size: 13px;font-weight: 700;padding: 2px 0;}
            .itz-progress-container {display:flex;flex-direction:column;gap:4px;}
            .itz-progress-label {display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:#a1a1aa;}
            .itz-progress-outer {height:8px;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden;border:1px solid rgba(255,255,255,0.05);}
            .itz-progress-inner {height:100%;background:linear-gradient(to right,#6366f1,#4ade80);transition:width 0.3s ease;}
        `;
        document.head.appendChild(style);
    };

    function fC(endTime) {
        const diff = new Date(endTime).getTime() - Date.now();
        if (diff <= 0) return "Ended";
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        return `${hrs}h ${mins}m`;
    }

    async function fUD() {
        try {
            const res = await fetch("https://www.itzagud.net/api/me", { method: "GET", credentials: "include" });
            const data = await res.json();
            if (data.user) return data.user;
        } catch (err) { console.warn("Failed to fetch user data:", err); }
        return null;
    }

    async function fSG() {
        try {
            const res = await fetch("https://www.itzagud.net/slots/api/giveaway", { method: "GET", credentials: "include" });
            const data = await res.json();
            if (data.ok) return data.items || [];
        } catch (err) { console.warn("Failed to fetch slot giveaways:", err); }
        return [];
    }

    async function fSE() {
        try {
            const res = await fetch("https://www.itzagud.net/slots/api/my-entries", { method: "GET", credentials: "include" });
            const data = await res.json();
            if (data.ok) {
                return { oneHour: data.byKind.SLOTS_1H || 0, twentyFourHour: data.byKind.SLOTS_24H || 0 };
            }
        } catch (err) { console.warn("Failed to fetch slot entries:", err); }
        return { oneHour: 0, twentyFourHour: 0 };
    }

    async function fTasks() {
        try {
            const res = await fetch("https://www.itzagud.net/api/tasks", { method: "GET", credentials: "include" });
            const data = await res.json();
            return data.tasks || [];
        } catch (err) { console.warn("Failed to fetch tasks:", err); }
        return [];
    }

    function uPB(id, done, total) {
        const bar = document.getElementById(id);
        const counter = document.getElementById(id + "-counter");
        if (bar) bar.style.width = total > 0 ? `${Math.min(100, (done / total) * 100)}%` : "0%";
        if (counter) counter.textContent = `${done}/${total}`;
    }

    async function uUS() {
        const user = await fUD();
        const container = document.getElementById("itz-user-stats");
        if (!container || !user) return;
        const wC = fC(user.wheelNextAt);
        container.innerHTML = `
            <div class="itz-user-card">
                <div class="itz-stat-row">
                    <span>🪙 Points</span>
                    <span class="itz-val-points">${user.points.toLocaleString()}</span>
                </div>
                <div class="itz-stat-row">
                    <span>💵 Clams</span>
                    <span class="itz-val-clams">${user.clams.toLocaleString()}</span>
                </div>
                <div class="itz-stat-row" style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px; margin-top: 2px;">
                    <span class="itz-val-luck">🍀 ${user.wheelDayEarned}/10</span>
                    <span class="itz-val-timer">⏰ ${wC}</span>
                </div>
            </div>
        `;
    }

    async function uTC() {
        const tasks = await fTasks();
        let sTot = 0, sDone = 0, wTot = 0, wDone = 0;
        for (const t of tasks) {
            if (t.type.startsWith("STEAM")) {
                sTot++;
                if (!t.isAvailable && t.availabilityReason === "MAX_COMPLETIONS_REACHED") sDone++;
            } else {
                wTot++;
                if (!t.isAvailable && (t.availabilityReason === "COOLDOWN_ACTIVE" || t.availabilityReason === "MAX_COMPLETIONS_REACHED")) wDone++;
            }
        }
        const tot = sTot + wTot, done = sDone + wDone;
        uPB("itz-task-bar", done, tot);
        const counter = document.getElementById("itz-task-bar-counter");
        if (counter) counter.textContent = `📺 ${wDone}/${wTot} 🎮 ${sDone}/${sTot}`;
    }

    async function uSGD() {
        const giveaways = await fSG();
        const entries = await fSE();
        const container = document.getElementById("itz-slot-giveaways");
        if (!container) return;
        let html = `<div class="itz-giveaway-grid">`;
        giveaways.forEach((g, idx) => {
            const label = g.kind === "SLOTS_1H" ? "1H" : "24H";
            const tickets = g.kind === "SLOTS_1H" ? entries.oneHour : entries.twentyFourHour;
            const totalEntries = g.totalEntries || 0;
            const wR = totalEntries > 0 ? ((tickets / totalEntries) * 100).toFixed(2) : "0.00";
            const col = idx + 1;
            const sIM = g.prize.imageUrl.match(/steam\/apps\/(\d+)\//);
            const sID = sIM ? sIM[1] : null;
            const link = sID ? `https://s.team/a/${sID}` : "https://www.itzagud.net/slots";
            html += `
                <div class="itz-label" style="grid-column:${col}; grid-row:1;">${label}</div>
                <div style="grid-column:${col}; grid-row:2;">
                    <img src="${g.prize.imageUrl}" alt="${g.prize.name}" class="itz-prize-img">
                </div>
                <div style="grid-column:${col}; grid-row:3;">
                    <a href="${link}" target="_blank" class="itz-prize-name">${g.prize.name}</a>
                </div>
                <div class="itz-meta-val" style="grid-column:${col}; grid-row:4; color:#facc15;">⌛ ${fC(g.endsAt)}</div>
                <div class="itz-meta-val" style="grid-column:${col}; grid-row:5; color:#93c5fd;">🎫 ${tickets.toLocaleString()}</div>
                <div class="itz-meta-val" style="grid-column:${col}; grid-row:6; color:var(--itz-accent);">👥 ${totalEntries.toLocaleString()}</div>
                <div class="itz-meta-val" style="grid-column:${col}; grid-row:7; color:var(--itz-luck);">📊 ${wR}%</div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
    }

    function mkDrag(titleEl, widgetEl) {
        let dragging = false, ox = 0, oy = 0;
        titleEl.style.cursor = "grab";
        titleEl.style.userSelect = "none";
        try {
            const saved = localStorage.getItem('itz_widget_pos');
            if (saved) {
                const pos = JSON.parse(saved);
                const w = 280;
                let x = Math.max(0, Math.min(pos.x, window.innerWidth - w));
                let y = Math.max(0, Math.min(pos.y, window.innerHeight - 50));
                widgetEl.style.transition = "none";
                widgetEl.style.transform = "none";
                widgetEl.style.left = x + "px";
                widgetEl.style.top = y + "px";
                widgetEl.style.right = "auto";
            }
        } catch (e) {}

        titleEl.addEventListener("pointerdown", (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            if (e.target.closest && e.target.closest('#itz-toggle-btn')) return;
            dragging = true;
            const r = widgetEl.getBoundingClientRect();
            ox = e.clientX - r.left;
            oy = e.clientY - r.top;
            titleEl.setPointerCapture(e.pointerId);
            titleEl.style.cursor = "grabbing";
            widgetEl.style.transition = "none";
            widgetEl.style.transform = "none";
            widgetEl.style.top = r.top + "px";
            widgetEl.style.right = "auto";
            widgetEl.style.left = r.left + "px";
        });
        titleEl.addEventListener("pointermove", (e) => {
            if (!dragging) return;
            const x = Math.max(0, Math.min(e.clientX - ox, window.innerWidth - widgetEl.offsetWidth));
            const y = Math.max(0, Math.min(e.clientY - oy, window.innerHeight - widgetEl.offsetHeight));
            widgetEl.style.left = x + "px";
            widgetEl.style.top = y + "px";
        });
        titleEl.addEventListener("pointerup", () => {
            dragging = false;
            titleEl.style.cursor = "grab";
            widgetEl.style.transition = "";
            const r = widgetEl.getBoundingClientRect();
            try {
                localStorage.setItem('itz_widget_pos', JSON.stringify({x: r.left, y: r.top}));
            } catch(e){}
        });
    }

    function wg() {
        if (document.getElementById("itzagud-widget")) return;
        iS();
        const widget = document.createElement("div");
        widget.id = "itzagud-widget";

        // Restore hidden state from localStorage
        let isHidden = false;
        try { isHidden = localStorage.getItem('itz_widget_hidden') === '1'; } catch(e) {}
        if (isHidden) widget.classList.add('itz-hidden');

        const titleRow = document.createElement("div");
        titleRow.style = "display:flex; align-items:center; gap:8px; margin-bottom:16px; border-bottom:1px solid var(--itz-border); padding-bottom:10px;";

        // Toggle button
        const toggleBtn = document.createElement("button");
        toggleBtn.id = "itz-toggle-btn";
        toggleBtn.title = "Toggle widget visibility";
        toggleBtn.textContent = isHidden ? "👁 Show" : "👁 Hide";

        toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // prevent drag triggering
            const hidden = widget.classList.toggle('itz-hidden');
            toggleBtn.textContent = hidden ? "👁 Show" : "👁 Hide";
            try { localStorage.setItem('itz_widget_hidden', hidden ? '1' : '0'); } catch(e) {}
        });

        titleRow.innerHTML = `
            <img class="itz-title-icon" src="https://www.itzagud.net/favicon.ico" style="width:20px; height:20px;">
            <span class="itz-title-label" style="font-weight:700; font-size:16px; letter-spacing:0.5px; color:var(--itz-accent);">ITZAGUD STATS</span>
        `;
        titleRow.appendChild(toggleBtn);
        mkDrag(titleRow, widget);
        widget.appendChild(titleRow);

        const mkPB = (id, label) => {
            const wrap = document.createElement("div");
            wrap.className = "itz-progress-container";
            wrap.innerHTML = `
                <div class="itz-progress-label">
                    <span>${label}</span>
                    <span id="${id}-counter">0/0</span>
                </div>
                <div class="itz-progress-outer">
                    <div id="${id}" class="itz-progress-inner" style="width:0%"></div>
                </div>`;
            return wrap;
        };

        const content = document.createElement("div");
        content.id = "itz-widget-content";

        const userStatsDiv = document.createElement("div");
        userStatsDiv.id = "itz-user-stats";
        userStatsDiv.className = "itz-section";
        userStatsDiv.innerHTML = `<div style="font-size:13px;color:#a1a1aa;text-align:center;">Loading user data...</div>`;

        const taskSection = document.createElement("div");
        taskSection.className = "itz-section";
        taskSection.appendChild(mkPB("itz-task-bar", "Tasks Status"));

        const slotGiveawaysDiv = document.createElement("div");
        slotGiveawaysDiv.id = "itz-slot-giveaways";
        slotGiveawaysDiv.className = "itz-section";
        slotGiveawaysDiv.innerHTML = `<div style="font-size:13px;color:#a1a1aa;text-align:center;">Loading giveaways...</div>`;

        content.appendChild(userStatsDiv);
        content.appendChild(taskSection);
        content.appendChild(slotGiveawaysDiv);
        widget.appendChild(content);
        document.body.appendChild(widget);
    }

    function bt() {
        wg();
        uUS(); uTC(); uSGD();
        setInterval(uUS, 30 * 1000);
        setInterval(uTC, 5 * 60 * 1000);
        setInterval(uSGD, 60 * 1000);
    }

    if (document.readyState === "complete" || document.readyState === "interactive") { bt(); } else { window.addEventListener("DOMContentLoaded", bt); window.addEventListener("load", bt); }
})();
