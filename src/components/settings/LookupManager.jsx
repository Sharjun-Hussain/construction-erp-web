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
      <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input className="input" style={{ maxWidth: 110 }} placeholder="Code *" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required disabled={!!editId} />
        <input className="input" style={{ flex: 1, minWidth: 150 }} placeholder={t(lang, "nameLbl") + " *"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="input" style={{ flex: 1, minWidth: 130 }} placeholder={t(lang, "nameArLbl")} value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
        <input className="input" style={{ flex: 1, minWidth: 130 }} placeholder={t(lang, "descLbl")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        {extraFields}
        <button className="btn sm" type="submit">{editId ? t(lang, "save") : "+"}</button>
        {editId && <button className="btn ghost sm" type="button" onClick={() => { setEditId(null); setForm({ code: "", name: "", name_ar: "", description: "" }); }}>×</button>}
      </form>
      <div className="table-wrap"><table className="tbl">
        <thead><tr><th>Code</th><th>{t(lang, "nameLbl")}</th><th>{t(lang, "nameArLbl")}</th><th>{t(lang, "statusLbl")}</th><th></th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id} style={{ opacity: r.is_active ? 1 : 0.5 }}>
            <td><b>{r.code}</b></td><td>{r.name}</td><td>{r.name_ar || "—"}</td>
            <td>{r.is_active ? <span className="badge Approved">{t(lang, "activeLbl")}</span> : <span className="badge Draft">{t(lang, "inactiveLbl")}</span>}</td>
            <td style={{ whiteSpace: "nowrap" }}>
              <button className="btn ghost sm" onClick={() => { setEditId(r.id); setForm({ code: r.code, name: r.name, name_ar: r.name_ar || "", description: r.description || "" }); }}>✎</button>
              <button className="btn ghost sm" onClick={async () => { await wrap(() => api.put(`/masters/lookup/${type}/${r.id}`, { is_active: !r.is_active })); load(); }}>{r.is_active ? "⊘" : "✓"}</button>
              <button className="btn ghost sm" onClick={async () => { if (window.confirm(t(lang, "confirmDelete"))) { await wrap(() => api.delete(`/masters/lookup/${type}/${r.id}`)); load(); } }}>×</button>
            </td>
          </tr>
        ))}
        {!rows.length && <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 18 }}>—</td></tr>}
        </tbody></table></div>
    </div>
  );
}
