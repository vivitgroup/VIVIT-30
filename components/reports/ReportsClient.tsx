"use client";
import { useState } from "react";

type Entity = "clients" | "tasks" | "sales" | "finance" | "media" | "expenses";

const ENTITIES: { value: Entity; label: string; icon: string; fields: string[] }[] = [
  { value:"clients",  label:"Clients",    icon:"🏢", fields:["Company","Industry","Health Score","Churn Risk","Monthly Retainer","Media Budget","Contract Value","Performance Score"] },
  { value:"tasks",    label:"Tasks",      icon:"🎨", fields:["Title","Type","Status","Priority","Client ID","Assigned To","Deadline","Revisions","Posted"] },
  { value:"sales",    label:"Sales",      icon:"🎯", fields:["Company","Contact","Stage","Source","Value","Probability","Industry","Expected Close"] },
  { value:"finance",  label:"Finance",    icon:"💰", fields:["Client ID","Month","Year","Retainer","Media Fee","Extra","Total","Paid","Outstanding","Status"] },
  { value:"media",    label:"Media",      icon:"📣", fields:["Client ID","Platform","Date","Ad Spend","Leads","Purchases","Revenue","ROAS","CPL","Agency Fee"] },
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
  const [error,setError]        = useState("");

  const activeFields = data ? (selFields.length ? data.headers.filter((h:string)=>selFields.includes(h)) : data.headers) : [];
  const activeIndexes = data ? activeFields.map((h:string)=>data.headers.indexOf(h)) : [];
  const projectedRows = data ? data.rows.map((row:any[])=>activeIndexes.map((i:number)=>row[i])) : [];

  const sortedRows = data ? [...projectedRows].sort((a:any[], b:any[]) => {
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
    setLoading(true);setError("");setRows(50);
    try {
      const r = await fetch(`/api/export?entity=${entity}`);
      const d = await r.json();
      if(!r.ok)throw new Error(d.error||"The report could not be generated.");
      setData(d);
    } catch(e:any){setData(null);setError(e.message||"The report could not be generated.");}
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = [activeFields, ...projectedRows];
    const csv  = rows.map((r: any[]) => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = `vivit-${entity}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const exportJSON = () => {
    if (!data) return;
    const records=projectedRows.map((row:any[])=>Object.fromEntries(activeFields.map((h:string,i:number)=>[h,row[i]])));
    const blob = new Blob([JSON.stringify(records, null, 2)], { type:"application/json" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = `vivit-${entity}-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const quickExport = async (target: Entity) => {
    setError("");
    try {
      const response = await fetch(`/api/export?entity=${target}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The export could not be generated.");
      const records = payload.rows.map((row: unknown[]) =>
        Object.fromEntries(payload.headers.map((header: string, index: number) => [header, row[index]]))
      );
      const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `vivit-${target}-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (exportError: any) {
      setError(exportError.message || "The export could not be generated.");
    }
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
              className={`p-2 rounded-xl border text-center transition-all ${entity===e.value ? "border-[#244D87] bg-[#244D87]/15" : "border-white/8 bg-white/[0.02] hover:border-white/20"}`}>
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
              <button onClick={selectAll} className="text-[10px] text-[#244D87] hover:text-[#00B4D8]">Select All</button>
              <span className="text-dim">·</span>
              <button onClick={clearAll} className="text-[10px] text-muted hover:text-[#D4E4F0]">Clear</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedEntity.fields.map(f => (
              <button key={f} onClick={() => toggleField(f)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${selFields.includes(f) ? "border-[#244D87] bg-[#244D87]/15 text-[#00B4D8]" : "border-white/10 text-muted hover:border-white/20"}`}>
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
                className={`text-xs px-3 py-1.5 transition-all ${format===f ? "bg-[#244D87]/20 text-[#00B4D8]" : "text-muted hover:bg-white/5"}`}>
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
              <button onClick={()=>window.print()} className="btn-outline text-xs">🖨️ Print / PDF</button>
            </>
          )}
        </div>
        {error&&<p className="form-error" role="alert">{error}</p>}
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
                <thead><tr>{activeFields.map((h:string, i:number) => (
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
              {sortedRows.length > 50 && (
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
              {JSON.stringify(projectedRows.slice(0, 20).map((row:any[])=>Object.fromEntries(activeFields.map((h:string,i:number)=>[h,row[i]]))), null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Quick Export shortcuts */}
      <div className="card-vivit">
        <h2 className="font-semibold mb-3">⚡ Quick Export</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ENTITIES.map(e => (
            <button key={e.value} type="button" onClick={() => quickExport(e.value)}
              className="flex items-center gap-2 p-3 rounded-xl border border-white/8 bg-white/[0.02] hover:border-[#244D87]/30 transition-all"
              style={{textDecoration:"none", textAlign:"left"}}>
              <span className="text-xl">{e.icon}</span>
              <div>
                <p className="text-sm font-semibold">{e.label}</p>
                <p className="text-[10px] text-muted">JSON export</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
