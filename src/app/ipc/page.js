"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable from "@/components/DataTable";

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const FLOW = { Draft: ["Submitted"], Submitted: ["Approved", "Draft"], Approved: ["Paid"], Paid: [] };

export default function Ipc() {
  const { lang, projectId } = useAppStore();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [projects, setProjects] = useState([]);
  const [pid, setPid] = useState(projectId || "");
  const [status, setStatus] = useState("");
  const [drawer, setDrawer] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ project_id: "", number: "", gross_amount: 0, advance_recovery: 0, discount: 0 });

  const load = (p = page, l = limit) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`];
    if (pid) q.push("project_id=" + pid);
    if (status) q.push("status=" + status);
    api.get("/ipc?" + q.join("&")).then((r) => {
      setRows(r.data.data || []); setTotal((r.data.data || []).length); setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => {
    api.get("/projects?limit=200").then((r) => setProjects(r.data.data || [])).catch(() => {});
    load(1, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { setPage(1); load(1, limit); }, [pid, status]);

  const openDetail = (x) => {
    api.get("/ipc/" + x.id).then((r) => setDrawer(r.data.data)).catch(() => {});
  };
  const transition = (s) => {
    setMsg("");
    api.post(`/ipc/${drawer.id}/transition`, { status: s })
      .then((r) => { setDrawer(r.data.data); load(); })
      .catch((e) => setMsg(e?.response?.data?.message || "Error"));
  };
  const create = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const r = await api.post("/ipc", {
        ...form,
        project_id: form.project_id || pid || projects[0]?.id,
        gross_amount: Number(form.gross_amount), advance_recovery: Number(form.advance_recovery), discount: Number(form.discount),
      });
      setForm({ project_id: "", number: "", gross_amount: 0, advance_recovery: 0, discount: 0 });
      setShowNew(false);
      setDrawer(r.data.data);
      load();
    } catch (err) { setMsg(err?.response?.data?.message || "Error"); }
  };

  const columns = [
    { key: "number", label: "Number", render: (x) => <b style={{ fontWeight: 500 }}>{x.number}</b> },
    { key: "gross_amount", label: "Gross", render: (x) => fmt(x.gross_amount) },
    { key: "retention_amount", label: "Ret.", render: (x) => fmt(x.retention_amount) },
    { key: "vat_amount", label: "VAT", render: (x) => fmt(x.vat_amount) },
    { key: "net_amount", label: "Net", render: (x) => <b style={{ fontWeight: 600 }}>{fmt(x.net_amount)}</b> },
    { key: "status", label: "Status", render: (x) => <span className={"badge " + x.status}>{x.status}</span> },
    { key: "actions", label: "", render: (x) => <button className="btn ghost sm" onClick={() => openDetail(x)}>{t(lang, "viewDetails")}</button> },
  ];

  return (
    <div className="projects-page">
      <div className="page-head">
        <div><h2>{t(lang, "ipc")}</h2></div><span className="spacer" />
        <button className="btn" onClick={() => setShowNew(!showNew)}>+ IPC</button>
      </div>
      {msg && <div className="alert err" style={{ marginBottom: 12 }}>{msg}</div>}
      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <select className="select" style={{ maxWidth: 240 }} value={pid} onChange={(e) => setPid(e.target.value)}>
          <option value="">{t(lang, "projects")}</option>
          {projects.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}
        </select>
        <select className="select" style={{ maxWidth: 170 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          {["", "Draft", "Submitted", "Approved", "Paid"].map((s) => (<option key={s} value={s}>{s || "—"}</option>))}
        </select>
      </div>
      {showNew && (
        <div className="card" style={{ marginBottom: 14 }}>
          <form onSubmit={create} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            <div><label className="label">{t(lang, "projects")}</label>
              <select className="select" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} required>
                <option value="">—</option>
                {projects.map((p) => (<option key={p.id} value={p.id}>{p.code}</option>))}
              </select></div>
            <div><label className="label">Number (auto)</label><input className="input" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></div>
            <div><label className="label">Gross</label><input className="input" type="number" step="0.01" value={form.gross_amount} onChange={(e) => setForm({ ...form, gross_amount: e.target.value })} required /></div>
            <div><label className="label">Adv. recovery</label><input className="input" type="number" step="0.01" value={form.advance_recovery} onChange={(e) => setForm({ ...form, advance_recovery: e.target.value })} /></div>
            <div><label className="label">Discount</label><input className="input" type="number" step="0.01" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></div>
            <button className="btn" type="submit">{t(lang, "createLbl")}</button>
          </form>
          <p className="muted" style={{ marginTop: 8 }}>{t(lang, "ipcHint")}</p>
        </div>
      )}
      <DataTable
        columns={columns} rows={rows.slice((page - 1) * limit, page * limit)} total={total} page={page} limit={limit}
        onPage={(p) => { setPage(p); load(p, limit); }}
        onLimit={(l) => { setLimit(l); setPage(1); load(1, l); }}
        selected={selected} onSelect={setSelected} keyOf={(x) => x.id}
        loading={loading}
        title={t(lang, "ipc")}
        stats={[{ label: t(lang, "ipc"), value: total }, { label: t(lang, "billed"), value: fmt(rows.reduce((s, x) => s + Number(x.net_amount || 0), 0)) }]}
      />

      {drawer && (
        <div className="drawer-ov" onClick={() => setDrawer(null)}>
          <div className="drawer wide" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-h">
              <h3>{drawer.number} <span className={"badge " + drawer.status}>{drawer.status}</span></h3>
              <button className="btn ghost sm" onClick={() => setDrawer(null)}>×</button>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {(FLOW[drawer.status] || []).map((s) => (<button key={s} className="btn ghost sm" onClick={() => transition(s)}>{s}</button>))}
            </div>
            <div className="grid stats" style={{ marginBottom: 12 }}>
              <div className="stat"><div className="k">Gross</div><div className="v" style={{ fontSize: 17 }}>{fmt(drawer.gross_amount)}</div></div>
              <div className="stat"><div className="k">Ret.</div><div className="v" style={{ fontSize: 17 }}>{fmt(drawer.retention_amount)}</div></div>
              <div className="stat"><div className="k">VAT</div><div className="v" style={{ fontSize: 17 }}>{fmt(drawer.vat_amount)}</div></div>
              <div className="stat"><div className="k">Net</div><div className="v" style={{ fontSize: 17 }}>{fmt(drawer.net_amount)}</div></div>
            </div>
            {(drawer.items || []).length > 0 && (
              <div className="table-wrap"><table className="tbl">
                <thead><tr><th>{t(lang, "descriptionF")}</th><th>Qty</th><th>Rate</th><th>{t(lang, "amount")}</th></tr></thead>
                <tbody>{(drawer.items || []).map((i) => (
                  <tr key={i.id}><td>{i.description}</td><td>{fmt(i.qty)}</td><td>{fmt(i.unit_rate)}</td><td>{fmt(i.amount)}</td></tr>
                ))}</tbody>
              </table></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
