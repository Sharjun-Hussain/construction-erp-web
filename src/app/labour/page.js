"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable from "@/components/DataTable";

const dstr = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

export default function Labour() {
  const { lang, projectId } = useAppStore();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [status, setStatus] = useState("");
  const [projects, setProjects] = useState([]);
  const [pid, setPid] = useState(projectId || "");
  const [showNew, setShowNew] = useState(false);
  const [assign, setAssign] = useState({});
  const [form, setForm] = useState({ project_id: "", trade: "", qty_requested: 1, date_required: new Date().toISOString().slice(0, 10), duration_days: 1, shift: "Day", skill_level: "", requested_by: "", notes: "" });

  const load = (p = page, l = limit) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`];
    if (status) q.push("status=" + status);
    if (pid) q.push("project_id=" + pid);
    api.get("/siteops/labour?" + q.join("&")).then((r) => {
      setRows(r.data.data || []); setTotal(r.data.meta?.total || 0); setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => {
    api.get("/projects?limit=200").then((r) => setProjects(r.data.data || [])).catch(() => {});
    load(1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { setPage(1); setSelected([]); load(1, limit); }, [status, pid]);

  const create = async (e) => {
    e.preventDefault(); setMsg("");
    try {
      await api.post("/siteops/labour", { ...form, qty_requested: Number(form.qty_requested), duration_days: Number(form.duration_days) });
      setShowNew(false); load();
    } catch (err) { setMsg(err?.response?.data?.message || "Error"); }
  };
  const transition = (id, st, qty) => {
    setMsg(""); setOk("");
    api.post(`/siteops/labour/${id}/transition`, { status: st, qty_assigned: qty })
      .then(() => { setOk("Request " + st); load(); })
      .catch((e) => setMsg(e?.response?.data?.message || "Error"));
  };

  const columns = [
    { key: "number", label: "No", render: (x) => <b style={{ fontWeight: 500 }}>{x.number}</b> },
    { key: "trade", label: "Trade", render: (x) => (<div>{x.trade}<div className="muted" style={{ fontSize: 11 }}>{x.project?.code || ""} · {x.shift} shift</div></div>) },
    { key: "qty", label: "Req / Assigned", render: (x) => (<div>{x.qty_requested} / <b style={{ color: Number(x.qty_assigned) < Number(x.qty_requested) ? "var(--danger)" : "inherit" }}>{x.qty_assigned}</b></div>) },
    { key: "date_required", label: "Required", render: (x) => <div>{dstr(x.date_required)}<div className="muted" style={{ fontSize: 11 }}>{x.duration_days}d</div></div> },
    { key: "requested_by", label: "By", render: (x) => x.requested_by || "—" },
    { key: "status", label: "Status", render: (x) => <span className={"badge " + x.status}>{x.status}</span> },
    { key: "actions", label: "", render: (x) => (
      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
        {x.status === "Requested" && <button className="btn ghost sm" onClick={() => transition(x.id, "Approved")}>Approve</button>}
        {x.status === "Approved" && (<><input className="input" style={{ maxWidth: 70 }} type="number" min="0" placeholder="qty" value={assign[x.id] ?? x.qty_requested} onChange={(e) => setAssign({ ...assign, [x.id]: e.target.value })} /><button className="btn ghost sm" onClick={() => transition(x.id, "Assigned", Number(assign[x.id] ?? x.qty_requested))}>Assign</button></>)}
        {x.status === "Assigned" && <button className="btn ghost sm" onClick={() => transition(x.id, "Fulfilled", Number(x.qty_assigned))}>Fulfil</button>}
      </div>
    ) },
  ];

  return (
    <div className="projects-page">
      <div className="page-head">
        <div><h2>{t(lang, "labour")}</h2></div><span className="spacer" />
        <button className="btn" onClick={() => setShowNew(!showNew)}>+ {t(lang, "labour")}</button>
      </div>
      {msg && <div className="alert err" style={{ marginBottom: 12 }}>{msg}</div>}
      {ok && <div className="alert ok" style={{ marginBottom: 12 }}>{ok}</div>}

      {showNew && (
        <div className="card" style={{ marginBottom: 14 }}>
          <form onSubmit={create} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 10 }}>
            <div><label className="label">Project *</label><select className="select" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} required><option value="">—</option>{projects.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}</select></div>
            <div><label className="label">Trade *</label><input className="input" value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })} required placeholder="Steel fixer" /></div>
            <div><label className="label">Qty</label><input className="input" type="number" min="1" value={form.qty_requested} onChange={(e) => setForm({ ...form, qty_requested: e.target.value })} /></div>
            <div><label className="label">Required on</label><input className="input" type="date" value={form.date_required} onChange={(e) => setForm({ ...form, date_required: e.target.value })} /></div>
            <div><label className="label">Duration (days)</label><input className="input" type="number" min="1" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} /></div>
            <div><label className="label">Shift</label><select className="select" value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}>{["Day", "Night", "Both"].map((x) => (<option key={x}>{x}</option>))}</select></div>
            <div><label className="label">Requested by</label><input className="input" value={form.requested_by} onChange={(e) => setForm({ ...form, requested_by: e.target.value })} /></div>
            <div style={{ display: "flex", alignItems: "end" }}><button className="btn" type="submit">{t(lang, "createLbl")}</button></div>
          </form>
        </div>
      )}

      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <select className="select" style={{ maxWidth: 230 }} value={pid} onChange={(e) => setPid(e.target.value)}>
          <option value="">{t(lang, "projects")}</option>
          {projects.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}
        </select>
        <select className="select" style={{ maxWidth: 160 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          {["", "Requested", "Approved", "Assigned", "Fulfilled", "Cancelled"].map((s) => (<option key={s} value={s}>{s || "All statuses"}</option>))}
        </select>
      </div>

      <DataTable
        columns={columns} rows={rows} total={total} page={page} limit={limit}
        onPage={(p) => { setPage(p); load(p, limit); }}
        onLimit={(l) => { setLimit(l); setPage(1); load(1, l); }}
        selected={selected} onSelect={setSelected} keyOf={(x) => x.id}
        loading={loading} title={t(lang, "labour")}
        stats={[{ label: "Open", value: rows.filter((r) => ["Requested", "Approved", "Assigned"].includes(r.status)).reduce((s, r) => s + (Number(r.qty_requested) - Number(r.qty_assigned)), 0) + " men" }]}
      />
    </div>
  );
}
