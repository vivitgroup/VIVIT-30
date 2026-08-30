"use client";
import { useEffect, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };

export function useOnlinePresence(userId: string, userName: string, role: string) {
  useEffect(() => {
    const report = () => {
      const page = window.location.pathname.split("/").pop() ?? "dashboard";
      fetch("/api/quick-action", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ action:"heartbeat", userId, userName, role, page }),
      }).catch(()=>{});
    };
    report();
    const interval = setInterval(report, 30000);
    return () => clearInterval(interval);
  }, [userId, userName, role]);
}

export function useConflictDetection(entityId: string, entityType: string) {
  const [conflict, setConflict] = useState<string | null>(null);

  useEffect(() => {
    if (!entityId) return;
    const key = `vivit-editing:${entityType}:${entityId}`;
    const me  = Date.now().toString();
    try { sessionStorage.setItem(key, me); } catch {}

    const interval = setInterval(async () => {
      try {
        const stored = sessionStorage.getItem(key);
        if (stored && stored !== me) {
          setConflict("This record is being edited by someone else. Refresh to get the latest version.");
        }
      } catch {}
    }, 10000);

    return () => {
      clearInterval(interval);
      try { sessionStorage.removeItem(key); } catch {}
    };
  }, [entityId, entityType]);

  return conflict;
}

interface Notification { id:string; title:string; message:string; priority:string; link?:string|null; createdAt:string; }

const P: Record<string,{bg:string;border:string;icon:string;sound:number}> = {
  urgent: { bg:"rgba(239,68,68,0.96)",  border:"#dc2626", icon:"🚨", sound:3 },
  high:   { bg:"rgba(245,158,11,0.96)", border:"#d97706", icon:"⚠️", sound:2 },
  normal: { bg:"rgba(10,28,55,0.97)",   border:"rgba(0,119,182,0.4)", icon:"🔔", sound:1 },
  low:    { bg:"rgba(10,28,55,0.95)",   border:"rgba(255,255,255,0.1)", icon:"💬", sound:0 },
};

function playNotificationSound(priority: string) {
  try {
    const AudioCtx = window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const tones = { urgent:[880,660,880], high:[660,880], normal:[440,550], low:[330] };
    const freqs = tones[priority as keyof typeof tones] ?? [440];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.3);
    });
  } catch {}
}

export function RealtimeNotifications() {
  const router = useRouter();
  const [toasts, setToasts] = useState<(Notification & {key:number})[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastSeen = useRef<string>(new Date().toISOString());
  const pollRef  = useRef<NodeJS.Timeout|null>(null);
  const keyRef   = useRef(0);
  const totalUnread = useRef(0);
  const origTitle   = useRef<string>("");

  const updateTabBadge = useCallback((count: number) => {
    if (!origTitle.current) origTitle.current = document.title.replace(/^\(\d+\) /, "");
    document.title = count > 0 ? `(${count}) ${origTitle.current}` : origTitle.current;
  }, []);

  const showToast = useCallback((n: Notification) => {
    const key = ++keyRef.current;
    setToasts(prev => [...prev.slice(-2), { ...n, key }]);
    totalUnread.current++;
    updateTabBadge(totalUnread.current);
    const p = P[n.priority] ?? P.normal;
    if (soundEnabled && p.sound > 0) playNotificationSound(n.priority);
    const delay = n.priority==="urgent" ? 10000 : n.priority==="high" ? 7000 : 5000;
    setTimeout(() => setToasts(prev => prev.filter(t => t.key !== key)), delay);
  }, [soundEnabled, updateTabBadge]);

  const fetchNew = useCallback(async () => {
    try {
      const r = await fetch(`/api/notifications/poll?since=${encodeURIComponent(lastSeen.current)}`);
      if (!r.ok) return;
      const data = await r.json();
      const notifs: Notification[] = data.notifications ?? [];
      if (notifs.length > 0) {
        lastSeen.current = new Date().toISOString();
        notifs.slice(0, 3).forEach(n => showToast(n));
      }
    } catch {}
  }, [showToast]);

  useEffect(() => {
    let interval = 30000;
    const startPolling = () => {
      pollRef.current = setInterval(() => { if (!document.hidden) fetchNew(); }, interval);
    };
    const handleVis = () => {
      if (pollRef.current) clearInterval(pollRef.current);
      interval = document.hidden ? 120000 : 30000;
      startPolling();
      if (!document.hidden) fetchNew();
    };
    document.addEventListener("visibilitychange", handleVis);
    startPolling(); fetchNew();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", handleVis);
    };
  }, [fetchNew]);

  const dismiss = (key: number) => {
    setToasts(prev => prev.filter(t => t.key !== key));
    totalUnread.current = Math.max(0, totalUnread.current - 1);
    updateTabBadge(totalUnread.current);
  };

  return (
    <>
      <button
        onClick={() => setSoundEnabled(v => !v)}
        title={soundEnabled ? "Mute notification sounds" : "Enable notification sounds"}
        style={{position:"fixed",top:"56px",right:"12px",zIndex:9998,background:"rgba(10,28,55,0.9)",border:"1px solid rgba(0,119,182,0.2)",borderRadius:"8px",padding:"4px 8px",cursor:"pointer",fontSize:"14px",color:"#5A80A0"}}>
        {soundEnabled ? "🔔" : "🔕"}
      </button>

      <div style={{position:"fixed",bottom:"20px",right:"20px",zIndex:9999,display:"flex",flexDirection:"column",gap:"8px",maxWidth:"340px"}}>
        {toasts.map(t => {
          const style = P[t.priority] ?? P.normal;
          return (
            <div key={t.key}
              onClick={() => { if (t.link) { router.push(t.link); dismiss(t.key); } }}
              style={{background:style.bg,border:`1px solid ${style.border}`,borderRadius:"14px",padding:"14px 16px",boxShadow:"0 8px 32px rgba(0,0,0,0.5)",backdropFilter:"blur(16px)",animation:"slideIn 0.25s ease-out",cursor:t.link?"pointer":"default"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:"10px"}}>
                <span style={{fontSize:"18px",flexShrink:0}}>{style.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontFamily:"Inter,sans-serif",fontSize:"13px",fontWeight:700,color:"#F0F8FF",margin:0,lineHeight:1.3}}>{t.title}</p>
                  <p style={{fontFamily:"Inter,sans-serif",fontSize:"11px",color:"rgba(200,220,240,0.8)",margin:"4px 0 0",lineHeight:1.4}}>{t.message}</p>
                </div>
                <button onClick={e=>{e.stopPropagation();dismiss(t.key);}}
                  style={{background:"none",border:"none",color:"rgba(200,220,240,0.5)",cursor:"pointer",fontSize:"16px",padding:0,lineHeight:1}}>×</button>
              </div>
              {t.link && <p style={{fontFamily:"Inter,sans-serif",fontSize:"10px",color:"rgba(0,180,216,0.8)",margin:"6px 0 0 28px"}}>Click to view →</p>}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </>
  );
}
