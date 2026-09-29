"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

export function useMsg() {
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const wrap = async (fn, okMsg) => {
    setMsg(""); setOk("");
    try { const r = await fn(); if (okMsg) setOk(okMsg); return r; }
    catch (e) { setMsg(e?.response?.data?.message || "Error"); return null; }
  };
  return { msg, ok, setMsg, setOk, wrap };
}

export function Msg({ msg, ok }) {
  return (<>
    {msg && <div className="alert err" style={{ marginBottom: 10 }}>{msg}</div>}
    {ok && <div className="alert ok" style={{ marginBottom: 10 }}>{ok}</div>}
  </>);
}

// Generic CRUD table for Lookup-type masters
export default function LookupManager({ type, extraFields }) {
  const { lang } = useAppStore();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ code: "", name: "", name_ar: "", description: "" });
  const [editId, setEditId] = useState(null);
  const { msg, ok, wrap } = useMsg();

  const load = () => api.get(`/masters/lookup/${type}`).then((r) => setRows(r.data.data || [])).catch(() => {});
  useEffect(() => { load(); setEditId(null); setForm({ code: "", name: "", name_ar: "", description: "" }); }, [type]);

  const submit = async (e) => {
    e.preventDefault();
    const done = editId
      ? await wrap(() => api.put(`/masters/lookup/${type}/${editId}`, form), "Updated")
      : await wrap(() => api.post(`/masters/lookup/${type}`, form), "Added");
    if (done) { setForm({ code: "", name: "", name_ar: "", description: "" }); setEditId(null); load(); }
  };

  return (
    <div>
      <Msg msg={msg} ok={ok} />
      <form onSubmit={submit} style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, background: "#f8fafc", padding: "14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
        <input className="input" style={{ width: 120, fontSize: 13 }} placeholder="Code *" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required disabled={!!editId} />
        <input className="input" style={{ flex: "1 1 180px", fontSize: 13 }} placeholder={(t(lang, "nameLbl") || "English Name") + " *"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="input" style={{ flex: "1 1 160px", fontSize: 13 }} placeholder={(t(lang, "nameArLbl") || "Arabic Name")} value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
        <input className="input" style={{ flex: "1 1 180px", fontSize: 13 }} placeholder={(t(lang, "descLbl") || "Description")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        {extraFields}
        <button className="btn sm" type="submit" style={{ minWidth: 90 }}>
          {editId ? (t(lang, "save") || "Save") : "+ Add Entry"}
        </button>
        {editId && (
          <button className="btn ghost sm" type="button" onClick={() => { setEditId(null); setForm({ code: "", name: "", name_ar: "", description: "" }); }}>
            Cancel
          </button>
        )}
      </form>
      <div className="table-wrap"><table className="tbl">
        <thead><tr><th>Code</th><th>{t(lang, "nameLbl") || "Name"}</th><th>{t(lang, "nameArLbl") || "Arabic Name"}</th><th>{t(lang, "statusLbl") || "Status"}</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id} style={{ opacity: r.is_active ? 1 : 0.55 }}>
            <td><code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontWeight: 700, fontSize: 12 }}>{r.code}</code></td>
            <td style={{ fontWeight: 600 }}>{r.name}</td>
            <td dir="rtl">{r.name_ar || "—"}</td>
            <td>{r.is_active ? <span className="badge Approved">{t(lang, "activeLbl") || "Active"}</span> : <span className="badge Draft">{t(lang, "inactiveLbl") || "Inactive"}</span>}</td>
            <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
              <button className="btn ghost sm" title="Edit entry" onClick={() => { setEditId(r.id); setForm({ code: r.code, name: r.name, name_ar: r.name_ar || "", description: r.description || "" }); }}>Edit</button>
              <button className="btn ghost sm" title={r.is_active ? "Deactivate" : "Activate"} onClick={async () => { await wrap(() => api.put(`/masters/lookup/${type}/${r.id}`, { is_active: !r.is_active })); load(); }}>{r.is_active ? "Deactivate" : "Activate"}</button>
              <button className="btn ghost sm" title="Delete" style={{ color: "#ef4444" }} onClick={async () => { if (window.confirm(t(lang, "confirmDelete") || "Are you sure you want to delete this master entry?")) { await wrap(() => api.delete(`/masters/lookup/${type}/${r.id}`)); load(); } }}>Delete</button>
            </td>
          </tr>
        ))}
        {!rows.length && <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 18 }}>—</td></tr>}
        </tbody></table></div>
    </div>
  );
}
