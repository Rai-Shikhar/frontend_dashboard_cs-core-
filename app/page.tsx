"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LabelList,
} from "recharts";
import html2canvas from "html2canvas";

// ─── Types ────────────────────────────────────────────────────────────────────
type SeverityKey = "Critical" | "Major" | "Minor";
type NetworkKey  = "All" | "MSS" | "MGW";

interface KPIs {
  total_alarms: number; avg_alarms: number;
  total_sites: number; critical_alarms: number; unique_nodes: number;
}
interface ChartRow {
  Location: string; network_type: string;
  Critical: number; Major: number; Minor: number; "Grand Total": number;
}
interface DonutRow {
  location: string; network_type: string;
  Critical: number; Major: number; Minor: number;
}
interface PieRow   { name: string; value: number; }
interface AlarmRow { nodename: string; Severity_Label: SeverityKey; alarm_text: string; network_type: string; Location?: string; [k: string]: any; }

// ─── Constants ────────────────────────────────────────────────────────────────
const API = "https://vi-alarm-dashboard.onrender.com"; // Your live backend
const SEV_COLOR: Record<SeverityKey, string> = { Critical:"#EF4444", Major:"#F97316", Minor:"#10B981" };
const SEV_BG:    Record<SeverityKey, string> = { Critical:"bg-red-100 text-red-700", Major:"bg-orange-100 text-orange-700", Minor:"bg-emerald-100 text-emerald-700" };
const NET_BG: Record<string, string> = { MSS:"bg-violet-100 text-violet-700", MGW:"bg-sky-100 text-sky-700" };

// ─── Shared UI pieces ─────────────────────────────────────────────────────────
function Badge({ label, variant }: { label: string; variant: string }) {
  return <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${variant}`}>{label}</span>;
}

function SectionHeader({
  icon, title, onDownloadCSV, onDownloadImage
}: {
  icon: string; title: string; onDownloadCSV?: () => void; onDownloadImage?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base shrink-0">{icon}</span>
        <h2 className="text-[11px] lg:text-sm font-bold text-gray-700 uppercase tracking-wider leading-tight">{title}</h2>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onDownloadCSV && (
          <button onClick={onDownloadCSV} className="export-hide text-[10px] bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
            ↓ CSV
          </button>
        )}
        {onDownloadImage && (
          <button onClick={onDownloadImage} className="export-hide text-[10px] bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
            ↓ PNG
          </button>
        )}
      </div>
    </div>
  );
}

function Card({ children, className = "", id = "" }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={`bg-white rounded-2xl border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// ─── Utilities ─────────────────────────────────────────────────────────
const exportToCSV = (data: any[], filename: string) => {
  if (!data || !data.length) return alert("No data to export!");
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map(row => headers.map(fieldName => JSON.stringify(row[fieldName] || "")).join(","))
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const exportChartAsPNG = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return alert("Chart not found!");

  const hideElements = element.querySelectorAll(".export-hide");
  hideElements.forEach((el) => {
    (el as HTMLElement).style.visibility = "hidden";
  });

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 3, 
      logging: false,
      useCORS: true,
      onclone: (clonedDocument) => {
        const elementsToScrub = clonedDocument.getElementById(elementId)?.querySelectorAll(".export-hide");
        elementsToScrub?.forEach(el => (el as HTMLElement).style.display = "none");
      }
    });
    
    const a = document.createElement("a");
    a.download = `${filename}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  } catch (err) {
    console.error("Export failed", err);
    alert("Failed to export image. Check console for details.");
  } finally {
    hideElements.forEach((el) => {
      (el as HTMLElement).style.visibility = "";
    });
  }
};

// NEW: Converts raw hrs/mins into a clean "Xd Yh Zm" string format
const formatAging = (hrs: any, mins: any) => {
  if ((hrs === "N/A" || hrs === undefined) && (mins === "N/A" || mins === undefined)) return null;
  const totalMins = (Number(hrs) || 0) * 60 + (Number(mins) || 0);
  if (totalMins === 0) return "0m";
  
  const d = Math.floor(totalMins / 1440);
  const h = Math.floor((totalMins % 1440) / 60);
  const m = totalMins % 60;
  
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);
  
  return parts.join(" ");
};

// ─── Custom Pie Label ─────────────────────────────────────────────────────────
const renderPieLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, name, value, percent
}: any) => {
  if (value === 0) return null;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 28;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const sx = cx + (outerRadius + 6)  * Math.cos(-midAngle * RADIAN);
  const sy = cy + (outerRadius + 6)  * Math.sin(-midAngle * RADIAN);
  const mx = cx + (outerRadius + 18) * Math.cos(-midAngle * RADIAN);
  const my = cy + (outerRadius + 18) * Math.sin(-midAngle * RADIAN);
  const anchor = x > cx ? "start" : "end";
  const color  = SEV_COLOR[name as SeverityKey] ?? "#6B7280";

  return (
    <g>
      <path d={`M${sx},${sy}L${mx},${my}L${x},${y}`} stroke={color} strokeWidth={1.5} fill="none" />
      <circle cx={x} cy={y} r={2} fill={color} />
      <text x={x + (x > cx ? 4 : -4)} y={y} textAnchor={anchor} dominantBaseline="central"
        style={{ fontSize: 11, fontWeight: 700, fill: color }}>
        {name}
      </text>
      <text x={x + (x > cx ? 4 : -4)} y={y + 13} textAnchor={anchor} dominantBaseline="central"
        style={{ fontSize: 10, fontWeight: 600, fill: "#6B7280" }}>
        {value} ({(percent * 100).toFixed(0)}%)
      </text>
    </g>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheets,  setSelectedSheets]  = useState<string[]>([]);
  const [isCsv,           setIsCsv]           = useState(false);
  const [pendingFile,     setPendingFile]      = useState<File | null>(null);
  const [uploadStage,     setUploadStage]      = useState<"idle"|"sheet-pick"|"done">("idle");
  const [loading,         setLoading]          = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [kpis,            setKpis]            = useState<KPIs | null>(null);
  const [allChartData,    setAllChartData]    = useState<ChartRow[]>([]);
  const [allDonutData,    setAllDonutData]    = useState<DonutRow[]>([]);
  const [pieData,         setPieData]         = useState<PieRow[]>([]);
  const [rawAlarms,       setRawAlarms]       = useState<AlarmRow[]>([]);
  const [allLocations,    setAllLocations]    = useState<string[]>([]);
  const [activeLocations, setActiveLocations] = useState<string[]>([]);

  const [invOpen,    setInvOpen]    = useState(false);
  const [invLoc,     setInvLoc]     = useState("All");
  const [invSev,     setInvSev]     = useState<"All"|SeverityKey>("All");
  const [invNet,     setInvNet]     = useState<NetworkKey>("All");
  const [invLogs,    setInvLogs]    = useState<AlarmRow[]>([]);
  const [invLoading, setInvLoading] = useState(false);

  const filteredChart = allChartData.filter(d => activeLocations.length === 0 || activeLocations.includes(d.Location));
  const filteredDonut = allDonutData.filter(d => activeLocations.length === 0 || activeLocations.includes(d.location));
  const mssChart = filteredChart.filter(d => d.network_type === "MSS");
  const mgwChart = filteredChart.filter(d => d.network_type === "MGW");
  const mssDonut = filteredDonut.filter(d => d.network_type === "MSS");
  const mgwDonut = filteredDonut.filter(d => d.network_type === "MGW");

  // Calculates the top 5 highest ageing alarms based on total minutes
  const top5AgingAlarms = [...rawAlarms].sort((a, b) => {
    const ageA = (Number(a["aging in hrs"]) || 0) * 60 + (Number(a["aging in min"]) || 0);
    const ageB = (Number(b["aging in hrs"]) || 0) * 60 + (Number(b["aging in min"]) || 0);
    return ageB - ageA; 
  }).slice(0, 5);

  // UPGRADED: Opens Gmail explicitly in a new browser tab with Days/Hours/Mins format
  const handleMailTo = (e: React.MouseEvent, alarm: AlarmRow) => {
    e.stopPropagation();
    const subject = encodeURIComponent(`Action Required: ${alarm.Severity_Label} Alarm at ${alarm.nodename}`);
    const agingText = formatAging(alarm["aging in hrs"], alarm["aging in min"]) || "N/A";
  
    const body = encodeURIComponent(
      `Team,\n\nPlease review the following network alarm:\n\n` +
      `• Node: ${alarm.nodename}\n` +
      `• Severity: ${alarm.Severity_Label}\n` +
      `• Network: ${alarm.network_type}\n` +
      `• Location: ${alarm.Location || "Unknown"}\n` +
      `• Problem: ${alarm.alarm_text || "N/A"}\n` +
      `• Aging: ${agingText}\n\n` +
      `Please investigate immediately.\n\n` + 
      `-- Vi Network Command Center`
    );
    
    // Web URL specifically forces Gmail compose window
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
    window.open(gmailUrl, "_blank");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res  = await fetch(`${API}/api/list-sheets`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.status === "success") {
        if (data.is_csv) {
          setIsCsv(true);
          setAvailableSheets(["CSV Data"]);
          setSelectedSheets(["CSV Data"]);
          await processAlarms(file, [], true);
        } else {
          setIsCsv(false);
          setAvailableSheets(data.sheets);
          setSelectedSheets([]);
          setUploadStage("sheet-pick");
        }
      } else { alert("Error: " + data.message); }
    } catch { alert("Could not reach backend at " + API); }
    finally { setLoading(false); }
  };

  const processAlarms = useCallback(async (file: File | null, sheets: string[], csv = false) => {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    const params = new URLSearchParams();
    if (!csv && sheets.length) params.set("selected_sheets", sheets.join(","));
    try {
      const res  = await fetch(`${API}/api/process-alarms?${params}`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.status === "success") {
        setKpis(data.kpis);
        setAllChartData(data.chart_data);
        setAllDonutData(data.donut_data);
        setPieData(data.pie_chart_data);
        setRawAlarms(data.raw_alarms);
        setAllLocations(data.all_locations);
        setActiveLocations(data.all_locations);
        setInvLoc("All"); setInvLogs([]);
        setUploadStage("done");
      } else { alert("Processing error: " + data.message); }
    } catch { alert("Could not connect to backend."); }
    finally { setLoading(false); }
  }, []);

  const fetchInvestigator = useCallback(async (loc: string, sev: string, net: string) => {
    if (!pendingFile || loc === "All") { setInvLogs([]); return; }
    setInvLoading(true);
    const fd = new FormData();
    fd.append("file", pendingFile);
    const params = new URLSearchParams({ investigator_loc: loc, investigator_sev: sev, investigator_net: net });
    if (!isCsv && selectedSheets.length) params.set("selected_sheets", selectedSheets.join(","));
    try {
      const res  = await fetch(`${API}/api/process-alarms?${params}`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.status === "success") setInvLogs(data.investigator_logs ?? []);
    } catch {/* silent */}
    finally { setInvLoading(false); }
  }, [pendingFile, isCsv, selectedSheets]);

  const openInvestigator = (loc: string, sev: SeverityKey | "All" = "All", net: NetworkKey = "All") => {
    setInvOpen(true); setInvLoc(loc); setInvSev(sev); setInvNet(net);
    fetchInvestigator(loc, sev, net);
  };

  const toggleLocation = (loc: string) =>
    setActiveLocations(prev => prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]);

  const allSelected  = activeLocations.length === allLocations.length;
  const noneSelected = activeLocations.length === 0;

  // ── AlarmTable ──────────────────────────────────────────────────────────────
  function AlarmTable({ rows, title }: { rows: ChartRow[]; title: string }) {
    if (!rows.length) return (
      <Card className="p-6 flex items-center justify-center min-h-[160px]">
        <p className="text-sm text-gray-400 italic">No data for current filter</p>
      </Card>
    );
    const totals = rows.reduce((a, r) => ({
      Critical: a.Critical + r.Critical, Major: a.Major + r.Major,
      Minor: a.Minor + r.Minor, total: a.total + r["Grand Total"],
    }), { Critical: 0, Major: 0, Minor: 0, total: 0 });
    const maxTotal = Math.max(...rows.map(r => r["Grand Total"]));

    return (
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <SectionHeader
            icon={title.startsWith("MSS") ? "🖥️" : "📡"}
            title={title}
            onDownloadCSV={() => exportToCSV(rows, title)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                <th className="text-left px-5 py-3">Location</th>
                <th className="text-right px-4 py-3 text-red-500">Critical</th>
                <th className="text-right px-4 py-3 text-orange-500">Major</th>
                <th className="text-right px-4 py-3 text-emerald-600">Minor</th>
                <th className="text-right px-5 py-3 text-blue-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} onClick={() => openInvestigator(r.Location)}
                  className="border-t border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors group">
                  <td className="px-5 py-3 font-semibold text-gray-800 group-hover:text-blue-700">{r.Location}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-500">{r.Critical}</td>
                  <td className="px-4 py-3 text-right font-bold text-orange-500">{r.Major}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">{r.Minor}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`font-black tabular-nums ${r["Grand Total"] === maxTotal ? "text-red-500" : "text-gray-800"}`}>
                      {r["Grand Total"]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-black text-sm">
                <td className="px-5 py-3 text-gray-800">TOTAL</td>
                <td className="px-4 py-3 text-right text-red-500">{totals.Critical}</td>
                <td className="px-4 py-3 text-right text-orange-500">{totals.Major}</td>
                <td className="px-4 py-3 text-right text-emerald-600">{totals.Minor}</td>
                <td className="px-5 py-3 text-right text-blue-600">{totals.total}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    );
  }

  function SevBar({ label, val, total, color }: { label: string; val: number; total: number; color: string }) {
    const pct = total > 0 ? Math.round((val / total) * 100) : 0;
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="w-14 text-gray-500 shrink-0">{label}</span>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        <span className="w-8 text-right font-bold tabular-nums" style={{ color }}>{val}</span>
      </div>
    );
  }

  function DonutSection({ rows, title }: { rows: DonutRow[]; title: string }) {
    if (!rows.length) return null;
    const sectionId = `donut-${title.replace(/\s+/g, "-").toLowerCase()}`;
    return (
      <div id={sectionId}>
        <SectionHeader icon="🍩" title={title} onDownloadImage={() => exportChartAsPNG(sectionId, title)} />
        <div className="flex flex-wrap gap-4">
          {rows.map((r, i) => {
            const total  = r.Critical + r.Major + r.Minor;
            const pieces = (["Critical","Major","Minor"] as SeverityKey[])
              .filter(k => r[k] > 0)
              .map(k => ({ name: k, val: r[k] }));
            return (
              <Card key={i} className="p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all min-w-[170px] flex-1"
                onClick={() => openInvestigator(r.location, "All", r.network_type as NetworkKey)}>
                <p className="text-sm font-bold text-gray-800 mb-0.5">{r.location}</p>
                <p className="text-[11px] text-gray-400 mb-3">{total} alarms</p>
                <div className="h-16 w-full mb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieces.map(p => ({ name: p.name, value: p.val }))}
                        cx="50%" cy="50%" innerRadius={18} outerRadius={30}
                        paddingAngle={2} dataKey="value" strokeWidth={0} isAnimationActive={false}>
                        {pieces.map((p, j) => <Cell key={j} fill={SEV_COLOR[p.name]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5">
                  {pieces.map(p => (
                    <SevBar key={p.name} label={p.name} val={p.val} total={total} color={SEV_COLOR[p.name]} />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  function SheetPicker() {
    const toggle = (s: string) =>
      setSelectedSheets(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <Card className="p-8 w-full max-w-2xl shadow-2xl">
          <h2 className="text-gray-900 font-black text-xl mb-1">Select Sheets</h2>
          <p className="text-gray-500 text-sm mb-5">Pick the tabs containing MSS / MGW alarm data.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto mb-6 pr-2">
            {availableSheets.map(s => {
              const active = selectedSheets.includes(s);
              const isMss  = s.toLowerCase().includes("mss");
              const isMgw  = s.toLowerCase().includes("mgw");
              return (
                <button key={s} onClick={() => toggle(s)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all
                    ${active ? "bg-red-50 border-red-300 text-red-700 shadow-sm" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                  <span className="truncate pr-2">{s}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0
                    ${isMss ? "bg-violet-100 text-violet-700" : isMgw ? "bg-sky-100 text-sky-700" : "bg-gray-200 text-gray-500"}`}>
                    {isMss ? "MSS" : isMgw ? "MGW" : "DATA"}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button onClick={() => { setUploadStage("idle"); setPendingFile(null); }}
              className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button disabled={selectedSheets.length === 0 || loading}
              onClick={() => processAlarms(pendingFile, selectedSheets)}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-sm transition-colors shadow-sm">
              {loading ? "Processing…" : `Process ${selectedSheets.length} Sheet${selectedSheets.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {uploadStage === "sheet-pick" && !isCsv && <SheetPicker />}

      <div className="flex h-screen bg-gray-50 font-sans overflow-hidden text-gray-900">

        {/* ── LEFT SIDEBAR ──────────────────────────────────────────────── */}
        <div className="w-[340px] bg-white border-r border-gray-200 flex flex-col shadow-sm shrink-0">

          <div className="px-5 pt-6 pb-5 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shrink-0">
                <span className="text-white text-lg font-black">Vi</span>
              </div>
              <div>
                <p className="font-black text-gray-900 text-sm leading-tight">Vi Network</p>
                <p className="text-[10px] text-gray-400 tracking-wider uppercase">Alarm Command</p>
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xlsb" onChange={handleFileChange} className="hidden" />
            <button onClick={() => fileRef.current?.click()}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold tracking-wide transition-colors flex items-center justify-center gap-2 shadow-sm">
              {loading
                ? <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Loading…</>
                : <><span>↑</span> Upload Raw Logs</>}
            </button>
            {uploadStage === "done" && (
              <p className="text-center text-[10px] text-emerald-600 mt-2 font-semibold">
                ● {selectedSheets.length} sheet{selectedSheets.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Active Sites */}
          {uploadStage === "done" && allLocations.length > 0 && (
            <div className="px-4 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Active Sites</p>
                <div className="flex gap-2">
                  <button onClick={() => setActiveLocations([...allLocations])}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors
                      ${allSelected ? "bg-red-100 text-red-600" : "text-gray-400 hover:text-red-500"}`}>
                    All
                  </button>
                  <button onClick={() => setActiveLocations([])}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors
                      ${noneSelected ? "bg-gray-200 text-gray-700" : "text-gray-400 hover:text-gray-600"}`}>
                    None
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                {allLocations.map(loc => {
                  const isActive = activeLocations.includes(loc);
                  return (
                    <button key={loc} onClick={() => toggleLocation(loc)}
                      className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all
                        ${isActive ? "bg-red-50 text-red-700 border border-red-200" : "bg-gray-50 text-gray-400 border border-gray-100 hover:border-gray-200 hover:text-gray-600"}`}>
                      <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors
                        ${isActive ? "bg-red-600 border-red-600" : "bg-white border-gray-300"}`}>
                        {isActive && (
                          <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-white">
                            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                      {loc}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scrollable lower sidebar */}
          {uploadStage === "done" ? (
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6">

              {/* Export Data (CSV) */}
              <div>
                <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">Export Data (CSV)</p>
                <div className="flex flex-col gap-2">
                  <button onClick={() => exportToCSV(rawAlarms, "All_Alarms")}
                    className="text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 py-2 px-3 rounded-lg text-left font-semibold transition-colors">
                    📥 All Processed Logs
                  </button>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => exportToCSV(rawAlarms.filter(a => a.Severity_Label === "Critical"), "Critical_Alarms")}
                      className="text-xs bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 py-2 px-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /> Critical
                    </button>
                    <button onClick={() => exportToCSV(rawAlarms.filter(a => a.Severity_Label === "Major"), "Major_Alarms")}
                      className="text-xs bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 py-2 px-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" /> Major
                    </button>
                    <button onClick={() => exportToCSV(rawAlarms.filter(a => a.Severity_Label === "Minor"), "Minor_Alarms")}
                      className="text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 py-2 px-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> Minor
                    </button>
                  </div>
                </div>
              </div>

              {/* Top 5 Highest Ageing Alarms */}
              <div>
                <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">Top 5 Longest Ageing</p>
                <div className="flex flex-col gap-2">
                  {top5AgingAlarms.length === 0 ? (
                    <div className="w-full h-24 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center text-xs text-gray-400 italic">No aging data</div>
                  ) : (
                    top5AgingAlarms.map((alarm, idx) => {
                      const color = SEV_COLOR[alarm.Severity_Label] ?? "#9CA3AF";
                      const agingStr = formatAging(alarm["aging in hrs"], alarm["aging in min"]);
                      return (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm relative group hover:border-red-200 transition-colors" style={{ borderLeftWidth: 3, borderLeftColor: color }}>
                          <div className="flex justify-between items-start mb-1">
                             <span className="font-bold text-xs text-gray-800 truncate pr-2">{alarm.nodename}</span>
                             <button onClick={(e) => handleMailTo(e, alarm)} className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 shrink-0" title="Email Alarm">
                                ✉️ {agingStr ? agingStr : "Alert Team"}
                             </button>
                          </div>
                          <p className="text-[10px] text-gray-500 truncate">{alarm.alarm_text || "—"}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 px-4 py-6">
              <p className="text-gray-400 text-xs italic text-center">Awaiting file upload…</p>
            </div>
          )}
        </div>

        {/* ── INVESTIGATOR PANEL ────────────────────────────────────────── */}
        {invOpen && (
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-md shrink-0">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-red-600 uppercase mb-0.5">🔍 Investigator</p>
                <p className="text-xs text-gray-500">Drill-down into node logs</p>
              </div>
              <button onClick={() => setInvOpen(false)}
                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs transition-colors">✕</button>
            </div>
            <div className="px-4 py-3 border-b border-gray-100 space-y-2">
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Location</label>
                <select value={invLoc}
                  onChange={e => { setInvLoc(e.target.value); fetchInvestigator(e.target.value, invSev, invNet); }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-red-400">
                  <option value="All">All Locations</option>
                  {allLocations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Network</label>
                  <select value={invNet}
                    onChange={e => { setInvNet(e.target.value as NetworkKey); fetchInvestigator(invLoc, invSev, e.target.value); }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-700 focus:outline-none focus:border-red-400">
                    {["All","MSS","MGW"].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Severity</label>
                  <select value={invSev}
                    onChange={e => { setInvSev(e.target.value as any); fetchInvestigator(invLoc, e.target.value, invNet); }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-700 focus:outline-none focus:border-red-400">
                    {["All","Critical","Major","Minor"].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {invLoading && (
                <div className="flex justify-center py-10">
                  <span className="w-5 h-5 border-2 border-gray-200 border-t-red-500 rounded-full animate-spin" />
                </div>
              )}
              {!invLoading && invLoc === "All" && (
                <p className="text-gray-400 text-xs text-center pt-8 italic">Select a location above.</p>
              )}
              {!invLoading && invLoc !== "All" && invLogs.length === 0 && (
                <p className="text-gray-400 text-xs text-center pt-8 italic">No logs match this filter.</p>
              )}
              {!invLoading && [...invLogs]
                .sort((a, b) => {
                  const ageA = (Number(a["aging in hrs"]) || 0) * 60 + (Number(a["aging in min"]) || 0);
                  const ageB = (Number(b["aging in hrs"]) || 0) * 60 + (Number(b["aging in min"]) || 0);
                  return ageB - ageA; 
                })
                .map((log, i) => {
                  const agingStr = formatAging(log["aging in hrs"], log["aging in min"]);
                  return (
                    <div key={i} className="mb-2 bg-gray-50 rounded-xl p-3 border border-gray-100"
                      style={{ borderLeftWidth: 3, borderLeftColor: SEV_COLOR[log.Severity_Label] ?? "#9CA3AF" }}>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-gray-700 truncate">{log.nodename}</span>
                        <Badge label={log.network_type} variant={NET_BG[log.network_type] ?? "bg-gray-100 text-gray-500"} />
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">{log.alarm_text || "—"}</p>
                      
                      {agingStr && <p className="text-[10px] text-gray-400 mt-1">Age: {agingStr}</p>}
                      
                      <button onClick={(e) => handleMailTo(e, log)} className="mt-2 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1 w-fit" title="Email Alarm">
                        ✉️ Notify via Email
                      </button>
                    </div>
                  );
                })
              }
            </div>
          </div>
        )}

        {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-8 py-7 min-w-0">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Command Center</h1>
              <p className="text-xs text-gray-400 mt-0.5">Vi Network · Real-Time Alarm Intelligence</p>
            </div>
            <div className="flex items-center gap-3">
              {uploadStage === "done" && (
                <button onClick={() => exportChartAsPNG("all-charts-row", "Combined_Network_Charts")}
                  className="export-hide text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 font-bold px-3 py-1.5 rounded-lg transition-colors">
                  📸 Download Combined Charts
                </button>
              )}
              {uploadStage === "done" && (
                <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 tracking-wider uppercase">
                  ● Live
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {[
              { label: "Total Alarms",    value: kpis ? kpis.total_alarms.toLocaleString()    : "—", accent: "border-l-red-500"    },
              { label: "Critical",        value: kpis ? kpis.critical_alarms.toLocaleString() : "—", accent: "border-l-orange-500" },
              { label: "Avg / Node",      value: kpis ? kpis.avg_alarms                       : "—", accent: "border-l-yellow-400" },
              { label: "Monitored Sites", value: kpis ? kpis.total_sites                       : "—", accent: "border-l-blue-500"   },
              { label: "Unique Nodes",    value: kpis ? kpis.unique_nodes.toLocaleString()     : "—", accent: "border-l-violet-500" },
            ].map((k, i) => (
              <Card key={i} className={`p-5 border-l-4 ${k.accent}`}>
                <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-2">{k.label}</p>
                <p className="text-3xl font-black text-gray-900 tabular-nums">{loading ? "…" : k.value}</p>
              </Card>
            ))}
          </div>

          {uploadStage === "done" && !allSelected && (
            <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
              <span className="font-semibold">Showing:</span>
              {activeLocations.length === 0
                ? <span className="text-orange-500 font-bold">No locations selected — charts empty</span>
                : activeLocations.map(l => (
                    <span key={l} className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full font-semibold border border-red-100">{l}</span>
                  ))
              }
            </div>
          )}

          {uploadStage === "done" && (
            <>
              <div id="all-charts-row" className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                
                <Card className="p-5" id="mss-chart-container">
                  <SectionHeader
                    icon="🖥️" title="MSS Network Severity"
                    onDownloadImage={() => exportChartAsPNG("mss-chart-container", "MSS_Severity_Chart")}
                  />
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mssChart} margin={{ top: 22, right: 6, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                        <XAxis dataKey="Location" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: "#F9FAFB" }}
                          contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "#6B7280" }} />
                        <Bar dataKey="Critical" fill="#EF4444" radius={[4,4,0,0]} isAnimationActive={false}
                          onClick={d => openInvestigator(d.Location, "Critical", "MSS")} style={{ cursor: "pointer" }}>
                          <LabelList dataKey="Critical" position="top"
                            style={{ fontSize: 10, fontWeight: 700, fill: "#EF4444" }}
                            formatter={(v: number) => v > 0 ? v : ""} />
                        </Bar>
                        <Bar dataKey="Major" fill="#F97316" radius={[4,4,0,0]} isAnimationActive={false}
                          onClick={d => openInvestigator(d.Location, "Major", "MSS")} style={{ cursor: "pointer" }}>
                          <LabelList dataKey="Major" position="top"
                            style={{ fontSize: 10, fontWeight: 700, fill: "#F97316" }}
                            formatter={(v: number) => v > 0 ? v : ""} />
                        </Bar>
                        <Bar dataKey="Minor" fill="#10B981" radius={[4,4,0,0]} isAnimationActive={false}
                          onClick={d => openInvestigator(d.Location, "Minor", "MSS")} style={{ cursor: "pointer" }}>
                          <LabelList dataKey="Minor" position="top"
                            style={{ fontSize: 10, fontWeight: 700, fill: "#10B981" }}
                            formatter={(v: number) => v > 0 ? v : ""} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-5" id="mgw-chart-container">
                  <SectionHeader
                    icon="📡" title="MGW Network Severity"
                    onDownloadImage={() => exportChartAsPNG("mgw-chart-container", "MGW_Severity_Chart")}
                  />
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mgwChart} margin={{ top: 22, right: 6, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                        <XAxis dataKey="Location" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: "#F9FAFB" }}
                          contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "#6B7280" }} />
                        <Bar dataKey="Critical" fill="#EF4444" radius={[4,4,0,0]} isAnimationActive={false}
                          onClick={d => openInvestigator(d.Location, "Critical", "MGW")} style={{ cursor: "pointer" }}>
                          <LabelList dataKey="Critical" position="top"
                            style={{ fontSize: 10, fontWeight: 700, fill: "#EF4444" }}
                            formatter={(v: number) => v > 0 ? v : ""} />
                        </Bar>
                        <Bar dataKey="Major" fill="#F97316" radius={[4,4,0,0]} isAnimationActive={false}
                          onClick={d => openInvestigator(d.Location, "Major", "MGW")} style={{ cursor: "pointer" }}>
                          <LabelList dataKey="Major" position="top"
                            style={{ fontSize: 10, fontWeight: 700, fill: "#F97316" }}
                            formatter={(v: number) => v > 0 ? v : ""} />
                        </Bar>
                        <Bar dataKey="Minor" fill="#10B981" radius={[4,4,0,0]} isAnimationActive={false}
                          onClick={d => openInvestigator(d.Location, "Minor", "MGW")} style={{ cursor: "pointer" }}>
                          <LabelList dataKey="Minor" position="top"
                            style={{ fontSize: 10, fontWeight: 700, fill: "#10B981" }}
                            formatter={(v: number) => v > 0 ? v : ""} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-5 flex flex-col" id="pie-chart-container">
                  <SectionHeader
                    icon="📊" title="Overall Breakdown"
                    onDownloadImage={() => exportChartAsPNG("pie-chart-container", "Severity_Breakdown_Chart")}
                  />
                  <div className="flex-1 min-h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                        <Pie
                          data={pieData}
                          cx="50%" cy="50%"
                          innerRadius={52} outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                          strokeWidth={0}
                          isAnimationActive={false}
                          labelLine={false}
                          label={renderPieLabel}
                        >
                          {pieData.map((e, i) => (
                            <Cell key={i} fill={SEV_COLOR[e.name as SeverityKey] ?? "#ccc"} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 12 }}
                          formatter={(value: number, name: string) => [value, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-5 pt-2 pb-1">
                    {pieData.filter(d => d.value > 0).map((d, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SEV_COLOR[d.name as SeverityKey] }} />
                        {d.name}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Alarm directory tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                <AlarmTable rows={mssChart} title="MSS Alarm Directory" />
                <AlarmTable rows={mgwChart} title="MGW Alarm Directory" />
              </div>

              {/* Donut composition */}
              <div className="space-y-6 mb-6">
                <DonutSection rows={mssDonut} title="MSS Composition" />
                <DonutSection rows={mgwDonut} title="MGW Composition" />
              </div>
            </>
          )}

          {/* Idle splash */}
          {uploadStage === "idle" && (
            <div className="flex flex-col items-center justify-center py-28 text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-5">
                <span className="text-3xl">📡</span>
              </div>
              <h2 className="text-xl font-black text-gray-700 mb-2">No Data Loaded</h2>
              <p className="text-sm text-gray-400 max-w-xs">
                Upload a raw alarm log (.xlsb, .xlsx, or .csv) using the sidebar to populate the dashboard.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}