"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable from "@/components/DataTable";

const TYPES = ["BidBond", "Performance", "AdvancePayment", "Retention"];
const STATUS = ["", "Draft", "Active", "Released", "Expired", "Claimed"];
const empty = { number: "", project_id: "", type: "Performance", bank_name: "", amount: 0, currency: "SAR", margin_pct: 0, issue_date: "", expiry_date: "", notes: "" };
const fdate = (d, lang) => {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return "-"; }
};

export default function Guarantees() {
  const { lang, projectId } = useAppStore();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [exp, setExp] = useState([]);
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("");
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const load = (p = page, l = limit) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`];
    if (status) q.push("status=" + status);
    if (projectId) q.push("project_id=" + projectId);
    api.get("/guarantees?" + q.join("&")).then((r) => {
      setRows(r.data.data || []); setTotal(r.data.meta?.total || 0); setLoading(false);
    }).catch(() => setLoading(false));
    api.get("/guarantees/expiring?days=60").then((r) => setExp(r.data.data || [])).catch(() => {});
  };
  useEffect(() => {
    load(1, 10);
    api.get("/projects?limit=100").then((r) => setProjects(r.data.data || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { setPage(1); setSelected([]); load(1, limit); }, [status, projectId]);

  const openCreate = () => { setForm({ ...empty, project_id: projectId || "" }); setDrawer({ mode: "create" }); };
  const openDetail = (g) => {
    api.get("/guarantees/" + g.id).then((r) => {
      const d = r.data.data;
      setForm({ number: d.number || "", project_id: d.project_id || "", type: d.type, bank_name: d.bank_name || "", amount: d.amount || 0, currency: d.currency || "SAR", margin_pct: d.margin_pct || 0, issue_date: d.issue_date || "", expiry_date: d.expiry_date || "", notes: d.notes || "" });
      setDrawer({ mode: "edit", row: d });
    }).catch(() => {});
  };
  const fs = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      const body = { ...form, amount: Number(form.amount || 0), margin_pct: Number(form.margin_pct || 0) };
      if (drawer.mode === "create") await api.post("/guarantees", body);
      else await api.put("/guarantees/" + drawer.row.id, body);
      setDrawer(null); load();
    } catch (err) { setMsg(err?.response?.data?.message || "Error"); }
    finally { setBusy(false); }
  };
  const transition = async (s) => {
    try { const r = await api.post(`/guarantees/${drawer.row.id}/transition`, { status: s }); setDrawer({ mode: "edit", row: r.data.data }); load(); }
    catch (err) { setMsg(err?.response?.data?.message || "Error"); }
  };
  const del = async () => {
    if (!window.confirm(t(lang, "confirmDelete"))) return;
    try { await api.delete("/guarantees/" + drawer.row.id); setDrawer(null); load(); }
    catch (err) { setMsg(err?.response?.data?.message || "Error"); }
  };

  const columns = [
    { key: "number", label: "Number", render: (g) => <b style={{ fontWeight: 500 }}>{g.number}</b> },
    { key: "type", label: "Type", render: (g) => <span className="badge Draft">{g.type}</span> },
    { key: "amount", label: "Amount", render: (g) => Number(g.amount || 0).toLocaleString() + " " + (g.currency || "SAR") },
    { key: "bank_name", label: "Bank", render: (g) => g.bank_name || "-" },
    { key: "expiry_date", label: "Expiry", render: (g) => <span style={g.days_to_expiry !== null && g.days_to_expiry <= 30 && g.status === "Active" ? { color: "var(--danger)", fontWeight: 700 } : {}}>{fdate(g.expiry_date, lang)}</span> },
    { key: "status", label: "Status", render: (g) => <span className={"badge " + (g.status === "Active" ? "Submitted" : g.status === "Released" ? "Completed" : g.status === "Claimed" ? "Cancelled" : "Draft")}>{g.status}</span> },
    { key: "actions", label: "", render: (g) => <button className="btn ghost sm" onClick={() => openDetail(g)}>{t(lang, "viewDetails")}</button> },
  ];

  return (
    <div className="projects-page">
      <div className="page-head"><div><h2>{t(lang, "guarantees")}</h2></div><span className="spacer" /></div>
      {msg && <div className="alert err" style={{ marginBottom: 12 }}>{msg}</div>}
      {exp.length > 0 && (
        <div className="alert err" style={{ marginBottom: 12 }}>
          {t(lang, "expiringSoon")}: {exp.map((g) => `${g.number} (${fdate(g.expiry_date, lang)})`).join(" · ")}
        </div>
      )}
      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 10 }}>
        <select className="select" style={{ maxWidth: 200 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS.map((s) => (<option key={s} value={s}>{s || "—"}</option>))}
        </select>
      </div>
      <DataTable
        columns={columns} rows={rows} total={total} page={page} limit={limit}
        onPage={(p) => { setPage(p); load(p, limit); }}
        onLimit={(l) => { setLimit(l); setPage(1); load(1, l); }}
        selected={selected} onSelect={setSelected} keyOf={(g) => g.id}
        loading={loading}
        title={t(lang, "guarantees")}
        onAdd={openCreate}
        addLabel={"+ " + t(lang, "newGuarantee")}
        stats={[{ label: t(lang, "guarantees"), value: total }, { label: t(lang, "expiringSoon"), value: exp.length }]}
      />

      {drawer && (
        <div className="drawer-ov" onClick={() => setDrawer(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-h">
              <h3>{drawer.mode === "create" ? t(lang, "newGuarantee") : drawer.row.number}</h3>
              <button className="btn ghost sm" onClick={() => setDrawer(null)}>×</button>
            </div>
            {drawer.mode === "edit" && (
              <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                {["Active", "Released", "Expired", "Claimed"].filter((s) => s !== drawer.row.status).map((s) => (
                  <button key={s} className="btn ghost sm" onClick={() => transition(s)}>{s}</button>
                ))}
              </div>
            )}
            <form onSubmit={save}>
              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div><label className="label">Number *</label><input className="input" value={form.number} onChange={fs("number")} required /></div>
                <div><label className="label">Type</label>
                  <select className="select" value={form.type} onChange={fs("type")}>{TYPES.map((x) => (<option key={x}>{x}</option>))}</select></div>
                <div style={{ gridColumn: "1 / -1" }}><label className="label">{t(lang, "projects")} *</label>
                  <select className="select" value={form.project_id} onChange={fs("project_id")} required>
                    <option value="">—</option>
                    {projects.map((p) => (<option key={p.id} value={p.id}>{p.code} — {p.name}</option>))}
                  </select></div>
                <div><label className="label">Bank</label><input className="input" value={form.bank_name} onChange={fs("bank_name")} /></div>
                <div><label className="label">{t(lang, "amount")}</label><input className="input" type="number" value={form.amount} onChange={fs("amount")} /></div>
                <div><label className="label">Margin %</label><input className="input" type="number" step="0.01" value={form.margin_pct} onChange={fs("margin_pct")} /></div>
                <div><label className="label">Issue</label><input className="input" type="date" value={form.issue_date} onChange={fs("issue_date")} /></div>
                <div><label className="label">Expiry</label><input className="input" type="date" value={form.expiry_date} onChange={fs("expiry_date")} /></div>
                <div style={{ gridColumn: "1 / -1" }}><label className="label">{t(lang, "descriptionF")}</label><input className="input" value={form.notes} onChange={fs("notes")} /></div>
              </div>
              <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                <button className="btn" type="submit" disabled={busy}>{busy ? "..." : t(lang, "save")}</button>
                {drawer.mode === "edit" && <button className="btn danger sm" type="button" onClick={del}>{t(lang, "deleteLbl")}</button>}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
