"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

const dstr = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const COLS = [
  { key: "Open", label: "Open", color: "#5b6b82" },
  { key: "InProgress", label: "In Progress", color: "#2f7cf6" },
  { key: "OnHold", label: "On Hold", color: "#b26a00" },
  { key: "Done", label: "Done", color: "#0ba360" },
];

export default function Jobs() {
  const { lang, projectId } = useAppStore();
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [pid, setPid] = useState(projectId || "");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState({ project_id: "", title: "", description: "", division: "", trade: "", assignee: "", priority: "Normal", scheduled_start: "", scheduled_end: "", est_hours: 0 });
  const [prog, setProg] = useState(0);

  const load = () => {
    const q = pid ? `?project_id=${pid}&limit=200` : "?limit=200";
    api.get("/siteops/jobs" + q).then((r) => setRows(r.data.data || [])).catch(() => {});
  };
  useEffect(() => {
    api.get("/projects?limit=200").then((r) => setProjects(r.data.data || [])).catch(() => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [pid]);

  const act = async (fn, okMsg, keepDrawer) => {
    setMsg(""); setOk("");
    try {
      const r = await fn();
      if (okMsg) setOk(okMsg);
      load();
      if (keepDrawer && drawer) {
        const fresh = await api.get("/siteops/jobs" + (pid ? `?project_id=${pid}&limit=200` : "?limit=200"));
        const hit = (fresh.data.data || []).find((x) => x.id === drawer.id);
        if (hit) { setDrawer(hit); setProg(hit.progress_pct || 0); }
      }
      return r;
    } catch (e) { setMsg(e?.response?.data?.message || "Error"); }
  };
  const create = (e) => {
    e.preventDefault();
    act(() => api.post("/siteops/jobs", { ...form, est_hours: Number(form.est_hours || 0) }), "Job created").then(() => {
      setShowNew(false);
      setForm({ project_id: "", title: "", description: "", division: "", trade: "", assignee: "", priority: "Normal", scheduled_start: "", scheduled_end: "", est_hours: 0 });
    });
  };
  const move = (j, st) => act(() => api.post(`/siteops/jobs/${j.id}/transition`, { status: st }), `Job ${st}`, true);

  return (
    <div className="projects-page">
      <div className="page-head">
        <div><h2>{t(lang, "jobs")}</h2></div><span className="spacer" />
        <button className="btn" onClick={() => setShowNew(!showNew)}>+ {t(lang, "jobs")}</button>
      </div>
      {msg && <div className="alert err" style={{ marginBottom: 12 }}>{msg}</div>}
      {ok && <div className="alert ok" style={{ marginBottom: 12 }}>{ok}</div>}

      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 10 }}>
        <select className="select" style={{ maxWidth: 260 }} value={pid} onChange={(e) => setPid(e.target.value)}>
          <option value="">{t(lang, "projects")} (all)</option>
          {projects.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}
        </select>
      </div>

      {showNew && (
        <div className="card" style={{ marginBottom: 14 }}>
          <form onSubmit={create} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10 }}>
            <div><label className="label">Project *</label><select className="select" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} required><option value="">—</option>{projects.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}</select></div>
            <div style={{ gridColumn: "span 2" }}><label className="label">Title *</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div><label className="label">Trade</label><input className="input" value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })} /></div>
            <div><label className="label">Assignee</label><input className="input" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} /></div>
            <div><label className="label">Priority</label><select className="select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{["Low", "Normal", "High", "Urgent"].map((x) => (<option key={x}>{x}</option>))}</select></div>
            <div><label className="label">Start</label><input className="input" type="date" value={form.scheduled_start} onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })} /></div>
            <div><label className="label">End</label><input className="input" type="date" value={form.scheduled_end} onChange={(e) => setForm({ ...form, scheduled_end: e.target.value })} /></div>
            <div><label className="label">Est. hours</label><input className="input" type="number" step="0.5" value={form.est_hours} onChange={(e) => setForm({ ...form, est_hours: e.target.value })} /></div>
            <div style={{ display: "flex", alignItems: "end" }}><button className="btn" type="submit">{t(lang, "createLbl")}</button></div>
          </form>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12, alignItems: "start" }}>
        {COLS.map((c) => {
          const items = rows.filter((r) => r.status === c.key);
          return (
            <div key={c.key} className="card" style={{ margin: 0, background: "#f6f8fb" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: c.color }} />
                <b>{c.label}</b><span className="muted">({items.length})</span>
              </div>
              {items.map((j) => (
                <div key={j.id} className="card" style={{ margin: "0 0 8px", padding: 10, cursor: "pointer" }} onClick={() => { setDrawer(j); setProg(j.progress_pct || 0); }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{j.title}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{j.number} · {j.trade || "—"} · {j.assignee || "unassigned"}</div>
                  <div style={{ height: 5, background: "#e6ebf2", borderRadius: 4, marginTop: 6 }}>
                    <div style={{ width: `${j.progress_pct || 0}%`, height: "100%", background: c.color, borderRadius: 4 }} />
                  </div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{j.progress_pct || 0}% {j.overdue ? <span style={{ color: "var(--danger)", fontWeight: 700 }}>· overdue</span> : ""} {j.priority === "Urgent" || j.priority === "High" ? <span style={{ color: "var(--danger)" }}>· {j.priority}</span> : ""}</div>
                </div>
              ))}
              {!items.length && <p className="muted" style={{ fontSize: 12 }}>—</p>}
            </div>
          );
        })}
      </div>

      {drawer && (
        <div className="drawer-ov" onClick={() => setDrawer(null)}>
          <div className="drawer wide" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-h">
              <h3>{drawer.number} <span className={"badge " + drawer.status}>{drawer.status}</span></h3>
              <button className="btn ghost sm" onClick={() => setDrawer(null)}>×</button>
            </div>
            <h3 style={{ marginBottom: 8 }}>{drawer.title}</h3>
            <p className="muted">{drawer.description || ""}</p>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10, margin: "12px 0" }}>
              {[["Trade", drawer.trade], ["Assignee", drawer.assignee], ["Priority", drawer.priority],
                ["Planned", `${dstr(drawer.scheduled_start)} → ${dstr(drawer.scheduled_end)}`],
                ["Actual", `${dstr(drawer.actual_start)} → ${dstr(drawer.actual_end)}`],
                ["Hours (est/actual)", `${drawer.est_hours || 0} / ${drawer.actual_hours || 0}`],
              ].map(([k, v]) => (<div key={k}><div className="label">{k}</div><div>{v || "—"}</div></div>))}
            </div>
            <div style={{ marginBottom: 12 }}>
              <div className="label">Progress {drawer.progress_pct || 0}%</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input className="input" type="range" min="0" max="100" value={prog} onChange={(e) => setProg(Number(e.target.value))} style={{ flex: 1 }} />
                <button className="btn ghost sm" onClick={() => act(() => api.put("/siteops/jobs/" + drawer.id, { progress_pct: prog }), "Progress saved", true)}>Save</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {drawer.status === "Open" && <button className="btn sm" onClick={() => move(drawer, "InProgress")}>Start</button>}
              {drawer.status === "InProgress" && <><button className="btn sm" onClick={() => move(drawer, "Done")}>Complete</button><button className="btn ghost sm" onClick={() => move(drawer, "OnHold")}>Hold</button></>}
              {drawer.status === "OnHold" && <button className="btn sm" onClick={() => move(drawer, "InProgress")}>Resume</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
