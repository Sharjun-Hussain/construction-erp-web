"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 3 });
const FLOW = { Draft: ["Submitted"], Submitted: ["Approved", "Draft"], Approved: [], Revised: [] };

export default function BoqDetail() {
  const { id } = useParams();
  const { lang } = useAppStore();
  const [boq, setBoq] = useState(null);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [sec, setSec] = useState("items");
  const [item, setItem] = useState({ line_no: "", description: "", unit: "M2", quantity: 0, unit_rate: 0, cost_rate: 0, division: "", trade: "" });
  const [editId, setEditId] = useState(null);
  const [editRow, setEditRow] = useState({});
  const [cc, setCc] = useState(null);
  const [revs, setRevs] = useState([]);
  const [cmp, setCmp] = useState(null);
  const [cmpFrom, setCmpFrom] = useState("");
  const [cmpTo, setCmpTo] = useState("");
  const [hist, setHist] = useState([]);

  const load = () => {
    api.get("/boqs/" + id).then((r) => setBoq(r.data.data)).catch(() => {});
    api.get("/boqs/" + id + "/cost-control").then((r) => setCc(r.data.data)).catch(() => {});
    api.get("/boqs/" + id + "/revisions").then((r) => setRevs(r.data.data || [])).catch(() => {});
    api.get("/boqs/" + id + "/history").then((r) => setHist(r.data.data || [])).catch(() => {});
  };
  useEffect(() => { load(); }, [id]);

  const act = async (fn, okMsg) => {
    setMsg(""); setOk("");
    try { await fn(); if (okMsg) setOk(okMsg); load(); }
    catch (e) { setMsg(e?.response?.data?.message || "Error"); }
  };
  const editable = boq && ["Draft", "Submitted"].includes(boq.status);
  const addItem = (e) => {
    e.preventDefault();
    act(() => api.post(`/boqs/${id}/items`, { ...item, quantity: Number(item.quantity), unit_rate: Number(item.unit_rate), cost_rate: Number(item.cost_rate) }))
      .then(() => setItem({ line_no: "", description: "", unit: "M2", quantity: 0, unit_rate: 0, cost_rate: 0, division: "", trade: "" }));
  };
  const saveEdit = (it) => act(() => api.put(`/boqs/${id}/items/${it.id}`, {
    ...editRow,
    quantity: editRow.quantity !== undefined ? Number(editRow.quantity) : undefined,
    unit_rate: editRow.unit_rate !== undefined ? Number(editRow.unit_rate) : undefined,
    cost_rate: editRow.cost_rate !== undefined ? Number(editRow.cost_rate) : undefined,
  })).then(() => setEditId(null));
  const delItem = (it) => { if (window.confirm(t(lang, "confirmDelete"))) act(() => api.delete(`/boqs/${id}/items/${it.id}`)); };
  const runCompare = () => {
    if (!cmpFrom || !cmpTo) return;
    api.get(`/boqs/compare?from=${cmpFrom}&to=${cmpTo}`).then((r) => setCmp(r.data.data)).catch(() => {});
  };
  const doExport = async () => {
    try {
      const r = await api.get(`/boqs/${id}/export`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url; a.download = `BOQ-${boq.number}-R${boq.revision}.xlsx`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) { setMsg("Export failed"); }
  };
  const bill = () => act(() => api.post(`/boqs/${id}/bill`, {}), t(lang, "ipcDrafted"));

  if (!boq) return <div className="card">...</div>;
  const groups = {};
  (boq.items || []).forEach((i) => { const d = i.division || t(lang, "unassignedLbl"); (groups[d] = groups[d] || []).push(i); });

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>{boq.number} <span className="muted">R{boq.revision}</span></h2>
          <p className="sub">{boq.title} · {fmt(boq.total_amount)}</p>
        </div>
        <span className="spacer" />
        <span className={"badge " + boq.status}>{boq.status}</span>
      </div>
      {msg && <div className="alert err">{msg}</div>}
      {ok && <div className="alert ok">{ok}</div>}

      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(FLOW[boq.status] || []).map((s) => (<button key={s} className="btn ghost sm" onClick={() => act(() => api.post(`/boqs/${id}/transition`, { status: s }))}>{s}</button>))}
        {boq.status === "Approved" && <button className="btn ghost sm" onClick={() => act(() => api.post(`/boqs/${id}/new-revision`, {}))}>{t(lang, "newRevision")}</button>}
        <button className="btn ghost sm" onClick={doExport}>{t(lang, "exportLbl")}</button>
        {boq.status === "Approved" && <button className="btn sm" onClick={bill}>{t(lang, "billRemaining")}</button>}
      </div>

      <div className="tabs" style={{ maxWidth: 720, marginBottom: 14 }}>
        {["items", "cost", "revisions", "history"].map((x) => (
          <button key={x} type="button" className={sec === x ? "on" : ""} onClick={() => setSec(x)}>{t(lang, "boqsec_" + x)}</button>
        ))}
      </div>

      {sec === "items" && (
        <>
          {editable && (
            <div className="card" style={{ marginBottom: 12 }}>
              <form onSubmit={addItem} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
                <div><label className="label">Line</label><input className="input" style={{ maxWidth: 90 }} value={item.line_no} onChange={(e) => setItem({ ...item, line_no: e.target.value })} required /></div>
                <div style={{ flex: 1, minWidth: 200 }}><label className="label">{t(lang, "descriptionF")}</label><input className="input" value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} required /></div>
                <div><label className="label">Unit</label><input className="input" style={{ maxWidth: 80 }} value={item.unit} onChange={(e) => setItem({ ...item, unit: e.target.value })} /></div>
                <div><label className="label">Qty</label><input className="input" style={{ maxWidth: 100 }} type="number" step="0.001" value={item.quantity} onChange={(e) => setItem({ ...item, quantity: e.target.value })} /></div>
                <div><label className="label">Rate</label><input className="input" style={{ maxWidth: 110 }} type="number" step="0.01" value={item.unit_rate} onChange={(e) => setItem({ ...item, unit_rate: e.target.value })} /></div>
                <div><label className="label">{t(lang, "costRate")}</label><input className="input" style={{ maxWidth: 110 }} type="number" step="0.01" value={item.cost_rate} onChange={(e) => setItem({ ...item, cost_rate: e.target.value })} /></div>
                <div><label className="label">{t(lang, "divisionLbl")}</label><input className="input" style={{ maxWidth: 130 }} value={item.division} onChange={(e) => setItem({ ...item, division: e.target.value })} /></div>
                <button className="btn sm" type="submit">+</button>
              </form>
            </div>
          )}
          {Object.entries(groups).map(([div, lines]) => (
            <div key={div} className="table-wrap" style={{ marginBottom: 12 }}>
              <div style={{ padding: "10px 14px", background: "#f8fafd", fontWeight: 700, fontSize: 13 }}>{div} ({lines.length})</div>
              <table className="tbl">
                <thead><tr><th>Line</th><th>{t(lang, "descriptionF")}</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Cost</th><th>{t(lang, "amount")}</th><th>Prog%</th><th>Billed</th>{editable && <th></th>}</tr></thead>
                <tbody>{lines.map((i) => (
                  <tr key={i.id}>
                    <td>{i.line_no}</td>
                    <td>{editId === i.id
                      ? <input className="input" value={editRow.description ?? i.description} onChange={(e) => setEditRow({ ...editRow, description: e.target.value })} />
                      : i.description}</td>
                    <td>{i.unit}</td>
                    <td>{editId === i.id
                      ? <input className="input" style={{ maxWidth: 90 }} type="number" step="0.001" value={editRow.quantity ?? i.quantity} onChange={(e) => setEditRow({ ...editRow, quantity: e.target.value })} />
                      : fmt(i.quantity)}</td>
                    <td>{editId === i.id
                      ? <input className="input" style={{ maxWidth: 100 }} type="number" step="0.01" value={editRow.unit_rate ?? i.unit_rate} onChange={(e) => setEditRow({ ...editRow, unit_rate: e.target.value })} />
                      : fmt(i.unit_rate)}</td>
                    <td>{editId === i.id
                      ? <input className="input" style={{ maxWidth: 100 }} type="number" step="0.01" value={editRow.cost_rate ?? i.cost_rate} onChange={(e) => setEditRow({ ...editRow, cost_rate: e.target.value })} />
                      : fmt(i.cost_rate)}</td>
                    <td>{fmt(i.amount)}</td>
                    <td>{i.quantity ? Math.round((i.progress_qty / i.quantity) * 100) : 0}%</td>
                    <td>{fmt(i.billed_qty)}</td>
                    {editable && (
                      <td style={{ whiteSpace: "nowrap" }}>
                        {editId === i.id
                          ? <><button className="btn sm" onClick={() => saveEdit(i)}>✓</button> <button className="btn ghost sm" onClick={() => setEditId(null)}>×</button></>
                          : <><button className="btn ghost sm" onClick={() => { setEditId(i.id); setEditRow({}); }}>✎</button> <button className="btn ghost sm" onClick={() => delItem(i)}>×</button></>}
                      </td>
                    )}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ))}
        </>
      )}

      {sec === "cost" && (
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Line</th><th>{t(lang, "descriptionF")}</th><th>Sell</th><th>Cost</th><th>Margin</th><th>Prog%</th><th>To bill</th></tr></thead>
            <tbody>{(cc?.lines || []).map((r) => (
              <tr key={r.id}><td>{r.line_no}</td><td>{r.description}</td><td>{fmt(r.amount)}</td><td>{fmt(r.cost_amount)}</td>
                <td style={{ color: r.margin < 0 ? "var(--danger)" : "inherit" }}>{fmt(r.margin)}</td>
                <td>{r.progress_pct}%</td><td>{fmt(r.to_bill_qty)}</td></tr>
            ))}</tbody>
          </table>
          <div style={{ padding: 12, display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13 }}>
            {(cc?.divisions || []).map((d) => (
              <span key={d.division}><b>{d.division}</b>: {fmt(d.amount)} / {fmt(d.cost)}</span>
            ))}
          </div>
        </div>
      )}

      {sec === "revisions" && (
        <div className="grid" style={{ gap: 12 }}>
          <div className="card">
            <h3>R{boq.revision} · {boq.status}</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(revs || []).map((r) => (<span key={r.id} className="badge Draft">R{r.revision} · {r.status}</span>))}
            </div>
          </div>
          <div className="card">
            <h3>{t(lang, "compare2")}</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
              <div><label className="label">From</label>
                <select className="select" value={cmpFrom} onChange={(e) => setCmpFrom(e.target.value)}>
                  <option value="">—</option>{(revs || []).map((r) => (<option key={r.id} value={r.id}>R{r.revision}</option>))}
                </select></div>
              <div><label className="label">To</label>
                <select className="select" value={cmpTo} onChange={(e) => setCmpTo(e.target.value)}>
                  <option value="">—</option>{(revs || []).map((r) => (<option key={r.id} value={r.id}>R{r.revision}</option>))}
                </select></div>
              <button className="btn ghost sm" onClick={runCompare}>{t(lang, "compare2")}</button>
            </div>
            {cmp && (
              <div className="table-wrap" style={{ marginTop: 10 }}><table className="tbl">
                <thead><tr><th>Line</th><th>Change</th><th>Before</th><th>After</th></tr></thead>
                <tbody>{(cmp.diff || []).map((d, i) => (
                  <tr key={i}><td>{d.line_no}</td><td><span className="badge Submitted">{d.change}</span></td>
                    <td>{d.before ? `${fmt(d.before.quantity)} × ${fmt(d.before.unit_rate)} = ${fmt(d.before.amount)}` : "-"}</td>
                    <td>{d.after ? `${fmt(d.after.quantity)} × ${fmt(d.after.unit_rate)} = ${fmt(d.after.amount)}` : "-"}</td></tr>
                ))}</tbody>
              </table></div>
            )}
          </div>
        </div>
      )}

      {sec === "history" && (
        <div className="card">
          <div className="feed">
            {(hist || []).map((h) => (
              <div key={h.id} className="feed-row">
                <span className="feed-dot" style={{ background: "#2f7cf6" }} />
                <span className="feed-tag">{h.action}</span>
                <span className="feed-txt">{h.detail || ""} · {h.user_name || ""}</span>
                <span className="feed-date">{h.created_at ? new Date(h.created_at).toLocaleDateString() : ""}</span>
              </div>
            ))}
            {!(hist || []).length && <p className="muted">-</p>}
          </div>
        </div>
      )}
    </div>
  );
}
