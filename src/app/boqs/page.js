"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable from "@/components/DataTable";

export default function Boqs() {
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
  const [form, setForm] = useState({ number: "", title: "" });
  const [templates, setTemplates] = useState([]);
  const [tplId, setTplId] = useState("");
  const [busy, setBusy] = useState(false);

  const load = (p = page, l = limit, sb = sortBy, sd = sortDir) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`, `sortBy=${sb}`, `sortDir=${sd}`];
    if (search) q.push("search=" + encodeURIComponent(search));
    if (status) q.push("status=" + status);
    if (pid) q.push("project_id=" + pid);
    api.get("/boqs?" + q.join("&")).then((r) => {
      setRows(r.data.data || []); setTotal(r.data.meta?.total || 0); setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => {
    api.get("/projects?limit=200").then((r) => setProjects(r.data.data || [])).catch(() => {});
    api.get("/boqs/templates").then((r) => setTemplates(r.data.data || [])).catch(() => {});
    load(1, 10, "created_at", "DESC");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { setPage(1); setSelected([]); load(1, limit, sortBy, sortDir); }, [status, pid]);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      const targetPid = pid || projects[0]?.id;
      if (!targetPid) { setMsg("No project"); return; }
      const r = await api.post("/boqs", { ...form, project_id: targetPid });
      setForm({ number: "", title: "" }); setShowNew(false);
      window.location.href = "/boqs/" + r.data.data.id;
    } catch (err) { setMsg(err?.response?.data?.message || "Error"); }
    finally { setBusy(false); }
  };
  const fromTemplate = async () => {
    if (!tplId) return;
    setBusy(true); setMsg("");
    try {
      const targetPid = pid || projects[0]?.id;
      const r = await api.post(`/boqs/templates/${tplId}/instantiate`, { project_id: targetPid, number: form.number || undefined, title: form.title || undefined });
      window.location.href = "/boqs/" + r.data.data.id;
    } catch (err) { setMsg(err?.response?.data?.message || "Error"); }
    finally { setBusy(false); }
  };
  const importFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const targetPid = pid || projects[0]?.id;
    if (!targetPid) { setMsg("Select a project first"); return; }
    setBusy(true); setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("project_id", targetPid);
      if (form.number) fd.append("number", form.number);
      if (form.title) fd.append("title", form.title);
      const r = await api.post("/boqs/import", fd);
      setMsg(r.data.message);
      load();
    } catch (err) { setMsg(err?.response?.data?.message || "Error"); }
    finally { setBusy(false); e.target.value = ""; }
  };
  const onSort = (k) => {
    const nd = sortBy === k && sortDir === "ASC" ? "DESC" : "ASC";
    setSortBy(k); setSortDir(nd); load(page, limit, k, nd);
  };

  const columns = [
    { key: "number", label: "Number", sortable: true, render: (b) => <a href={"/boqs/" + b.id}><b style={{ fontWeight: 500 }}>{b.number} <span className="muted">R{b.revision}</span></b></a> },
    { key: "title", label: t(lang, "title"), sortable: true },
    { key: "total_amount", label: t(lang, "amount"), sortable: true, render: (b) => Number(b.total_amount || 0).toLocaleString() },
    { key: "status", label: "Status", sortable: true, render: (b) => <span className={"badge " + b.status}>{b.status}</span> },
    { key: "actions", label: "", render: (b) => <a className="btn ghost sm" href={"/boqs/" + b.id}>{t(lang, "viewDetails")}</a> },
  ];

  return (
    <div className="projects-page">
      <div className="page-head">
        <div><h2>{t(lang, "boq")}</h2></div><span className="spacer" />
        <label className="btn ghost sm" style={{ cursor: "pointer" }}>{t(lang, "importBoq")}<input type="file" accept=".xlsx,.xls,.csv" hidden onChange={importFile} /></label>
        <button className="btn" onClick={() => setShowNew(!showNew)}>+ {t(lang, "boq")}</button>
      </div>
      {msg && <div className="alert err" style={{ marginBottom: 12 }}>{msg}</div>}
      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input className="input" style={{ maxWidth: 220 }} placeholder={t(lang, "search")} value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(1, limit, sortBy, sortDir)} />
        <select className="select" style={{ maxWidth: 220 }} value={pid} onChange={(e) => setPid(e.target.value)}>
          <option value="">{t(lang, "projects")}</option>
          {projects.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}
        </select>
        <select className="select" style={{ maxWidth: 160 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          {["", "Draft", "Submitted", "Approved", "Revised"].map((s) => (<option key={s} value={s}>{s || "—"}</option>))}
        </select>
      </div>
      {showNew && (
        <div className="card" style={{ marginBottom: 14 }}>
          <form onSubmit={create} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            <div><label className="label">Number</label><input className="input" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required /></div>
            <div><label className="label">{t(lang, "title")}</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <button className="btn" disabled={busy}>{t(lang, "createLbl")}</button>
          </form>
          {templates.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "end", flexWrap: "wrap" }}>
              <div><label className="label">{t(lang, "fromTemplate")}</label>
                <select className="select" value={tplId} onChange={(e) => setTplId(e.target.value)}>
                  <option value="">—</option>
                  {templates.map((x) => (<option key={x.id} value={x.id}>{x.name} ({(x.items || []).length})</option>))}
                </select></div>
              <button className="btn ghost" disabled={busy || !tplId} onClick={fromTemplate}>{t(lang, "createLbl")}</button>
            </div>
          )}
        </div>
      )}
      <DataTable
        columns={columns} rows={rows} total={total} page={page} limit={limit}
        onPage={(p) => { setPage(p); load(p, limit, sortBy, sortDir); }}
        onLimit={(l) => { setLimit(l); setPage(1); load(1, l, sortBy, sortDir); }}
        sortBy={sortBy} sortDir={sortDir} onSort={onSort}
        selected={selected} onSelect={setSelected} keyOf={(b) => b.id}
        loading={loading}
        title={t(lang, "boq")}
        search={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); clearTimeout(window.__bq); window.__bq = setTimeout(() => load(1, limit, sortBy, sortDir), 300); }}
        stats={[{ label: t(lang, "boq"), value: total }]}
      />
    </div>
  );
}
