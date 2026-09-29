"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
const dstr = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

export default function TenderDetail() {
  const { id } = useParams();
  const { lang } = useAppStore();
  const [td, setTd] = useState(null);
  const [ca, setCa] = useState(null);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [sec, setSec] = useState("overview");
  const [newAdd, setNewAdd] = useState({ type: "Clarification", subject: "", body: "" });
  const [answer, setAnswer] = useState({});
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({});

  const load = () => {
    api.get("/tenders/" + id).then((r) => { setTd(r.data.data); setForm(r.data.data); }).catch(() => {});
    api.get("/tenders/" + id + "/cost-analysis").then((r) => setCa(r.data.data)).catch(() => {});
  };
  useEffect(() => { load(); }, [id]);

  const act = async (fn, okMsg) => {
    setMsg(""); setOk("");
    try { const r = await fn(); if (okMsg) setOk(okMsg); load(); return r; }
    catch (e) { setMsg(e?.response?.data?.message || "Error"); }
  };
  const saveHeader = (e) => {
    e.preventDefault();
    const patch = {};
    for (const k of ["bid_amount", "contingency_pct", "escalation_pct", "bond_amount", "probability"]) if (form[k] !== undefined) patch[k] = Number(form[k] || 0);
    for (const k of ["title", "reference", "client_name", "consultant_name", "contract_type", "tender_type", "currency", "issue_date", "submission_deadline", "validity_date", "bond_type", "bond_expiry", "bond_status", "scope", "notes"]) patch[k] = form[k] ?? null;
    act(() => api.put("/tenders/" + id, patch), "Tender updated").then(() => setEdit(false));
  };
  const addAdd = (e) => {
    e.preventDefault();
    act(() => api.post(`/tenders/${id}/addenda`, { ...newAdd, issued_date: new Date().toISOString().slice(0, 10) }), "Addendum added")
      .then(() => setNewAdd({ type: "Clarification", subject: "", body: "" }));
  };
  const saveAnswer = (a) => act(() => api.put(`/tenders/${id}/addenda/${a.id}/answer`, { response: answer[a.id] || "" }), "Clarification answered");
  const doExport = async () => {
    try {
      const r = await api.get(`/tenders/${id}/export`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const el = document.createElement("a"); el.href = url; el.download = `Tender-${td.number}.xlsx`; el.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch { setMsg("Export failed"); }
  };

  if (!td) return <div className="card">...</div>;
  const editable = ["Draft"].includes(td.status);
  const s = ca?.summary;
  const divs = ca?.divisions || [];

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>{td.number} <span className="muted" style={{ fontSize: 15 }}>{td.reference || ""}</span></h2>
          <p className="sub">{td.title || "—"} · {td.client_name || "No client"} · {td.contract_type} · {td.currency}</p>
        </div>
        <span className="spacer" />
        <span className={"badge " + td.status}>{td.status}</span>
        <button className="btn ghost sm" onClick={doExport}>{t(lang, "exportLbl")}</button>
      </div>
      {msg && <div className="alert err">{msg}</div>}
      {ok && <div className="alert ok">{ok}</div>}

      <div className="grid stats" style={{ marginBottom: 14 }}>
        <div className="stat"><div className="k">Bid value</div><div className="v">{fmt(td.bid_amount)}</div><div className="muted" style={{ fontSize: 11 }}>{td.currency}</div></div>
        <div className="stat"><div className="k">Cost baseline</div><div className="v">{fmt(td.cost_amount)}</div><div className="muted" style={{ fontSize: 11 }}>{td.baseline_frozen_at ? "frozen" : "not frozen"}</div></div>
        <div className="stat"><div className="k">Margin</div><div className="v" style={{ color: Number(td.computed_margin_pct) < 10 ? "var(--danger)" : "inherit" }}>{Number(td.computed_margin_pct).toFixed(1)}%</div><div className="muted" style={{ fontSize: 11 }}>{fmt(td.bid_amount - td.cost_amount)}</div></div>
        <div className="stat"><div className="k">Deadline</div><div className="v" style={{ fontSize: 17 }}>{dstr(td.submission_deadline)}</div><div className="muted" style={{ fontSize: 11 }}>{td.deadline ? (td.deadline.overdue ? `overdue ${Math.abs(td.deadline.days_remaining)}d` : `${td.deadline.days_remaining} days left`) : "—"}</div></div>
        <div className="stat"><div className="k">Bid bond</div><div className="v" style={{ fontSize: 17 }}>{td.bond_amount ? fmt(td.bond_amount) : "—"}</div><div className="muted" style={{ fontSize: 11 }}>{td.bond_type || "none"} {td.bond_expiry ? "· exp " + dstr(td.bond_expiry) : ""}</div></div>
      </div>

      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {editable && <>
          <button className="btn sm" onClick={() => act(() => api.post(`/tenders/${id}/submit`), "Tender submitted — cost baseline frozen")}>Submit</button>
          <button className="btn ghost sm" onClick={() => setEdit(!edit)}>{edit ? "Cancel edit" : "Edit header"}</button>
        </>}
        {td.status === "Submitted" && <>
          <button className="btn sm" onClick={() => act(() => api.post(`/tenders/${id}/decision`, { status: "Won" }), "Tender won — project awarded")}>Mark Won</button>
          <button className="btn ghost sm" onClick={() => { const r = window.prompt("Reason for loss"); if (r) act(() => api.post(`/tenders/${id}/decision`, { status: "Lost", reason_lost: r }), "Tender lost"); }}>Mark Lost</button>
          <button className="btn ghost sm" onClick={() => act(() => api.post(`/tenders/${id}/decision`, { status: "Cancelled" }), "Tender cancelled")}>Cancel</button>
        </>}
        {td.status === "Won" && !td.awarded_project_id && <button className="btn sm" onClick={() => act(() => api.post(`/tenders/${id}/convert`, {}), "Converted — project and BOQ created")}>Convert to Project + BOQ</button>}
        {td.awarded_project_id && <a className="btn ghost sm" href={"/projects/" + td.project_id}>Open awarded project</a>}
      </div>

      <div className="tabs" style={{ maxWidth: 760, marginBottom: 14 }}>
        {["overview", "cost", "addenda", "documents", "history"].map((x) => (
          <button key={x} type="button" className={sec === x ? "on" : ""} onClick={() => setSec(x)}>
            {x === "addenda" ? `Addenda & Clarifications (${(td.addenda || []).length})` : x[0].toUpperCase() + x.slice(1)}
          </button>
        ))}
      </div>

      {sec === "overview" && (
        <div className="card">
          {edit ? (
            <form onSubmit={saveHeader} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
              <div><label className="label">Title</label><input className="input" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><label className="label">Client ref</label><input className="input" value={form.reference || ""} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
              <div><label className="label">Client</label><input className="input" value={form.client_name || ""} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
              <div><label className="label">Consultant</label><input className="input" value={form.consultant_name || ""} onChange={(e) => setForm({ ...form, consultant_name: e.target.value })} /></div>
              <div><label className="label">Contract type</label><select className="select" value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}>{["LumpSum", "UnitRate", "CostPlus", "GMP"].map((x) => (<option key={x}>{x}</option>))}</select></div>
              <div><label className="label">Tender type</label><select className="select" value={form.tender_type} onChange={(e) => setForm({ ...form, tender_type: e.target.value })}>{["Open", "Selective", "Limited", "Negotiated"].map((x) => (<option key={x}>{x}</option>))}</select></div>
              <div><label className="label">Currency</label><select className="select" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>{["SAR", "USD", "EUR", "AED", "KWD", "QAR", "BHD", "OMR"].map((x) => (<option key={x}>{x}</option>))}</select></div>
              <div><label className="label">Bid value</label><input className="input" type="number" step="0.01" value={form.bid_amount || 0} onChange={(e) => setForm({ ...form, bid_amount: e.target.value })} /></div>
              <div><label className="label">Issue date</label><input className="input" type="date" value={form.issue_date || ""} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></div>
              <div><label className="label">Submission deadline</label><input className="input" type="date" value={form.submission_deadline || ""} onChange={(e) => setForm({ ...form, submission_deadline: e.target.value })} /></div>
              <div><label className="label">Validity to</label><input className="input" type="date" value={form.validity_date || ""} onChange={(e) => setForm({ ...form, validity_date: e.target.value })} /></div>
              <div><label className="label">Contingency %</label><input className="input" type="number" step="0.01" value={form.contingency_pct || 0} onChange={(e) => setForm({ ...form, contingency_pct: e.target.value })} /></div>
              <div><label className="label">Escalation %</label><input className="input" type="number" step="0.01" value={form.escalation_pct || 0} onChange={(e) => setForm({ ...form, escalation_pct: e.target.value })} /></div>
              <div><label className="label">Bond type</label><input className="input" value={form.bond_type || ""} onChange={(e) => setForm({ ...form, bond_type: e.target.value })} /></div>
              <div><label className="label">Bond amount</label><input className="input" type="number" step="0.01" value={form.bond_amount || 0} onChange={(e) => setForm({ ...form, bond_amount: e.target.value })} /></div>
              <div><label className="label">Bond expiry</label><input className="input" type="date" value={form.bond_expiry || ""} onChange={(e) => setForm({ ...form, bond_expiry: e.target.value })} /></div>
              <div><label className="label">Bond status</label><select className="select" value={form.bond_status} onChange={(e) => setForm({ ...form, bond_status: e.target.value })}>{["None", "Pending", "Issued", "Released", "Forfeited"].map((x) => (<option key={x}>{x}</option>))}</select></div>
              <div><label className="label">Win probability %</label><input className="input" type="number" min="0" max="100" value={form.probability || 0} onChange={(e) => setForm({ ...form, probability: e.target.value })} /></div>
              <div style={{ gridColumn: "1 / -1" }}><label className="label">Scope</label><textarea className="input" rows={3} value={form.scope || ""} onChange={(e) => setForm({ ...form, scope: e.target.value })} /></div>
              <div style={{ gridColumn: "1 / -1" }}><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div style={{ gridColumn: "1 / -1" }}><button className="btn" type="submit">Save</button></div>
            </form>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
              {[
                ["Client", td.client_name], ["Consultant", td.consultant_name], ["Project", td.project ? `${td.project.code} — ${td.project.name}` : "—"],
                ["Contract type", td.contract_type], ["Tender type", td.tender_type], ["Currency", td.currency],
                ["Issue date", dstr(td.issue_date)], ["Submission deadline", dstr(td.submission_deadline)], ["Validity to", dstr(td.validity_date)],
                ["Win probability", td.probability + "%"], ["Baseline frozen", td.baseline_frozen_at ? new Date(td.baseline_frozen_at).toLocaleString() : "No"],
                ["Bond status", td.bond_status], ["Bond ref", td.bond_ref || "—"],
                ...(td.reason_lost ? [["Reason lost", td.reason_lost]] : []),
              ].map(([k, v]) => (<div key={k}><div className="label">{k}</div><div>{v || "—"}</div></div>))}
              {td.scope && <div style={{ gridColumn: "1 / -1" }}><div className="label">Scope</div><div style={{ whiteSpace: "pre-wrap" }}>{td.scope}</div></div>}
              {td.notes && <div style={{ gridColumn: "1 / -1" }}><div className="label">Notes</div><div style={{ whiteSpace: "pre-wrap" }}>{td.notes}</div></div>}
            </div>
          )}
        </div>
      )}

      {sec === "cost" && (
        <div>
          {s && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
                {[["Bid amount", s.bid_amount], ["Direct cost", s.direct_cost], ["Contingency", s.contingency], ["Escalation", s.escalation], ["Total cost", s.total_cost], ["Margin", s.margin]].map(([k, v]) => (
                  <div key={k}><div className="label">{k}</div><div style={{ fontSize: 16, fontWeight: 600 }}>{fmt(v)}</div></div>
                ))}
                <div><div className="label">Margin %</div><div style={{ fontSize: 16, fontWeight: 600, color: s.margin_pct < 10 ? "var(--danger)" : "inherit" }}>{s.margin_pct}%</div></div>
                {s.negative_lines > 0 && <div><div className="label">Loss-making lines</div><div style={{ fontSize: 16, fontWeight: 600, color: "var(--danger)" }}>{s.negative_lines}</div></div>}
              </div>
            </div>
          )}
          {divs.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="label" style={{ marginBottom: 6 }}>By division</div>
              <div className="table-wrap"><table className="tbl">
                <thead><tr><th>Division</th><th>Lines</th><th>Bid</th><th>Cost</th><th>Margin</th></tr></thead>
                <tbody>{divs.map((d) => (<tr key={d.division}><td>{d.division}</td><td>{d.lines}</td><td>{fmt(d.amount)}</td><td>{fmt(d.cost)}</td><td style={{ color: d.margin < 0 ? "var(--danger)" : "inherit" }}>{fmt(d.margin)}</td></tr>))}</tbody>
              </table></div>
            </div>
          )}
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Line</th><th>{t(lang, "descriptionF")}</th><th>Div.</th><th>Qty</th><th>Rate</th><th>Amount</th><th>Cost</th><th>Margin</th></tr></thead>
              <tbody>{(ca?.lines || []).map((l) => (
                <tr key={l.id}><td>{l.line_no || "—"}</td><td>{l.description}</td><td>{l.division || "—"}</td>
                  <td>{fmt(l.quantity)}</td><td>{fmt(l.unit_rate)}</td><td>{fmt(l.amount)}</td><td>{fmt(l.cost_amount)}</td>
                  <td style={{ color: l.margin < 0 ? "var(--danger)" : "inherit" }}>{fmt(l.margin)} ({l.margin_pct}%)</td></tr>
              ))}
              {!(ca?.lines || []).length && <tr><td colSpan={8} className="muted" style={{ textAlign: "center", padding: 20 }}>No baseline frozen yet — submit the tender to snapshot the BOQ</td></tr>}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {sec === "addenda" && (
        <div>
          {td.status === "Draft" && (
            <div className="card" style={{ marginBottom: 12 }}>
              <form onSubmit={addAdd} style={{ display: "grid", gridTemplateColumns: "160px 1fr 2fr auto", gap: 8, alignItems: "end" }}>
                <div><label className="label">Type</label><select className="select" value={newAdd.type} onChange={(e) => setNewAdd({ ...newAdd, type: e.target.value })}>{["Clarification", "Addendum", "QandA", "Corrigendum"].map((x) => (<option key={x}>{x}</option>))}</select></div>
                <div><label className="label">Subject</label><input className="input" value={newAdd.subject} onChange={(e) => setNewAdd({ ...newAdd, subject: e.target.value })} required /></div>
                <div><label className="label">Detail</label><input className="input" value={newAdd.body} onChange={(e) => setNewAdd({ ...newAdd, body: e.target.value })} /></div>
                <button className="btn sm" type="submit">Add</button>
              </form>
            </div>
          )}
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>#</th><th>Type</th><th>Subject</th><th>Detail</th><th>Response</th><th>Issued</th><th>Status</th></tr></thead>
              <tbody>{(td.addenda || []).map((a) => (
                <tr key={a.id}>
                  <td>{a.ref_no}</td><td><span className="badge Draft">{a.type}</span></td>
                  <td>{a.subject}</td>
                  <td style={{ maxWidth: 260 }}>{a.body}</td>
                  <td style={{ minWidth: 200 }}>
                    {a.status === "Answered" ? <div><div>{a.response}</div><div className="muted" style={{ fontSize: 11 }}>{a.responded_date ? dstr(a.responded_date) : ""}</div></div>
                      : <div style={{ display: "flex", gap: 4 }}><input className="input" placeholder="Consultant reply…" value={answer[a.id] || ""} onChange={(e) => setAnswer({ ...answer, [a.id]: e.target.value })} /><button className="btn ghost sm" onClick={() => saveAnswer(a)}>Save</button></div>}
                  </td>
                  <td>{dstr(a.issued_date)}</td>
                  <td><span className={"badge " + (a.status === "Answered" ? "Approved" : "Draft")}>{a.status}</span></td>
                </tr>
              ))}
              {!(td.addenda || []).length && <tr><td colSpan={7} className="muted" style={{ textAlign: "center", padding: 20 }}>No addenda or clarifications logged</td></tr>}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {sec === "documents" && (
        <div className="card">
          <label className="btn ghost sm" style={{ display: "inline-block", cursor: "pointer" }}>
            Upload document<input type="file" hidden onChange={async (e) => {
              const f = e.target.files[0]; if (!f) return;
              const fd = new FormData();
              fd.append("file", f); fd.append("entity_type", "tender"); fd.append("entity_id", id);
              try { await api.post("/documents/upload", fd); setOk("Document uploaded"); load(); }
              catch (err) { setMsg(err?.response?.data?.message || "Upload failed"); }
              e.target.value = "";
            }} />
          </label>
          {(td.documents || []).length > 0 ? (
            <div className="table-wrap" style={{ marginTop: 12 }}><table className="tbl">
              <thead><tr><th>File</th><th>Type</th><th>Size</th><th>Uploaded</th><th></th></tr></thead>
              <tbody>{td.documents.map((d) => (
                <tr key={d.id}><td>{d.file_name}</td><td>{d.mime || "—"}</td>
                  <td>{d.size ? Math.round(d.size / 1024) + " KB" : "—"}</td><td>{dstr(d.created_at)}</td>
                  <td><a className="btn ghost sm" href={`/api/v1/documents/${d.id}/download`} target="_blank" rel="noreferrer">Download</a></td></tr>
              ))}</tbody>
            </table></div>
          ) : <p className="muted" style={{ marginTop: 12 }}>No documents yet — upload drawings, specifications or the RFP pack.</p>}
        </div>
      )}

      {sec === "history" && (
        <div className="card">
          <div className="feed">
            {(td.history || []).map((h) => (
              <div key={h.id} className="feed-row">
                <span className="feed-dot" style={{ background: "#2f7cf6" }} />
                <span className="feed-tag">{h.action}</span>
                <span className="feed-txt">{h.detail || ""} · {h.user_name || ""}</span>
                <span className="feed-date">{h.created_at ? new Date(h.created_at).toLocaleString() : ""}</span>
              </div>
            ))}
            {!(td.history || []).length && <p className="muted">-</p>}
          </div>
        </div>
      )}
    </div>
  );
}
