"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

const fmt = (n, d = 0) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: d });

export default function EstimationDetail() {
  const { id } = useParams();
  const { lang } = useAppStore();
  const [est, setEst] = useState(null);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [head, setHead] = useState({});
  const [item, setItem] = useState({ description: "", unit: "LS", division: "", resource_type: "Mixed", quantity: 0, material_rate: 0, labor_rate: 0, equipment_rate: 0, unit_cost: 0, unit_sell: 0 });
  const [editId, setEditId] = useState(null);
  const [editRow, setEditRow] = useState({});

  const load = () => api.get("/estimations/" + id).then((r) => { setEst(r.data.data); setHead(r.data.data); }).catch(() => {});
  useEffect(() => { load(); }, [id]);

  const act = async (fn, okMsg) => {
    setMsg(""); setOk("");
    try { await fn(); if (okMsg) setOk(okMsg); load(); }
    catch (e) { setMsg(e?.response?.data?.message || "Error"); }
  };
  const saveHeader = (e) => {
    e.preventDefault();
    const patch = {};
    for (const k of ["overhead_pct", "contingency_pct", "escalation_pct", "margin_pct"]) patch[k] = Number(head[k] || 0);
    act(() => api.put("/estimations/" + id, patch), "Header updated");
  };
  const addItem = (e) => {
    e.preventDefault();
    const payload = { ...item };
    for (const k of ["quantity", "material_rate", "labor_rate", "equipment_rate", "unit_cost", "unit_sell"]) payload[k] = Number(payload[k] || 0);
    if (!payload.unit_cost) payload.unit_cost = payload.material_rate + payload.labor_rate + payload.equipment_rate;
    if (!payload.unit_sell) payload.unit_sell = payload.unit_cost;
    act(() => api.post(`/estimations/${id}/items`, payload)).then(() => setItem({ description: "", unit: "LS", division: "", resource_type: "Mixed", quantity: 0, material_rate: 0, labor_rate: 0, equipment_rate: 0, unit_cost: 0, unit_sell: 0 }));
  };
  const saveEdit = (it) => {
    const payload = { ...editRow };
    for (const k of ["quantity", "material_rate", "labor_rate", "equipment_rate", "unit_cost", "unit_sell"]) if (payload[k] !== undefined) payload[k] = Number(payload[k]);
    act(() => api.put(`/estimations/${id}/items/${it.id}`, payload)).then(() => setEditId(null));
  };
  const doExport = async () => {
    try {
      const r = await api.get(`/estimations/${id}/export`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a"); a.href = url; a.download = `Estimation-${est.number}-R${est.revision}.xlsx`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch { setMsg("Export failed"); }
  };

  if (!est) return <div className="card">...</div>;
  const editable = ["Draft", "Rejected"].includes(est.status);
  const groups = {};
  (est.items || []).forEach((i) => { const d = i.division || "Unassigned"; (groups[d] = groups[d] || []).push(i); });
  const buildRows = [
    ["Material", est.material_cost], ["Labour", est.labor_cost], ["Equipment", est.equipment_cost], ["Subcontract", est.subcontract_cost],
  ];
  const base = buildRows.reduce((s, [, v]) => s + Number(v || 0), 0);
  const oh = base * (Number(est.overhead_pct || 0) / 100);
  const direct = base + oh;
  const cont = direct * (Number(est.contingency_pct || 0) / 100);
  const esc = direct * (Number(est.escalation_pct || 0) / 100);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>{est.number} <span className="muted" style={{ fontSize: 15 }}>R{est.revision}</span></h2>
          <p className="sub">{est.project ? `${est.project.code} — ${est.project.name}` : ""}</p>
        </div>
        <span className="spacer" />
        <span className={"badge " + est.status}>{est.status}</span>
        <button className="btn ghost sm" onClick={doExport}>{t(lang, "exportLbl")}</button>
      </div>
      {msg && <div className="alert err">{msg}</div>}
      {ok && <div className="alert ok">{ok}</div>}

      <div className="grid stats" style={{ marginBottom: 14 }}>
        <div className="stat"><div className="k">Direct + OH</div><div className="v">{fmt(direct)}</div><div className="muted" style={{ fontSize: 11 }}>OH {est.overhead_pct}%</div></div>
        <div className="stat"><div className="k">Contingency</div><div className="v">{fmt(cont)}</div><div className="muted" style={{ fontSize: 11 }}>{est.contingency_pct}%</div></div>
        <div className="stat"><div className="k">Escalation</div><div className="v">{fmt(esc)}</div><div className="muted" style={{ fontSize: 11 }}>{est.escalation_pct}%</div></div>
        <div className="stat"><div className="k">Total cost</div><div className="v">{fmt(est.total_cost)}</div></div>
        <div className="stat"><div className="k">Sell</div><div className="v">{fmt(est.sell_total)}</div><div className="muted" style={{ fontSize: 11 }}>margin {est.margin_pct}%</div></div>
      </div>

      <div className="card" style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(est.allowed_transitions || []).map((s) => (
          <button key={s} className={s === "Approved" ? "btn sm" : "btn ghost sm"} onClick={() => act(() => api.post(`/estimations/${id}/transition`, { status: s }), "Estimation " + s)}>{s}</button>
        ))}
        {est.status === "Approved" && <button className="btn ghost sm" onClick={() => act(() => api.post(`/estimations/${id}/new-revision`, {})).then((r) => { if (r?.data?.data?.id) window.location.href = "/estimations/" + r.data.data.id; })}>New revision</button>}
      </div>

      {editable && (
        <div className="card" style={{ marginBottom: 12 }}>
          <form onSubmit={saveHeader} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            {[["overhead_pct", "OH %"], ["contingency_pct", "Cont %"], ["escalation_pct", "Esc %"], ["margin_pct", "Margin %"]].map(([k, label]) => (
              <div key={k}><label className="label">{label}</label><input className="input" style={{ maxWidth: 100 }} type="number" step="0.01" value={head[k] ?? 0} onChange={(e) => setHead({ ...head, [k]: e.target.value })} /></div>
            ))}
            <button className="btn sm" type="submit">Save</button>
          </form>
        </div>
      )}

      {editable && (
        <div className="card" style={{ marginBottom: 12 }}>
          <form onSubmit={addItem} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            <div style={{ flex: 1, minWidth: 180 }}><label className="label">{t(lang, "descriptionF")}</label><input className="input" value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} required /></div>
            <div><label className="label">Resource</label><select className="select" value={item.resource_type} onChange={(e) => setItem({ ...item, resource_type: e.target.value })}>{["Mixed", "Material", "Labor", "Equipment", "Subcontract"].map((x) => (<option key={x}>{x}</option>))}</select></div>
            <div><label className="label">Unit</label><input className="input" style={{ maxWidth: 70 }} value={item.unit} onChange={(e) => setItem({ ...item, unit: e.target.value })} /></div>
            <div><label className="label">Qty</label><input className="input" style={{ maxWidth: 90 }} type="number" step="0.001" value={item.quantity} onChange={(e) => setItem({ ...item, quantity: e.target.value })} /></div>
            <div><label className="label">Mat rate</label><input className="input" style={{ maxWidth: 100 }} type="number" step="0.01" value={item.material_rate} onChange={(e) => setItem({ ...item, material_rate: e.target.value })} /></div>
            <div><label className="label">Lab rate</label><input className="input" style={{ maxWidth: 100 }} type="number" step="0.01" value={item.labor_rate} onChange={(e) => setItem({ ...item, labor_rate: e.target.value })} /></div>
            <div><label className="label">Eqp rate</label><input className="input" style={{ maxWidth: 100 }} type="number" step="0.01" value={item.equipment_rate} onChange={(e) => setItem({ ...item, equipment_rate: e.target.value })} /></div>
            <div><label className="label">Unit cost</label><input className="input" style={{ maxWidth: 100 }} type="number" step="0.01" value={item.unit_cost} onChange={(e) => setItem({ ...item, unit_cost: e.target.value })} /></div>
            <div><label className="label">Unit sell</label><input className="input" style={{ maxWidth: 100 }} type="number" step="0.01" value={item.unit_sell} onChange={(e) => setItem({ ...item, unit_sell: e.target.value })} /></div>
            <div><label className="label">Division</label><input className="input" style={{ maxWidth: 120 }} value={item.division} onChange={(e) => setItem({ ...item, division: e.target.value })} /></div>
            <button className="btn sm" type="submit">+</button>
          </form>
        </div>
      )}

      {Object.entries(groups).map(([div, lines]) => (
        <div key={div} className="table-wrap" style={{ marginBottom: 12 }}>
          <div style={{ padding: "10px 14px", background: "#f8fafd", fontWeight: 700, fontSize: 13 }}>{div} ({lines.length})</div>
          <table className="tbl">
            <thead><tr><th>{t(lang, "descriptionF")}</th><th>Resource</th><th>Unit</th><th>Qty</th><th>Unit cost</th><th>Total cost</th><th>Unit sell</th><th>Total sell</th>{editable && <th></th>}</tr></thead>
            <tbody>{lines.map((i) => (
              <tr key={i.id}>
                <td>{editId === i.id ? <input className="input" value={editRow.description ?? i.description} onChange={(e) => setEditRow({ ...editRow, description: e.target.value })} /> : i.description}</td>
                <td>{i.resource_type}</td>
                <td>{i.unit}</td>
                <td>{editId === i.id ? <input className="input" style={{ maxWidth: 90 }} type="number" step="0.001" value={editRow.quantity ?? i.quantity} onChange={(e) => setEditRow({ ...editRow, quantity: e.target.value })} /> : fmt(i.quantity, 3)}</td>
                <td>{editId === i.id ? <input className="input" style={{ maxWidth: 100 }} type="number" step="0.01" value={editRow.unit_cost ?? i.unit_cost} onChange={(e) => setEditRow({ ...editRow, unit_cost: e.target.value })} /> : fmt(i.unit_cost, 2)}</td>
                <td>{fmt(i.total_cost, 2)}</td>
                <td>{editId === i.id ? <input className="input" style={{ maxWidth: 100 }} type="number" step="0.01" value={editRow.unit_sell ?? i.unit_sell} onChange={(e) => setEditRow({ ...editRow, unit_sell: e.target.value })} /> : fmt(i.unit_sell, 2)}</td>
                <td>{fmt(i.total_sell, 2)}</td>
                {editable && (
                  <td style={{ whiteSpace: "nowrap" }}>
                    {editId === i.id
                      ? <><button className="btn sm" onClick={() => saveEdit(i)}>✓</button> <button className="btn ghost sm" onClick={() => setEditId(null)}>×</button></>
                      : <><button className="btn ghost sm" onClick={() => { setEditId(i.id); setEditRow({}); }}>✎</button> <button className="btn ghost sm" onClick={() => { if (window.confirm(t(lang, "confirmDelete"))) act(() => api.delete(`/estimations/${id}/items/${i.id}`)); }}>×</button></>}
                  </td>
                )}
              </tr>
            ))}</tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
