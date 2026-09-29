"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

const dstr = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function Changes() {
  const { lang, projectId } = useAppStore();
  const [tab, setTab] = useState("requests");
  const [crs, setCrs] = useState([]);
  const [vos, setVos] = useState([]);
  const [projects, setProjects] = useState([]);
  const [pid, setPid] = useState(projectId || "");
  const [cStatus, setCStatus] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ project_id: "", title: "", description: "", origin: "Site", cost_impact: 0, time_impact_days: 0, raised_by: "" });

  const load = () => {
    const cq = [...(pid ? [`project_id=${pid}`] : []), ...(cStatus ? [`status=${cStatus}`] : []), "limit=200"].join("&");
    api.get("/changes?" + cq).then((r) => setCrs(r.data.data || [])).catch(() => {});
    api.get("/site/variations?" + (pid ? `project_id=${pid}` : "")).then((r) => setVos(r.data.data || [])).catch(() => {});
  };
  useEffect(() => {
    api.get("/projects?limit=200").then((r) => setProjects(r.data.data || [])).catch(() => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [pid, cStatus]);

  const act = async (fn, okMsg) => {
    setMsg(""); setOk("");
    try { await fn(); if (okMsg) setOk(okMsg); load(); }
    catch (e) { setMsg(e?.response?.data?.message || "Error"); }
  };
  const create = (e) => {
    e.preventDefault();
    act(() => api.post("/changes", { ...form, cost_impact: Number(form.cost_impact || 0), time_impact_days: Number(form.time_impact_days || 0) }), "Change request raised")
      .then(() => { setShowNew(false); setForm({ project_id: "", title: "", description: "", origin: "Site", cost_impact: 0, time_impact_days: 0, raised_by: "" }); });
  };

  return (
    <div className="projects-page">
      <div className="page-head">
        <div><h2>{t(lang, "changes")}</h2></div><span className="spacer" />
        {tab === "requests" && <button className="btn" onClick={() => setShowNew(!showNew)}>+ Change request</button>}
      </div>
      {msg && <div className="alert err" style={{ marginBottom: 12 }}>{msg}</div>}
      {ok && <div className="alert ok" style={{ marginBottom: 12 }}>{ok}</div>}

      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <select className="select" style={{ maxWidth: 230 }} value={pid} onChange={(e) => setPid(e.target.value)}>
          <option value="">{t(lang, "projects")} (all)</option>
          {projects.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}
        </select>
        {tab === "requests" && (
          <select className="select" style={{ maxWidth: 170 }} value={cStatus} onChange={(e) => setCStatus(e.target.value)}>
            {["", "Raised", "UnderReview", "Approved", "Rejected", "Converted"].map((s) => (<option key={s} value={s}>{s || "All statuses"}</option>))}
          </select>
        )}
      </div>

      <div className="tabs" style={{ maxWidth: 440, marginBottom: 14 }}>
        {[["requests", "Change requests"], ["variations", "Variation orders"]].map(([k, label]) => (
          <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === "requests" && (
        <div>
          {showNew && (
            <div className="card" style={{ marginBottom: 12 }}>
              <form onSubmit={create} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10 }}>
                <div><label className="label">Project *</label><select className="select" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} required><option value="">—</option>{projects.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}</select></div>
                <div style={{ gridColumn: "span 2" }}><label className="label">Title *</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
                <div><label className="label">Origin</label><select className="select" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })}>{["Client", "Consultant", "Site", "Design", "Subcontractor", "Other"].map((x) => (<option key={x}>{x}</option>))}</select></div>
                <div><label className="label">Cost impact</label><input className="input" type="number" step="0.01" value={form.cost_impact} onChange={(e) => setForm({ ...form, cost_impact: e.target.value })} /></div>
                <div><label className="label">Time impact (days)</label><input className="input" type="number" value={form.time_impact_days} onChange={(e) => setForm({ ...form, time_impact_days: e.target.value })} /></div>
                <div><label className="label">Raised by</label><input className="input" value={form.raised_by} onChange={(e) => setForm({ ...form, raised_by: e.target.value })} /></div>
                <div style={{ gridColumn: "1 / -1" }}><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div style={{ display: "flex", alignItems: "end" }}><button className="btn" type="submit">{t(lang, "createLbl")}</button></div>
              </form>
            </div>
          )}
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>No</th><th>Title</th><th>Origin</th><th>Cost</th><th>Time</th><th>VO</th><th>Status</th><th></th></tr></thead>
            <tbody>{crs.map((c) => (
              <tr key={c.id}><td>{c.number}</td>
                <td><div>{c.title}</div><div className="muted" style={{ fontSize: 11 }}>{c.project?.code} · {c.raised_by || ""}</div></td>
                <td>{c.origin}</td><td>{fmt(c.cost_impact)}</td><td>{c.time_impact_days}d</td>
                <td>{c.variation ? <span className="badge Submitted">{c.variation.number}</span> : "—"}</td>
                <td><span className={"badge " + c.status}>{c.status}</span></td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {c.status === "Raised" && <button className="btn ghost sm" onClick={() => act(() => api.post(`/changes/${c.id}/transition`, { status: "UnderReview" }))}>Review</button>}
                  {c.status === "UnderReview" && <><button className="btn ghost sm" onClick={() => act(() => api.post(`/changes/${c.id}/transition`, { status: "Approved" }), "Approved")}>Approve</button> <button className="btn ghost sm" onClick={() => act(() => api.post(`/changes/${c.id}/transition`, { status: "Rejected" }))}>Reject</button></>}
                  {c.status === "Approved" && <button className="btn sm" onClick={() => act(() => api.post(`/changes/${c.id}/convert`, {}), "Converted to variation order")}>Convert to VO</button>}
                </td></tr>
            ))}
            {!crs.length && <tr><td colSpan={8} className="muted" style={{ textAlign: "center", padding: 20 }}>No change requests</td></tr>}
            </tbody></table></div>
        </div>
      )}

      {tab === "variations" && (
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>No</th><th>Description</th><th>Amount</th><th>Days</th><th>Status</th><th></th></tr></thead>
          <tbody>{vos.map((v) => (
            <tr key={v.id}><td>{v.number}</td><td style={{ maxWidth: 340 }}>{v.description}</td>
              <td>{fmt(v.amount)}</td><td>{v.impact_days}</td>
              <td><span className={"badge " + v.status}>{v.status}</span></td>
              <td style={{ whiteSpace: "nowrap" }}>
                {["Draft", "Submitted"].includes(v.status) && <><button className="btn ghost sm" onClick={() => act(() => api.post(`/site/variations/${v.id}/decision`, { status: "Approved" }), "VO approved — contract value updated")}>Approve</button> <button className="btn ghost sm" onClick={() => act(() => api.post(`/site/variations/${v.id}/decision`, { status: "Rejected" }))}>Reject</button></>}
              </td></tr>
          ))}
          {!vos.length && <tr><td colSpan={6} className="muted" style={{ textAlign: "center", padding: 20 }}>No variation orders</td></tr>}
          </tbody></table></div>
      )}
    </div>
  );
}
