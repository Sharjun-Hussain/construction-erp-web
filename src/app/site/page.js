"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

const dstr = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 3 });

export default function Site() {
  const { lang, projectId } = useAppStore();
  const [tab, setTab] = useState("dpr");
  const [dprs, setDprs] = useState([]);
  const [mss, setMss] = useState([]);
  const [projects, setProjects] = useState([]);
  const [boqItems, setBoqItems] = useState([]);
  const [pid, setPid] = useState(projectId || "");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [showDpr, setShowDpr] = useState(false);
  const [showMs, setShowMs] = useState(false);
  const [dprForm, setDprForm] = useState({ date: new Date().toISOString().slice(0, 10), weather: "Clear", manpower: 0, notes: "" });
  const [lines, setLines] = useState([{ boq_item_id: "", qty_done: 0, remarks: "" }]);
  const [msForm, setMsForm] = useState({ title: "", due_date: "", weight_pct: 0, status: "Pending" });
  const [drawer, setDrawer] = useState(null);

  const load = () => {
    const q = pid ? `?project_id=${pid}` : "";
    api.get("/site/dpr" + q).then((r) => setDprs(r.data.data || [])).catch(() => {});
    api.get("/site/milestones" + q).then((r) => setMss(r.data.data || [])).catch(() => {});
    if (pid) {
      api.get("/boqs?project_id=" + pid + "&limit=5").then(async (r) => {
        const list = r.data.data || [];
        if (list[0]) {
          const b = await api.get("/boqs/" + list[0].id);
          setBoqItems(b.data.data?.items || []);
        } else setBoqItems([]);
      }).catch(() => {});
    } else setBoqItems([]);
  };
  useEffect(() => {
    api.get("/projects?limit=200").then((r) => setProjects(r.data.data || [])).catch(() => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [pid]);

  const act = async (fn, okMsg) => {
    setMsg(""); setOk("");
    try { await fn(); if (okMsg) setOk(okMsg); load(); }
    catch (e) { setMsg(e?.response?.data?.message || "Error"); }
  };
  const createDpr = (e) => {
    e.preventDefault();
    const useLines = lines.filter((l) => l.boq_item_id && Number(l.qty_done) > 0).map((l) => ({ ...l, qty_done: Number(l.qty_done) }));
    act(() => api.post("/site/dpr", { ...dprForm, project_id: pid, manpower: Number(dprForm.manpower || 0), lines: useLines }), "DPR submitted")
      .then(() => { setShowDpr(false); setLines([{ boq_item_id: "", qty_done: 0, remarks: "" }]); });
  };
  const createMs = (e) => {
    e.preventDefault();
    act(() => api.post("/site/milestones", { ...msForm, project_id: pid, weight_pct: Number(msForm.weight_pct || 0) }), "Milestone added")
      .then(() => { setShowMs(false); setMsForm({ title: "", due_date: "", weight_pct: 0, status: "Pending" }); });
  };

  return (
    <div className="projects-page">
      <div className="page-head">
        <div><h2>{t(lang, "site")}</h2></div><span className="spacer" />
        {tab === "dpr" && <button className="btn" onClick={() => setShowDpr(!showDpr)}>+ DPR</button>}
        {tab === "milestones" && <button className="btn" onClick={() => setShowMs(!showMs)}>+ Milestone</button>}
      </div>
      {msg && <div className="alert err" style={{ marginBottom: 12 }}>{msg}</div>}
      {ok && <div className="alert ok" style={{ marginBottom: 12 }}>{ok}</div>}

      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 10 }}>
        <select className="select" style={{ maxWidth: 260 }} value={pid} onChange={(e) => setPid(e.target.value)}>
          <option value="">{t(lang, "projects")} (select)</option>
          {projects.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}
        </select>
      </div>

      <div className="tabs" style={{ maxWidth: 440, marginBottom: 14 }}>
        {[["dpr", "Daily Progress (DPR)"], ["milestones", "Milestones"]].map(([k, label]) => (
          <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === "dpr" && (
        <div>
          {showDpr && (
            <div className="card" style={{ marginBottom: 12 }}>
              {!pid && <div className="alert err">Select a project first</div>}
              <form onSubmit={createDpr}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginBottom: 10 }}>
                  <div><label className="label">Date *</label><input className="input" type="date" value={dprForm.date} onChange={(e) => setDprForm({ ...dprForm, date: e.target.value })} required /></div>
                  <div><label className="label">Weather</label><input className="input" value={dprForm.weather} onChange={(e) => setDprForm({ ...dprForm, weather: e.target.value })} /></div>
                  <div><label className="label">Manpower</label><input className="input" type="number" value={dprForm.manpower} onChange={(e) => setDprForm({ ...dprForm, manpower: e.target.value })} /></div>
                  <div style={{ gridColumn: "span 2" }}><label className="label">Notes</label><input className="input" value={dprForm.notes} onChange={(e) => setDprForm({ ...dprForm, notes: e.target.value })} /></div>
                </div>
                <div className="label" style={{ marginBottom: 6 }}>Executed quantities (posts to BOQ progress on approval)</div>
                {lines.map((l, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <select className="select" style={{ flex: 2 }} value={l.boq_item_id} onChange={(e) => { const c = [...lines]; c[i].boq_item_id = e.target.value; setLines(c); }}>
                      <option value="">BOQ item…</option>
                      {boqItems.map((b) => (<option key={b.id} value={b.id}>{b.line_no} — {String(b.description).slice(0, 60)} ({b.unit})</option>))}
                    </select>
                    <input className="input" style={{ maxWidth: 110 }} type="number" step="0.001" placeholder="Qty" value={l.qty_done} onChange={(e) => { const c = [...lines]; c[i].qty_done = e.target.value; setLines(c); }} />
                    <input className="input" style={{ flex: 1 }} placeholder="Remarks" value={l.remarks} onChange={(e) => { const c = [...lines]; c[i].remarks = e.target.value; setLines(c); }} />
                    <button type="button" className="btn ghost sm" onClick={() => setLines(lines.filter((_, j) => j !== i))}>×</button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button type="button" className="btn ghost sm" onClick={() => setLines([...lines, { boq_item_id: "", qty_done: 0, remarks: "" }])}>+ Line</button>
                  <button className="btn sm" type="submit" disabled={!pid}>Submit DPR</button>
                </div>
              </form>
            </div>
          )}
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Date</th><th>Weather</th><th>Manpower</th><th>Lines</th><th>Qty total</th><th>Status</th><th></th></tr></thead>
            <tbody>{dprs.map((d) => (
              <tr key={d.id}><td>{dstr(d.date)}</td><td>{d.weather || "—"}</td><td>{d.manpower}</td>
                <td>{(d.lines || []).length}</td>
                <td>{fmt((d.lines || []).reduce((s, l) => s + Number(l.qty_done || 0), 0))}</td>
                <td><span className={"badge " + d.status}>{d.status}</span></td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="btn ghost sm" onClick={() => setDrawer(d)}>View</button>
                  {d.status !== "Approved" && <button className="btn ghost sm" onClick={() => act(() => api.post(`/site/dpr/${d.id}/approve`), "DPR approved — BOQ progress updated")}>Approve</button>}
                </td></tr>
            ))}
            {!dprs.length && <tr><td colSpan={7} className="muted" style={{ textAlign: "center", padding: 20 }}>{pid ? "No DPRs yet" : "Select a project"}</td></tr>}
            </tbody></table></div>
        </div>
      )}

      {tab === "milestones" && (
        <div>
          {showMs && (
            <div className="card" style={{ marginBottom: 12 }}>
              <form onSubmit={createMs} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10 }}>
                <div style={{ gridColumn: "span 2" }}><label className="label">Title *</label><input className="input" value={msForm.title} onChange={(e) => setMsForm({ ...msForm, title: e.target.value })} required /></div>
                <div><label className="label">Due date</label><input className="input" type="date" value={msForm.due_date} onChange={(e) => setMsForm({ ...msForm, due_date: e.target.value })} /></div>
                <div><label className="label">Weight %</label><input className="input" type="number" step="0.01" value={msForm.weight_pct} onChange={(e) => setMsForm({ ...msForm, weight_pct: e.target.value })} /></div>
                <div><label className="label">Status</label><select className="select" value={msForm.status} onChange={(e) => setMsForm({ ...msForm, status: e.target.value })}>{["Pending", "InProgress", "Completed"].map((x) => (<option key={x}>{x}</option>))}</select></div>
                <div style={{ display: "flex", alignItems: "end" }}><button className="btn" type="submit" disabled={!pid}>{t(lang, "createLbl")}</button></div>
              </form>
            </div>
          )}
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Milestone</th><th>Due</th><th>Weight</th><th>Status</th><th></th></tr></thead>
            <tbody>{mss.map((m) => (
              <tr key={m.id}><td>{m.title}</td><td>{dstr(m.due_date)}</td><td>{m.weight_pct}%</td>
                <td><span className={"badge " + (m.status === "Completed" ? "Approved" : "Draft")}>{m.status}</span></td>
                <td>{m.status !== "Completed" && <button className="btn ghost sm" onClick={() => act(() => api.put(`/site/milestones/${m.id}`, { status: m.status === "Pending" ? "InProgress" : "Completed" }))}>{m.status === "Pending" ? "Start" : "Complete"}</button>}</td></tr>
            ))}
            {!mss.length && <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 20 }}>No milestones</td></tr>}
            </tbody></table></div>
        </div>
      )}

      {drawer && (
        <div className="drawer-ov" onClick={() => setDrawer(null)}>
          <div className="drawer wide" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-h">
              <h3>DPR {dstr(drawer.date)} <span className={"badge " + drawer.status}>{drawer.status}</span></h3>
              <button className="btn ghost sm" onClick={() => setDrawer(null)}>×</button>
            </div>
            <p className="muted">{drawer.notes || ""} · Weather: {drawer.weather || "—"} · Manpower: {drawer.manpower}</p>
            <div className="table-wrap" style={{ marginTop: 12 }}><table className="tbl">
              <thead><tr><th>BOQ item</th><th>Qty done</th><th>Remarks</th></tr></thead>
              <tbody>{(drawer.lines || []).map((l) => {
                const b = boqItems.find((x) => x.id === l.boq_item_id);
                return <tr key={l.id}><td>{b ? `${b.line_no} — ${String(b.description).slice(0, 70)}` : l.boq_item_id}</td><td>{fmt(l.qty_done)}</td><td>{l.remarks || "—"}</td></tr>;
              })}</tbody>
            </table></div>
          </div>
        </div>
      )}
    </div>
  );
}
