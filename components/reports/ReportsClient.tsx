"use client";
import { useState } from "react";

type Entity = "clients" | "tasks" | "sales" | "finance" | "media" | "expenses";

const ENTITIES: { value: Entity; label: string; icon: string; fields: string[] }[] = [
  { value:"clients",  label:"Clients",    icon:"🏢", fields:["Company Name","Industry","Health Score","Churn Risk","LTV","Monthly Retainer","Contract End"] },
  { value:"tasks",    label:"Tasks",      icon:"🎨", fields:["Title","Type","Status","Priority","Deadline","Creator","Client","Revision Count"] },
  { value:"sales",    label:"Sales",      icon:"🎯", fields:["Company","Stage","Est. Value","Probability","Source","Sales Rep","Won At","Lost Reason"] },
  { value:"finance",  label:"Finance",    icon:"💰", fields:["Client","Month","Year","Retainer","Paid","Outstanding","Invoice Status","Collection Rate"] },
  { value:"media",    label:"Media",      icon:"📣", fields:["Client","Platform","Date","Ad Spend","Leads","ROAS","CAC","CPL","Agency Fee"] },
  { value:"expenses", label:"Expenses",   icon:"🧾", fields:["Category","Description","Amount","Date"] },
];

export function ReportsClient() {
  const [entity, setEntity]     = useState<Entity>("clients");
  const [selFields, setFields]  = useState<string[]>([]);
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(false);
  const [format, setFormat]     = useState<"table"|"json">("table");
  const [sortCol, setSortCol]   = useState<number | null>(null);
  const [sortDir, setSortDir]   = useState<"asc"|"desc">("asc");
  const [visibleRows, setRows]  = useState(50);

  const sortedRows = data ? [...data.rows].sort((a:any[], b:any[]) => {
    if (sortCol === null) return 0;
    const va = String(a[sortCol] ?? ""), vb = String(b[sortCol] ?? "");
    return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
  }) : [];

  const handleSort = (col: number) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const selectedEntity = ENTITIES.find(e => e.value === entity)!;

  const toggleField = (f: string) =>
    setFields(prev => prev.includes(f) ? prev.filter(x=>x!==f) : [...prev, f]);

  const selectAll = () => setFields([...selectedEntity.fields]);
  const clearAll  = () => setFields([]);

  const runReport = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/export?entity=${entity}`);
      const d = await r.json();
      setData(d);
    } finally { setLoading(false); }
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = [data.headers, ...data.rows];
    const csv  = rows.map((r: any[]) => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = `vivit-${entity}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const exportJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = `vivit-${entity}-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  return (
    <div className="space-y-5">
      {/* Report Builder */}
      <div className="card-vivit">
        <h2 className="font-semibold mb-4">🔨 Custom Report Builder</h2>

        {/* Entity selection */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          {ENTITIES.map(e => (
            <button key={e.value} onClick={() => { setEntity(e.value); setFields([]); setData(null); }}
              className={`p-2 rounded-xl border text-center transition-all ${entity===e.value ? "border-[#0077B6] bg-[#0077B6]/15" : "border-white/8 bg-white/[0.02] hover:border-white/20"}`}>
              <div className="text-xl mb-0.5">{e.icon}</div>
              <p className="text-[11px] font-semibold">{e.label}</p>
            </button>
          ))}
        </div>

        {/* Field selector */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">Select Fields</p>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-[10px] text-[#0077B6] hover:text-[#00B4D8]">Select All</button>
              <span className="text-dim">·</span>
              <button onClick={clearAll} className="text-[10px] text-muted hover:text-[#D4E4F0]">Clear</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedEntity.fields.map(f => (
              <button key={f} onClick={() => toggleField(f)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${selFields.includes(f) ? "border-[#0077B6] bg-[#0077B6]/15 text-[#00B4D8]" : "border-white/10 text-muted hover:border-white/20"}`}>
                {selFields.includes(f) ? "✓ " : ""}{f}
              </button>
            ))}
          </div>
        </div>

        {/* View format + Run */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-xl border border-white/10 overflow-hidden">
            {(["table","json"] as const).map(f => (
              <button key={f} onClick={() => setFormat(f)}
                className={`text-xs px-3 py-1.5 transition-all ${format===f ? "bg-[#0077B6]/20 text-[#00B4D8]" : "text-muted hover:bg-white/5"}`}>
                {f === "table" ? "📋 Table" : "{ } JSON"}
              </button>
            ))}
          </div>
          <button onClick={runReport} disabled={loading}
            className="btn-grad">
            {loading ? "⏳ Loading..." : "▶ Run Report"}
          </button>
          {data && (
            <>
              <button onClick={exportCSV}  className="btn-outline text-xs">📥 Export CSV</button>
              <button onClick={exportJSON} className="btn-outline text-xs">📥 Export JSON</button>
            </>
          )}
        </div>
      </div>

      {/* Results */}
      {data && (
        <div className="card-vivit !p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
            <span className="text-sm font-semibold">{data.count} records — {selectedEntity.label}</span>
            <span className="badge badge-info text-[10px]">{format.toUpperCase()}</span>
          </div>
          {format === "table" ? (
            <div className="overflow-x-auto">
              <table className="erp-table">
                <thead><tr>{data.headers.map((h:string, i:number) => (
                <th key={h} className={`sortable-th ${sortCol===i?sortDir:""}`}
                  onClick={()=>handleSort(i)}>{h}</th>
              ))}</tr></thead>
                <tbody>
                  {sortedRows.slice(0, visibleRows).map((row:any[], i:number) => (
                    <tr key={i}>{row.map((cell:any, j:number) => (
                      <td key={j}>{cell === null || cell === undefined ? "—" : String(cell).slice(0, 80)}</td>
                    ))}</tr>
                  ))}
                </tbody>
              </table>
              {data.rows.length > 50 && (
                <div className="text-center py-3">
                  <p className="text-xs text-muted">Showing {Math.min(visibleRows, sortedRows.length)} of {sortedRows.length} rows</p>
                  {visibleRows < sortedRows.length && (
                    <button onClick={()=>setRows(v=>v+50)} className="btn-ghost text-xs mt-2">Load 50 more ↓</button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <pre className="p-4 text-[11px] text-[#00B4D8] overflow-x-auto max-h-96 font-mono">
              {JSON.stringify(data.rows.slice(0, 20), null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Quick Export shortcuts */}
      <div className="card-vivit">
        <h2 className="font-semibold mb-3">⚡ Quick Export</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ENTITIES.map(e => (
            <a key={e.value} href={`/api/export?entity=${e.value}`} target="_blank"
              className="flex items-center gap-2 p-3 rounded-xl border border-white/8 bg-white/[0.02] hover:border-[#0077B6]/30 transition-all"
              style={{textDecoration:"none"}}>
              <span className="text-xl">{e.icon}</span>
              <div>
                <p className="text-sm font-semibold">{e.label}</p>
                <p className="text-[10px] text-muted">JSON export</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
