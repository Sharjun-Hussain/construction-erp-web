"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import { Msg, useMsg } from "./LookupManager";

const dstr = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const fmt = (n, d = 2) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: d });

// ---------- generic resource hook ----------
function useRes(path, initial) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initial);
  const [editId, setEditId] = useState(null);
  const { msg, ok, wrap } = useMsg();
  const load = () => api.get(path).then((r) => setRows(r.data.data || [])).catch(() => {});
  useEffect(() => { load(); }, [path]);
  const submit = async (e, numKeys = []) => {
    if (e) e.preventDefault();
    const payload = { ...form };
    for (const k of numKeys) if (payload[k] !== undefined && payload[k] !== "") payload[k] = Number(payload[k]);
    const done = editId
      ? await wrap(() => api.put(`${path}/${editId}`, payload), "Updated")
      : await wrap(() => api.post(path, payload), "Added");
    if (done) { setForm(initial); setEditId(null); load(); }
  };
  const remove = async (id) => {
    if (!window.confirm(t(useAppStore.getState().lang, "confirmDelete"))) return;
    await wrap(() => api.delete(`${path}/${id}`)); load();
  };
  const startEdit = (r, map) => { setEditId(r.id); setForm(map ? map(r) : r); };
  const cancel = () => { setEditId(null); setForm(initial); };
  return { rows, form, setForm, editId, msg, ok, load, submit, remove, startEdit, cancel, wrap };
}

const FRow = ({ children }) => <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>{children}</div>;
const Lbl = ({ children }) => <div><label className="label">{children[0]}</label>{children[1]}</div>;

// ================= Currency rates =================
export function FxPanel() {
  const { lang } = useAppStore();
  const R = useRes("/masters/currency-rates", { from_currency: "USD", to_currency: "SAR", rate: "", effective_date: new Date().toISOString().slice(0, 10), notes: "" });
  const [latest, setLatest] = useState([]);
  const [cv, setCv] = useState({ from: "USD", to: "SAR", amount: 1000 });
  const [cvOut, setCvOut] = useState(null);
  useEffect(() => { api.get("/masters/currency-rates/latest").then((r) => setLatest(r.data.data || [])).catch(() => {}); }, [R.rows]);
  const convert = () => api.get(`/masters/currency-rates/convert?from=${cv.from}&to=${cv.to}&amount=${cv.amount}`).then((r) => setCvOut(r.data.data)).catch(() => setCvOut({ error: true }));

  return (
    <div>
      <Msg msg={R.msg} ok={R.ok} />
      <form onSubmit={(e) => R.submit(e, ["rate"])}>
        <FRow>
          <Lbl>{["From", <select key="f" className="select" style={{ maxWidth: 100 }} value={R.form.from_currency} onChange={(e) => R.setForm({ ...R.form, from_currency: e.target.value })}>{["USD", "EUR", "AED", "KWD", "QAR", "BHD", "OMR", "SAR", "INR", "PKR", "PHP"].map((x) => (<option key={x}>{x}</option>))}</select>]}</Lbl>
          <Lbl>{["To", <select key="t" className="select" style={{ maxWidth: 100 }} value={R.form.to_currency} onChange={(e) => R.setForm({ ...R.form, to_currency: e.target.value })}>{["SAR", "USD", "EUR", "AED", "KWD", "QAR", "BHD", "OMR"].map((x) => (<option key={x}>{x}</option>))}</select>]}</Lbl>
          <Lbl>{["Rate *", <input key="r" className="input" style={{ maxWidth: 130 }} type="number" step="0.000001" value={R.form.rate} onChange={(e) => R.setForm({ ...R.form, rate: e.target.value })} required />]}</Lbl>
          <Lbl>{["Effective *", <input key="d" className="input" type="date" value={R.form.effective_date} onChange={(e) => R.setForm({ ...R.form, effective_date: e.target.value })} required />]}</Lbl>
          <div style={{ display: "flex", alignItems: "end", gap: 6 }}><button className="btn sm" type="submit">{R.editId ? t(lang, "save") : "+"}</button>{R.editId && <button className="btn ghost sm" type="button" onClick={R.cancel}>×</button>}</div>
        </FRow>
      </form>
      <div className="table-wrap" style={{ marginBottom: 12 }}><table className="tbl">
        <thead><tr><th>Pair</th><th>Rate</th><th>Effective</th><th></th></tr></thead>
        <tbody>{R.rows.map((r) => (
          <tr key={r.id}><td>{r.from_currency} → {r.to_currency}</td><td>{fmt(r.rate, 6)}</td><td>{dstr(r.effective_date)}</td>
            <td style={{ whiteSpace: "nowrap" }}><button className="btn ghost sm" onClick={() => R.startEdit(r)}>✎</button><button className="btn ghost sm" onClick={() => R.remove(r.id)}>×</button></td></tr>
        ))}</tbody></table></div>
      <div className="card">
        <div className="label" style={{ marginBottom: 6 }}>Latest rates</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {latest.map((r) => (<span key={r.id} className="badge Submitted">{r.from_currency}→{r.to_currency}: {fmt(r.rate, 4)}</span>))}
          {!latest.length && <span className="muted">—</span>}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "end", flexWrap: "wrap" }}>
          <input className="input" style={{ maxWidth: 90 }} value={cv.amount} onChange={(e) => setCv({ ...cv, amount: e.target.value })} />
          <select className="select" style={{ maxWidth: 90 }} value={cv.from} onChange={(e) => setCv({ ...cv, from: e.target.value })}>{["USD", "EUR", "SAR", "AED"].map((x) => (<option key={x}>{x}</option>))}</select>
          <span>→</span>
          <select className="select" style={{ maxWidth: 90 }} value={cv.to} onChange={(e) => setCv({ ...cv, to: e.target.value })}>{["SAR", "USD", "EUR", "AED"].map((x) => (<option key={x}>{x}</option>))}</select>
          <button className="btn ghost sm" onClick={convert}>Convert</button>
          {cvOut && (cvOut.error ? <span className="muted">no rate</span> : <b>= {fmt(cvOut.converted)} {cvOut.to}</b>)}
        </div>
      </div>
    </div>
  );
}

// ================= Banks + accounts =================
export function BanksPanel() {
  const { lang } = useAppStore();
  const B = useRes("/masters/banks", { code: "", name: "", name_ar: "", swift: "" });
  const A = useRes("/masters/bank-accounts", { bank_id: "", account_name: "", account_no: "", iban: "", currency: "SAR", opening_balance: 0 });

  return (
    <div>
      <Msg msg={B.msg} ok={B.ok} />
      <div className="label" style={{ marginBottom: 6 }}>Banks</div>
      <form onSubmit={(e) => B.submit(e)}>
        <FRow>
          <input className="input" style={{ maxWidth: 100 }} placeholder="Code *" value={B.form.code} onChange={(e) => B.setForm({ ...B.form, code: e.target.value })} required disabled={!!B.editId} />
          <input className="input" style={{ flex: 1, minWidth: 150 }} placeholder={t(lang, "nameLbl") + " *"} value={B.form.name} onChange={(e) => B.setForm({ ...B.form, name: e.target.value })} required />
          <input className="input" style={{ maxWidth: 130 }} placeholder="SWIFT" value={B.form.swift} onChange={(e) => B.setForm({ ...B.form, swift: e.target.value })} />
          <button className="btn sm" type="submit">{B.editId ? t(lang, "save") : "+"}</button>
          {B.editId && <button className="btn ghost sm" type="button" onClick={B.cancel}>×</button>}
        </FRow>
      </form>
      <div className="table-wrap" style={{ marginBottom: 16 }}><table className="tbl">
        <thead><tr><th>Code</th><th>{t(lang, "nameLbl")}</th><th>SWIFT</th><th>Accounts</th><th></th></tr></thead>
        <tbody>{B.rows.map((r) => (
          <tr key={r.id}><td><b>{r.code}</b></td><td>{r.name}</td><td>{r.swift || "—"}</td><td>{(r.accounts || []).length}</td>
            <td style={{ whiteSpace: "nowrap" }}><button className="btn ghost sm" onClick={() => B.startEdit(r)}>✎</button><button className="btn ghost sm" onClick={() => B.remove(r.id)}>×</button></td></tr>
        ))}</tbody></table></div>
      <Msg msg={A.msg} ok={A.ok} />
      <div className="label" style={{ marginBottom: 6 }}>Bank accounts</div>
      <form onSubmit={(e) => A.submit(e, ["opening_balance"])}>
        <FRow>
          <select className="select" style={{ maxWidth: 170 }} value={A.form.bank_id} onChange={(e) => A.setForm({ ...A.form, bank_id: e.target.value })} required><option value="">Bank *</option>{B.rows.map((b) => (<option key={b.id} value={b.id}>{b.code} — {b.name}</option>))}</select>
          <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Account name *" value={A.form.account_name} onChange={(e) => A.setForm({ ...A.form, account_name: e.target.value })} required />
          <input className="input" style={{ maxWidth: 160 }} placeholder="Account no *" value={A.form.account_no} onChange={(e) => A.setForm({ ...A.form, account_no: e.target.value })} required />
          <input className="input" style={{ maxWidth: 200 }} placeholder="IBAN" value={A.form.iban} onChange={(e) => A.setForm({ ...A.form, iban: e.target.value })} />
          <input className="input" style={{ maxWidth: 130 }} type="number" step="0.01" placeholder="Opening" value={A.form.opening_balance} onChange={(e) => A.setForm({ ...A.form, opening_balance: e.target.value })} />
          <button className="btn sm" type="submit">{A.editId ? t(lang, "save") : "+"}</button>
          {A.editId && <button className="btn ghost sm" type="button" onClick={A.cancel}>×</button>}
        </FRow>
      </form>
      <div className="table-wrap"><table className="tbl">
        <thead><tr><th>Bank</th><th>Account</th><th>No</th><th>IBAN</th><th>Opening</th><th></th></tr></thead>
        <tbody>{A.rows.map((r) => (
          <tr key={r.id}><td>{r.bank?.code || "—"}</td><td>{r.account_name}</td><td>{r.account_no}</td><td style={{ fontSize: 12 }}>{r.iban || "—"}</td><td>{fmt(r.opening_balance)}</td>
            <td style={{ whiteSpace: "nowrap" }}><button className="btn ghost sm" onClick={() => A.startEdit(r)}>✎</button><button className="btn ghost sm" onClick={() => A.remove(r.id)}>×</button></td></tr>
        ))}
        {!A.rows.length && <tr><td colSpan={6} className="muted" style={{ textAlign: "center", padding: 16 }}>—</td></tr>}
        </tbody></table></div>
    </div>
  );
}

// ================= Fiscal years =================
export function FiscalPanel() {
  const { lang } = useAppStore();
  const R = useRes("/masters/fiscal-years", { name: "", start_date: "", end_date: "" });
  return (
    <div>
      <Msg msg={R.msg} ok={R.ok} />
      <form onSubmit={(e) => R.submit(e)}>
        <FRow>
          <input className="input" style={{ maxWidth: 140 }} placeholder="FY 2026 *" value={R.form.name} onChange={(e) => R.setForm({ ...R.form, name: e.target.value })} required />
          <input className="input" type="date" value={R.form.start_date} onChange={(e) => R.setForm({ ...R.form, start_date: e.target.value })} required />
          <input className="input" type="date" value={R.form.end_date} onChange={(e) => R.setForm({ ...R.form, end_date: e.target.value })} required />
          <button className="btn sm" type="submit">+</button>
        </FRow>
      </form>
      <div className="table-wrap"><table className="tbl">
        <thead><tr><th>Name</th><th>Start</th><th>End</th><th>Status</th><th></th></tr></thead>
        <tbody>{R.rows.map((r) => (
          <tr key={r.id}><td><b>{r.name}</b></td><td>{dstr(r.start_date)}</td><td>{dstr(r.end_date)}</td>
            <td><span className={"badge " + (r.status === "Active" ? "Approved" : r.status === "Closed" ? "Cancelled" : "Draft")}>{r.status}</span></td>
            <td style={{ whiteSpace: "nowrap" }}>
              {r.status !== "Active" && <button className="btn ghost sm" onClick={async () => { await R.wrap(() => api.post(`/masters/fiscal-years/${r.id}/activate`)); R.load(); }}>Activate</button>}
              <button className="btn ghost sm" onClick={() => R.remove(r.id)}>×</button>
            </td></tr>
        ))}</tbody></table></div>
    </div>
  );
}

// ================= Entry close (period locks) =================
export function LocksPanel() {
  const { lang } = useAppStore();
  const R = useRes("/masters/period-locks", { module: "dpr", period: new Date().toISOString().slice(0, 7), notes: "" });
  return (
    <div>
      <Msg msg={R.msg} ok={R.ok} />
      <p className="muted" style={{ marginBottom: 10 }}>Locked periods reject new DPR and IPC entries dated inside them.</p>
      <form onSubmit={(e) => R.submit(e)}>
        <FRow>
          <select className="select" style={{ maxWidth: 150 }} value={R.form.module} onChange={(e) => R.setForm({ ...R.form, module: e.target.value })}>{["dpr", "ipc", "po", "grn", "all"].map((x) => (<option key={x}>{x}</option>))}</select>
          <input className="input" style={{ maxWidth: 130 }} type="month" value={R.form.period} onChange={(e) => R.setForm({ ...R.form, period: e.target.value })} required />
          <input className="input" style={{ flex: 1, minWidth: 150 }} placeholder={t(lang, "descLbl")} value={R.form.notes} onChange={(e) => R.setForm({ ...R.form, notes: e.target.value })} />
          <button className="btn sm" type="submit">Lock period</button>
        </FRow>
      </form>
      <div className="table-wrap"><table className="tbl">
        <thead><tr><th>Module</th><th>Period</th><th>Notes</th><th></th></tr></thead>
        <tbody>{R.rows.map((r) => (
          <tr key={r.id}><td><span className="badge Submitted">{r.module}</span></td><td>{r.period}</td><td>{r.notes || "—"}</td>
            <td><button className="btn ghost sm" onClick={() => R.remove(r.id)}>Unlock</button></td></tr>
        ))}
        {!R.rows.length && <tr><td colSpan={4} className="muted" style={{ textAlign: "center", padding: 16 }}>No locked periods — all open</td></tr>}
        </tbody></table></div>
    </div>
  );
}

// ================= Terms & conditions =================
export function TermsPanel() {
  const { lang } = useAppStore();
  const R = useRes("/masters/terms-conditions", { doc_type: "proposal", title: "", body: "", is_default: false });
  const [filter, setFilter] = useState("");
  const rows = filter ? R.rows.filter((r) => r.doc_type === filter) : R.rows;
  return (
    <div>
      <Msg msg={R.msg} ok={R.ok} />
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <select className="select" style={{ maxWidth: 180 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All documents</option>
          {["proposal", "tender", "quotation", "po", "invoice", "contract"].map((x) => (<option key={x}>{x}</option>))}
        </select>
      </div>
      <form onSubmit={(e) => R.submit(e)}>
        <FRow>
          <select className="select" style={{ maxWidth: 150 }} value={R.form.doc_type} onChange={(e) => R.setForm({ ...R.form, doc_type: e.target.value })}>{["proposal", "tender", "quotation", "po", "invoice", "contract"].map((x) => (<option key={x}>{x}</option>))}</select>
          <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder="Title *" value={R.form.title} onChange={(e) => R.setForm({ ...R.form, title: e.target.value })} required />
          <label className="check-row"><input type="checkbox" checked={!!R.form.is_default} onChange={(e) => R.setForm({ ...R.form, is_default: e.target.checked })} /><span>Default</span></label>
          <button className="btn sm" type="submit">{R.editId ? t(lang, "save") : "+"}</button>
          {R.editId && <button className="btn ghost sm" type="button" onClick={R.cancel}>×</button>}
        </FRow>
        <textarea className="input" rows={3} style={{ marginBottom: 10 }} placeholder="Terms body *" value={R.form.body} onChange={(e) => R.setForm({ ...R.form, body: e.target.value })} required />
      </form>
      {rows.map((r) => (
        <div key={r.id} className="card" style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="badge Submitted">{r.doc_type}</span><b>{r.title}</b>
            {r.is_default && <span className="badge Approved">default</span>}
            <span className="spacer" />
            <button className="btn ghost sm" onClick={() => R.startEdit(r)}>✎</button>
            <button className="btn ghost sm" onClick={() => R.remove(r.id)}>×</button>
          </div>
          <div className="muted" style={{ marginTop: 6, whiteSpace: "pre-wrap", fontSize: 13 }}>{r.body}</div>
        </div>
      ))}
    </div>
  );
}

// ================= Approval settings =================
const MODULES = ["tender", "boq", "estimation", "proposal", "po", "ipc", "vo", "dpr", "labour", "equipment"];
export function ApprovalSettingsPanel() {
  const { lang } = useAppStore();
  const R = useRes("/masters/approval-settings", { module: "tender", min_amount: 0, levels: [{ level: 1, role: "" }] });
  const [lvl, setLvl] = useState([{ level: 1, role: "" }]);
  useEffect(() => { if (R.editId) { const hit = R.rows.find((x) => x.id === R.editId); if (hit?.levels) setLvl(hit.levels); } }, [R.editId]);
  const save = (e) => {
    e.preventDefault();
    R.setForm({ ...R.form, levels: lvl.filter((l) => l.role) });
    setTimeout(() => R.submit(null, ["min_amount"]), 0);
  };
  return (
    <div>
      <Msg msg={R.msg} ok={R.ok} />
      <p className="muted" style={{ marginBottom: 10 }}>Define who must approve each module above a threshold amount.</p>
      <form onSubmit={save}>
        <FRow>
          <select className="select" style={{ maxWidth: 150 }} value={R.form.module} onChange={(e) => R.setForm({ ...R.form, module: e.target.value })}>{MODULES.map((x) => (<option key={x}>{x}</option>))}</select>
          <Lbl>{["Min amount", <input key="m" className="input" style={{ maxWidth: 150 }} type="number" step="0.01" value={R.form.min_amount} onChange={(e) => R.setForm({ ...R.form, min_amount: e.target.value })} />]}</Lbl>
        </FRow>
        {lvl.map((l, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
            <span className="badge Draft">L{l.level}</span>
            <input className="input" style={{ maxWidth: 260 }} placeholder="Role (e.g. Project Manager)" value={l.role} onChange={(e) => { const c = [...lvl]; c[i].role = e.target.value; setLvl(c); }} />
            {lvl.length > 1 && <button type="button" className="btn ghost sm" onClick={() => setLvl(lvl.filter((_, j) => j !== i).map((x, j) => ({ ...x, level: j + 1 })))}>×</button>}
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button type="button" className="btn ghost sm" onClick={() => setLvl([...lvl, { level: lvl.length + 1, role: "" }])}>+ Level</button>
          <button className="btn sm" type="submit">{R.editId ? t(lang, "save") : "Save matrix"}</button>
          {R.editId && <button className="btn ghost sm" type="button" onClick={() => { R.cancel(); setLvl([{ level: 1, role: "" }]); }}>×</button>}
        </div>
      </form>
      <div className="table-wrap"><table className="tbl">
        <thead><tr><th>Module</th><th>Min amount</th><th>Levels</th><th></th></tr></thead>
        <tbody>{R.rows.map((r) => (
          <tr key={r.id}><td><span className="badge Submitted">{r.module}</span></td><td>{fmt(r.min_amount)}</td>
            <td>{(r.levels || []).map((l) => `L${l.level}:${l.role}`).join(" → ") || "—"}</td>
            <td style={{ whiteSpace: "nowrap" }}><button className="btn ghost sm" onClick={() => R.startEdit(r)}>✎</button><button className="btn ghost sm" onClick={() => R.remove(r.id)}>×</button></td></tr>
        ))}</tbody></table></div>
    </div>
  );
}

// ================= Approvals inbox =================
export function ApprovalsInbox() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/masters/approvals-inbox").then((r) => setData(r.data.data)).catch(() => {}); }, []);
  if (!data) return <div className="card">...</div>;
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span className="badge Draft">Total {data.total}</span>
        {Object.entries(data.by_kind || {}).map(([k, v]) => (<span key={k} className="badge Submitted">{k}: {v}</span>))}
      </div>
      <div className="table-wrap"><table className="tbl">
        <thead><tr><th>Type</th><th>Document</th><th>Amount</th><th>Status</th><th></th></tr></thead>
        <tbody>{(data.items || []).map((i, ix) => (
          <tr key={ix}><td><span className="badge Submitted">{i.kind}</span></td>
            <td><div>{i.title}</div><div className="muted" style={{ fontSize: 11 }}>{i.sub}</div></td>
            <td>{fmt(i.amount)}</td><td>{i.status}</td>
            <td><a className="btn ghost sm" href={i.link}>Open</a></td></tr>
        ))}
        {!data.items?.length && <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 18 }}>Inbox clear — nothing awaiting approval</td></tr>}
        </tbody></table></div>
    </div>
  );
}

// ================= VAT =================
export function VatPanel() {
  const { lang } = useAppStore();
  const R = useRes("/masters/vat-rates", { name: "", rate: 15, is_default: false });
  return (
    <div>
      <Msg msg={R.msg} ok={R.ok} />
      <form onSubmit={(e) => R.submit(e, ["rate"])}>
        <FRow>
          <input className="input" style={{ flex: 1, minWidth: 150 }} placeholder="Name *" value={R.form.name} onChange={(e) => R.setForm({ ...R.form, name: e.target.value })} required />
          <input className="input" style={{ maxWidth: 110 }} type="number" step="0.01" value={R.form.rate} onChange={(e) => R.setForm({ ...R.form, rate: e.target.value })} required />
          <label className="check-row"><input type="checkbox" checked={!!R.form.is_default} onChange={(e) => R.setForm({ ...R.form, is_default: e.target.checked })} /><span>Default</span></label>
          <button className="btn sm" type="submit">{R.editId ? t(lang, "save") : "+"}</button>
          {R.editId && <button className="btn ghost sm" type="button" onClick={R.cancel}>×</button>}
        </FRow>
      </form>
      <div className="table-wrap"><table className="tbl">
        <thead><tr><th>Name</th><th>Rate %</th><th></th><th></th></tr></thead>
        <tbody>{R.rows.map((r) => (
          <tr key={r.id}><td>{r.name} {r.is_default && <span className="badge Approved">default</span>}</td><td>{r.rate}%</td>
            <td>{r.is_active ? "" : <span className="badge Draft">inactive</span>}</td>
            <td style={{ whiteSpace: "nowrap" }}><button className="btn ghost sm" onClick={() => R.startEdit(r)}>✎</button><button className="btn ghost sm" onClick={() => R.remove(r.id)}>×</button></td></tr>
        ))}</tbody></table></div>
    </div>
  );
}

// ================= Email templates =================
export function EmailPanel() {
  const { lang } = useAppStore();
  const R = useRes("/masters/email-templates", { code: "", name: "", subject: "", body: "" });
  return (
    <div>
      <Msg msg={R.msg} ok={R.ok} />
      <form onSubmit={(e) => R.submit(e)}>
        <FRow>
          <input className="input" style={{ maxWidth: 140 }} placeholder="Code *" value={R.form.code} onChange={(e) => R.setForm({ ...R.form, code: e.target.value })} required disabled={!!R.editId} />
          <input className="input" style={{ flex: 1, minWidth: 150 }} placeholder="Name *" value={R.form.name} onChange={(e) => R.setForm({ ...R.form, name: e.target.value })} required />
        </FRow>
        <input className="input" style={{ marginBottom: 8 }} placeholder="Subject * — use {{placeholders}}" value={R.form.subject} onChange={(e) => R.setForm({ ...R.form, subject: e.target.value })} required />
        <textarea className="input" rows={4} style={{ marginBottom: 8 }} placeholder="Body *" value={R.form.body} onChange={(e) => R.setForm({ ...R.form, body: e.target.value })} required />
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button className="btn sm" type="submit">{R.editId ? t(lang, "save") : "+"}</button>
          {R.editId && <button className="btn ghost sm" type="button" onClick={R.cancel}>×</button>}
        </div>
      </form>
      {R.rows.map((r) => (
        <div key={r.id} className="card" style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="badge Submitted">{r.code}</span><b>{r.name}</b><span className="spacer" />
            <button className="btn ghost sm" onClick={() => R.startEdit(r)}>✎</button>
            <button className="btn ghost sm" onClick={() => R.remove(r.id)}>×</button>
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Subject: {r.subject}</div>
        </div>
      ))}
    </div>
  );
}

// ================= Reminders =================
export function RemindersPanel() {
  const { lang } = useAppStore();
  const R = useRes("/masters/reminders", { title: "", module: "", due_date: new Date().toISOString().slice(0, 10), assigned_to: "", notes: "" });
  const [hide, setHide] = useState(true);
  const rows = hide ? R.rows.filter((r) => !r.is_done) : R.rows;
  return (
    <div>
      <Msg msg={R.msg} ok={R.ok} />
      <form onSubmit={(e) => R.submit(e)}>
        <FRow>
          <input className="input" style={{ flex: 2, minWidth: 170 }} placeholder="Title *" value={R.form.title} onChange={(e) => R.setForm({ ...R.form, title: e.target.value })} required />
          <input className="input" style={{ maxWidth: 130 }} placeholder="Module" value={R.form.module} onChange={(e) => R.setForm({ ...R.form, module: e.target.value })} />
          <input className="input" type="date" value={R.form.due_date} onChange={(e) => R.setForm({ ...R.form, due_date: e.target.value })} required />
          <input className="input" style={{ maxWidth: 140 }} placeholder="Assigned to" value={R.form.assigned_to} onChange={(e) => R.setForm({ ...R.form, assigned_to: e.target.value })} />
          <button className="btn sm" type="submit">{R.editId ? t(lang, "save") : "+"}</button>
          {R.editId && <button className="btn ghost sm" type="button" onClick={R.cancel}>×</button>}
        </FRow>
      </form>
      <label className="check-row" style={{ marginBottom: 10 }}><input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} /><span>Hide completed</span></label>
      <div className="table-wrap"><table className="tbl">
        <thead><tr><th></th><th>Reminder</th><th>Due</th><th>Assigned</th><th></th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id} style={{ opacity: r.is_done ? 0.55 : 1 }}>
            <td><input type="checkbox" checked={!!r.is_done} onChange={async () => { await R.wrap(() => api.put(`/masters/reminders/${r.id}`, { is_done: !r.is_done })); R.load(); }} /></td>
            <td><div>{r.title}</div><div className="muted" style={{ fontSize: 11 }}>{r.module || ""}</div></td>
            <td>{dstr(r.due_date)}</td><td>{r.assigned_to || "—"}</td>
            <td><button className="btn ghost sm" onClick={() => R.remove(r.id)}>×</button></td></tr>
        ))}
        {!rows.length && <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 16 }}>No reminders</td></tr>}
        </tbody></table></div>
    </div>
  );
}

// ================= Custom fields =================
export function CustomFieldsPanel() {
  const { lang } = useAppStore();
  const R = useRes("/masters/custom-fields", { module: "project", field_name: "", field_type: "text", options: "", is_required: false });
  const submit = (e) => {
    e.preventDefault();
    const payload = { ...R.form };
    if (typeof payload.options === "string") payload.options = payload.options ? payload.options.split(",").map((s) => s.trim()).filter(Boolean) : null;
  if (R.editId) R.wrap(() => api.put(`/masters/custom-fields/${R.editId}`, payload), "Updated").then(() => { R.cancel(); R.load(); });
    else R.wrap(() => api.post("/masters/custom-fields", payload), "Added").then(() => { R.cancel(); R.load(); });
  };
  return (
    <div>
      <Msg msg={R.msg} ok={R.ok} />
      <p className="muted" style={{ marginBottom: 10 }}>Define extra fields per module. Stored centrally; module forms pick them up next.</p>
      <form onSubmit={submit}>
        <FRow>
          <select className="select" style={{ maxWidth: 150 }} value={R.form.module} onChange={(e) => R.setForm({ ...R.form, module: e.target.value })}>{["project", "tender", "boq", "estimation", "proposal", "po", "grn", "ipc", "enquiry", "customer", "supplier"].map((x) => (<option key={x}>{x}</option>))}</select>
          <input className="input" style={{ flex: 1, minWidth: 150 }} placeholder="Field name *" value={R.form.field_name} onChange={(e) => R.setForm({ ...R.form, field_name: e.target.value })} required />
          <select className="select" style={{ maxWidth: 130 }} value={R.form.field_type} onChange={(e) => R.setForm({ ...R.form, field_type: e.target.value })}>{["text", "number", "date", "select", "boolean"].map((x) => (<option key={x}>{x}</option>))}</select>
          {R.form.field_type === "select" && <input className="input" style={{ flex: 1, minWidth: 150 }} placeholder="Options (comma separated)" value={Array.isArray(R.form.options) ? R.form.options.join(", ") : (R.form.options || "")} onChange={(e) => R.setForm({ ...R.form, options: e.target.value })} />}
          <label className="check-row"><input type="checkbox" checked={!!R.form.is_required} onChange={(e) => R.setForm({ ...R.form, is_required: e.target.checked })} /><span>Required</span></label>
          <button className="btn sm" type="submit">{R.editId ? t(lang, "save") : "+"}</button>
          {R.editId && <button className="btn ghost sm" type="button" onClick={R.cancel}>×</button>}
        </FRow>
      </form>
      <div className="table-wrap"><table className="tbl">
        <thead><tr><th>Module</th><th>Field</th><th>Type</th><th>Required</th><th></th></tr></thead>
        <tbody>{R.rows.map((r) => (
          <tr key={r.id}><td><span className="badge Submitted">{r.module}</span></td><td>{r.field_name}</td><td>{r.field_type}</td>
            <td>{r.is_required ? "yes" : "—"}</td>
            <td style={{ whiteSpace: "nowrap" }}><button className="btn ghost sm" onClick={() => R.startEdit(r, (x) => ({ ...x, options: Array.isArray(x.options) ? x.options.join(", ") : "" }))}>✎</button><button className="btn ghost sm" onClick={() => R.remove(r.id)}>×</button></td></tr>
        ))}</tbody></table></div>
    </div>
  );
}

// ================= Employee rates =================
export function EmployeeRatesPanel() {
  const { lang } = useAppStore();
  const R = useRes("/masters/employee-rates", { category: "", skill_level: "", daily_rate: 0, hourly_rate: 0, currency: "SAR", effective_date: new Date().toISOString().slice(0, 10) });
  return (
    <div>
      <Msg msg={R.msg} ok={R.ok} />
      <form onSubmit={(e) => R.submit(e, ["daily_rate", "hourly_rate"])}>
        <FRow>
          <input className="input" style={{ flex: 1, minWidth: 150 }} placeholder="Trade / category *" value={R.form.category} onChange={(e) => R.setForm({ ...R.form, category: e.target.value })} required />
          <input className="input" style={{ maxWidth: 130 }} placeholder="Skill level" value={R.form.skill_level} onChange={(e) => R.setForm({ ...R.form, skill_level: e.target.value })} />
          <Lbl>{["Daily rate", <input key="d" className="input" style={{ maxWidth: 120 }} type="number" step="0.01" value={R.form.daily_rate} onChange={(e) => R.setForm({ ...R.form, daily_rate: e.target.value })} />]}</Lbl>
          <Lbl>{["Hourly rate", <input key="h" className="input" style={{ maxWidth: 120 }} type="number" step="0.01" value={R.form.hourly_rate} onChange={(e) => R.setForm({ ...R.form, hourly_rate: e.target.value })} />]}</Lbl>
          <button className="btn sm" type="submit">{R.editId ? t(lang, "save") : "+"}</button>
          {R.editId && <button className="btn ghost sm" type="button" onClick={R.cancel}>×</button>}
        </FRow>
      </form>
      <div className="table-wrap"><table className="tbl">
        <thead><tr><th>Trade</th><th>Skill</th><th>Daily</th><th>Hourly</th><th></th></tr></thead>
        <tbody>{R.rows.map((r) => (
          <tr key={r.id}><td><b>{r.category}</b></td><td>{r.skill_level || "—"}</td><td>{fmt(r.daily_rate)}</td><td>{fmt(r.hourly_rate)}</td>
            <td style={{ whiteSpace: "nowrap" }}><button className="btn ghost sm" onClick={() => R.startEdit(r)}>✎</button><button className="btn ghost sm" onClick={() => R.remove(r.id)}>×</button></td></tr>
        ))}
        {!R.rows.length && <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 16 }}>—</td></tr>}
        </tbody></table></div>
    </div>
  );
}

// ================= Import / Export =================
const EXPORTS = [["lookups", "Masters (all lookups)"], ["customers", "Customers"], ["materials", "Materials"], ["suppliers", "Suppliers"], ["subcontractors", "Subcontractors"], ["equipment", "Equipment"], ["projects", "Projects"], ["banks", "Banks"], ["employee_rates", "Employee rates"]];
export function ImportExportPanel() {
  const { msg, ok, wrap } = useMsg();
  const [impType, setImpType] = useState("uom");
  const [csv, setCsv] = useState("");
  const doExport = (entity) => { window.open(`/api/v1/masters/export/${entity}`, "_blank"); };
  const doImport = async () => {
    const lines = csv.trim().split("\n").filter(Boolean);
    if (lines.length < 2) return;
    const head = lines[0].split(",").map((s) => s.trim().toLowerCase());
    const ci = head.indexOf("code"), ni = head.indexOf("name");
    if (ci < 0 || ni < 0) return;
    const rows = lines.slice(1).map((l) => { const c = l.split(","); return { code: (c[ci] || "").trim(), name: (c[ni] || "").trim() }; }).filter((r) => r.code && r.name);
    const r = await wrap(() => api.post("/masters/import-lookups", { type: impType, rows }), "Import finished");
    if (r) setCsv("");
  };
  return (
    <div>
      <Msg msg={msg} ok={ok} />
      <div className="label" style={{ marginBottom: 6 }}>Export (CSV)</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {EXPORTS.map(([k, label]) => (<button key={k} className="btn ghost sm" onClick={() => doExport(k)}>{label} ⭳</button>))}
      </div>
      <div className="label" style={{ marginBottom: 6 }}>Import lookups (paste CSV with code,name header)</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <select className="select" style={{ maxWidth: 200 }} value={impType} onChange={(e) => setImpType(e.target.value)}>
          {["uom", "payment_terms", "delivery_method", "cost_center", "business_type", "enquiry_type", "project_type", "labour_type", "expense_category", "item_category", "department", "designation", "warehouse"].map((x) => (<option key={x}>{x}</option>))}
        </select>
        <button className="btn sm" onClick={doImport}>Import</button>
      </div>
      <textarea className="input" rows={6} dir="ltr" placeholder={"code,name\nNOS,Numbers\nM,Meter"} value={csv} onChange={(e) => setCsv(e.target.value)} />
    </div>
  );
}

// ================= Report PDF settings =================
export function ReportPdfPanel() {
  const { lang } = useAppStore();
  const { msg, ok, wrap } = useMsg();
  const [cfg, setCfg] = useState(null);
  useEffect(() => { api.get("/settings?group=report_pdf").then((r) => setCfg(r.data.data.report_pdf)).catch(() => {}); }, []);
  const save = async () => {
    const r = await wrap(() => api.put("/settings", { report_pdf: cfg }), "Saved");
    if (r) setCfg(r.data.data.report_pdf);
  };
  if (!cfg) return <div className="card">...</div>;
  return (
    <div>
      <Msg msg={msg} ok={ok} />
      <div><label className="label">Header text</label><textarea className="input" rows={2} value={cfg.header_text || ""} onChange={(e) => setCfg({ ...cfg, header_text: e.target.value })} /></div>
      <div style={{ marginTop: 8 }}><label className="label">Footer text</label><textarea className="input" rows={2} value={cfg.footer_text || ""} onChange={(e) => setCfg({ ...cfg, footer_text: e.target.value })} /></div>
      <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
        <div><label className="label">Default terms doc</label>
          <select className="select" value={cfg.terms_doc_type} onChange={(e) => setCfg({ ...cfg, terms_doc_type: e.target.value })}>
            {["proposal", "tender", "quotation", "po", "invoice", "contract"].map((x) => (<option key={x}>{x}</option>))}
          </select></div>
        <label className="check-row"><input type="checkbox" checked={!!cfg.show_logo} onChange={(e) => setCfg({ ...cfg, show_logo: e.target.checked })} /><span>Show logo</span></label>
        <label className="check-row"><input type="checkbox" checked={!!cfg.show_bank_details} onChange={(e) => setCfg({ ...cfg, show_bank_details: e.target.checked })} /><span>Show bank details</span></label>
      </div>
      <button className="btn sm" style={{ marginTop: 12 }} onClick={save}>{t(lang, "save")}</button>
    </div>
  );
}

// ================= Organization (existing org config form) =================
const ORG_GROUPS = ["company", "tax", "projects", "numbering", "inventory"];
const NUMKEYS = {
  tax: ["vat_pct"], projects: ["default_retention_pct", "default_vat_pct", "default_advance_pct"],
  numbering: ["padding", "project", "boq", "estimation", "tender", "ipc", "po", "grn", "indent", "quotation", "advance", "enquiry", "inspection", "proposal", "job", "labour", "equipment", "eqtransfer", "changerequest", "item"],
  inventory: ["default_min_qty"],
};
export function OrgPanel() {
  const { lang } = useAppStore();
  const { msg, ok, setMsg, setOk, wrap } = useMsg();
  const [cfg, setCfg] = useState(null);
  const [tab, setTab] = useState("company");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.get("/settings").then((r) => setCfg(r.data.data)).catch((e) => {
      if (e?.response?.status === 403) setMsg(t(lang, "noAccess")); else setMsg("Error");
    });
  }, []);
  const setG = (g, k) => (e) => {
    let v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if ((NUMKEYS[g] || []).includes(k) && !["project", "boq", "estimation", "tender", "ipc", "po", "grn", "indent", "quotation", "advance", "enquiry", "inspection", "proposal", "job", "labour", "equipment", "eqtransfer", "changerequest", "item"].includes(k)) v = v === "" ? "" : Number(v);
    setCfg({ ...cfg, [g]: { ...cfg[g], [k]: v } });
  };
  const save = async () => {
    setBusy(true);
    const body = {};
    for (const g of ORG_GROUPS) {
      body[g] = { ...cfg[g] };
      for (const k of (NUMKEYS[g] || [])) {
        if (["project", "boq", "estimation", "tender", "ipc", "po", "grn", "indent", "quotation", "advance", "enquiry", "inspection", "proposal", "job", "labour", "equipment", "eqtransfer", "changerequest", "item"].includes(k)) continue;
        if (body[g][k] !== "") body[g][k] = Number(body[g][k]);
      }
    }
    const r = await wrap(() => api.put("/settings", body), t(lang, "savedLbl"));
    if (r) setCfg(r.data.data);
    setBusy(false);
  };
  const F = ({ g, k, type, options }) => (
    <div>
      <label className="label">{t(lang, "set_" + g + "_" + k)}</label>
      {type === "check" ? (
        <label className="check-row"><input type="checkbox" checked={!!cfg[g][k]} onChange={setG(g, k)} /><span>{t(lang, "enabledLbl")}</span></label>
      ) : options ? (
        <select className="select" value={cfg[g][k]} onChange={setG(g, k)}>{options.map((o) => (<option key={o}>{o}</option>))}</select>
      ) : (
        <input className="input" type={type || "text"} value={cfg[g][k] ?? ""} onChange={setG(g, k)} />
      )}
    </div>
  );
  if (!cfg) return (<div><Msg msg={msg} ok={ok} /><div className="card">...</div></div>);
  return (
    <div>
      <Msg msg={msg} ok={ok} />
      <div className="tabs" style={{ marginBottom: 12 }}>
        {ORG_GROUPS.map((g) => (<button key={g} type="button" className={tab === g ? "on" : ""} onClick={() => setTab(g)}>{t(lang, "setg_" + g)}</button>))}
      </div>
      {tab === "company" && (<div className="form-grid"><F g="company" k="name" /><F g="company" k="name_ar" /><F g="company" k="phone" /><F g="company" k="email" /><F g="company" k="city" /><F g="company" k="commercial_registration" /><F g="company" k="tax_number" /><div style={{ gridColumn: "1 / -1" }}><F g="company" k="address" /></div></div>)}
      {tab === "tax" && (<div className="form-grid"><F g="tax" k="vat_pct" type="number" /><F g="tax" k="zatca_enabled" type="check" /></div>)}
      {tab === "projects" && (<div className="form-grid"><F g="projects" k="default_retention_pct" type="number" /><F g="projects" k="default_vat_pct" type="number" /><F g="projects" k="default_advance_pct" type="number" /><F g="projects" k="default_currency" options={["SAR", "AED", "QAR", "KWD", "BHD", "OMR", "USD"]} /><F g="projects" k="default_billing_type" options={["Monthly", "Milestone", "Percentage"]} /><F g="projects" k="default_payment_terms" /></div>)}
      {tab === "numbering" && (<div className="form-grid">{["project", "boq", "estimation", "tender", "ipc", "po", "grn", "indent", "quotation", "advance", "enquiry", "inspection", "proposal", "job", "labour", "equipment", "eqtransfer", "changerequest", "item"].map((k) => (<F key={k} g="numbering" k={k} />))}<F g="numbering" k="padding" type="number" /></div>)}
      {tab === "inventory" && (<div className="form-grid"><F g="inventory" k="default_min_qty" type="number" /></div>)}
      <button className="btn sm" style={{ marginTop: 12 }} onClick={save} disabled={busy}>{busy ? "..." : t(lang, "save")}</button>
    </div>
  );
}
