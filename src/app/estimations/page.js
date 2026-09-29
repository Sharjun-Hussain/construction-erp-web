"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable from "@/components/DataTable";

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function Estimations() {
  const { lang, projectId } = useAppStore();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("DESC");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [projects, setProjects] = useState([]);
  const [pid, setPid] = useState(projectId || "");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ number: "", project_id: "", material_cost: 0, labor_cost: 0, equipment_cost: 0, subcontract_cost: 0, overhead_pct: 5, contingency_pct: 5, escalation_pct: 0, margin_pct: 10 });

  const load = (p = page, l = limit, sb = sortBy, sd = sortDir) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`, `sortBy=${sb}`, `sortDir=${sd}`];
    if (search) q.push("search=" + encodeURIComponent(search));
    if (status) q.push("status=" + status);
    if (pid) q.push("project_id=" + pid);
    api.get("/estimations?" + q.join("&")).then((r) => {
      setRows(r.data.data || []); setTotal(r.data.meta?.total || 0); setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => {
    api.get("/projects?limit=200").then((r) => setProjects(r.data.data || [])).catch(() => {});
    load(1, limit, sortBy, sortDir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { setPage(1); setSelected([]); load(1, limit, sortBy, sortDir); }, [status, pid]);

  const onSort = (k) => { const nd = sortBy === k && sortDir === "ASC" ? "DESC" : "ASC"; setSortBy(k); setSortDir(nd); load(page, limit, k, nd); };
  const create = async (e) => {
    e.preventDefault(); setMsg("");
    try {
      const payload = { ...form };
      for (const k of ["material_cost", "labor_cost", "equipment_cost", "subcontract_cost", "overhead_pct", "contingency_pct", "escalation_pct", "margin_pct"]) payload[k] = Number(payload[k] || 0);
      if (!payload.number) delete payload.number;
      const r = await api.post("/estimations", payload);
      window.location.href = "/estimations/" + r.data.data.id;
    } catch (err) { setMsg(err?.response?.data?.message || "Error"); }
  };

  const columns = [
    { key: "number", label: "Estimation No", sortable: true, render: (x) => <a href={"/estimations/" + x.id}><b style={{ fontWeight: 500 }}>{x.number} <span className="muted">R{x.revision}</span></b></a> },
    { key: "project", label: "Project", render: (x) => x.project ? `${x.project.code}` : "—" },
    { key: "total_cost", label: "Total Cost", sortable: true, render: (x) => fmt(x.total_cost) },
    { key: "sell_total", label: "Sell Total", sortable: true, render: (x) => <b style={{ fontWeight: 600 }}>{fmt(x.sell_total)}</b> },
    { key: "margin", label: "Margin", render: (x) => { const m = Number(x.sell_total || 0) ? ((Number(x.sell_total) - Number(x.total_cost)) / Number(x.sell_total)) * 100 : 0; return <span style={{ color: m < 10 ? "var(--danger)" : "inherit", fontWeight: 600 }}>{m.toFixed(1)}%</span>; } },
    { key: "status", label: "Status", sortable: true, render: (x) => <span className={"badge " + x.status}>{x.status}</span> },
    { key: "actions", label: "", render: (x) => <a className="btn ghost sm" href={"/estimations/" + x.id}>Open</a> },
  ];

  return (
    <div className="projects-page">
      <div className="page-head">
        <div><h2>{t(lang, "estimation")}</h2></div><span className="spacer" />
        <button className="btn" onClick={() => setShowNew(!showNew)}>+ {t(lang, "estimation")}</button>
      </div>
      {msg && <div className="alert err" style={{ marginBottom: 12 }}>{msg}</div>}

      {showNew && (
        <div className="card" style={{ marginBottom: 14 }}>
          <form onSubmit={create} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
            <div><label className="label">Project *</label><select className="select" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} required><option value="">—</option>{projects.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}</select></div>
            <div><label className="label">Number (auto)</label><input className="input" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></div>
            {[["material_cost", "Material"], ["labor_cost", "Labour"], ["equipment_cost", "Equipment"], ["subcontract_cost", "Subcontract"]].map(([k, label]) => (
              <div key={k}><label className="label">{label}</label><input className="input" type="number" step="0.01" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
            ))}
            {[["overhead_pct", "Overhead %"], ["contingency_pct", "Contingency %"], ["escalation_pct", "Escalation %"], ["margin_pct", "Margin %"]].map(([k, label]) => (
              <div key={k}><label className="label">{label}</label><input className="input" type="number" step="0.01" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
            ))}
            <div style={{ display: "flex", alignItems: "end" }}><button className="btn" type="submit">{t(lang, "createLbl")}</button></div>
          </form>
        </div>
      )}

      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <select className="select" style={{ maxWidth: 230 }} value={pid} onChange={(e) => setPid(e.target.value)}>
          <option value="">{t(lang, "projects")} (all)</option>
          {projects.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}
        </select>
        <select className="select" style={{ maxWidth: 160 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          {["", "Draft", "Submitted", "Approved", "Rejected"].map((s) => (<option key={s} value={s}>{s || "All statuses"}</option>))}
        </select>
      </div>

      <DataTable
        columns={columns} rows={rows} total={total} page={page} limit={limit}
        onPage={(p) => { setPage(p); load(p, limit); }}
        onLimit={(l) => { setLimit(l); setPage(1); load(1, l); }}
        sortBy={sortBy} sortDir={sortDir} onSort={onSort}
        selected={selected} onSelect={setSelected} keyOf={(x) => x.id}
        loading={loading} title={t(lang, "estimation")}
        search={search} searchPlaceholder={t(lang, "search")}
        onSearchChange={(v) => { setSearch(v); setPage(1); clearTimeout(window.__est); window.__est = setTimeout(() => load(1, limit), 320); }}
        stats={[{ label: "Total", value: total }]}
      />
    </div>
  );
}
