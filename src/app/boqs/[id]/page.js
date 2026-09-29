"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import { BiginAvatar } from "@/components/DataTable";

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const FLOW = {
  Draft: [{ next: "Submitted", label: "Submit for Approval", cls: "btn sm" }],
  Submitted: [
    { next: "Approved", label: "✓ Approve BOQ", cls: "btn sm" },
    { next: "Draft", label: "Return to Draft", cls: "btn ghost sm" },
  ],
  Approved: [],
  Revised: [],
};

export default function BoqDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { lang } = useAppStore();
  const [boq, setBoq] = useState(null);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [sec, setSec] = useState("items"); // 'items' | 'cost' | 'revisions' | 'history'
  const [item, setItem] = useState({
    line_no: "",
    description: "",
    unit: "M2",
    quantity: 1,
    unit_rate: 0,
    cost_rate: 0,
    division: "General Works",
    trade: "",
  });
  const [editId, setEditId] = useState(null);
  const [editRow, setEditRow] = useState({});
  const [cc, setCc] = useState(null);
  const [revs, setRevs] = useState([]);
  const [cmp, setCmp] = useState(null);
  const [cmpFrom, setCmpFrom] = useState("");
  const [cmpTo, setCmpTo] = useState("");
  const [hist, setHist] = useState([]);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get("/boqs/" + id).then((r) => setBoq(r.data.data)).catch(() => {});
    api.get("/boqs/" + id + "/cost-control").then((r) => setCc(r.data.data)).catch(() => {});
    api.get("/boqs/" + id + "/revisions").then((r) => setRevs(r.data.data || [])).catch(() => {});
    api.get("/boqs/" + id + "/history").then((r) => setHist(r.data.data || [])).catch(() => {});
  };

  useEffect(() => {
    load();
  }, [id]);

  const act = async (fn, okMsg) => {
    setMsg("");
    setOk("");
    setBusy(true);
    try {
      await fn();
      if (okMsg) setOk(okMsg);
      load();
    } catch (e) {
      setMsg(e?.response?.data?.message || "Operation failed");
    } finally {
      setBusy(false);
    }
  };

  const editable = boq && ["Draft", "Submitted"].includes(boq.status);

  const addItem = (e) => {
    e.preventDefault();
    act(
      () =>
        api.post(`/boqs/${id}/items`, {
          ...item,
          quantity: Number(item.quantity || 0),
          unit_rate: Number(item.unit_rate || 0),
          cost_rate: Number(item.cost_rate || 0),
        }),
      "Line item added"
    ).then(() => {
      setItem({
        line_no: "",
        description: "",
        unit: "M2",
        quantity: 1,
        unit_rate: 0,
        cost_rate: 0,
        division: item.division || "General Works",
        trade: "",
      });
      setShowAddDrawer(false);
    });
  };

  const saveEdit = (it) =>
    act(
      () =>
        api.put(`/boqs/${id}/items/${it.id}`, {
          ...editRow,
          quantity: editRow.quantity !== undefined ? Number(editRow.quantity) : undefined,
          unit_rate: editRow.unit_rate !== undefined ? Number(editRow.unit_rate) : undefined,
          cost_rate: editRow.cost_rate !== undefined ? Number(editRow.cost_rate) : undefined,
        }),
      "Line item updated"
    ).then(() => setEditId(null));

  const delItem = (it) => {
    if (window.confirm("Remove this line item from BOQ?")) {
      act(() => api.delete(`/boqs/${id}/items/${it.id}`), "Line item removed");
    }
  };

  const runCompare = () => {
    if (!cmpFrom || !cmpTo) return;
    api
      .get(`/boqs/compare?from=${cmpFrom}&to=${cmpTo}`)
      .then((r) => setCmp(r.data.data))
      .catch(() => {});
  };

  const doExport = async () => {
    try {
      const r = await api.get(`/boqs/${id}/export`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BOQ-${boq.number}-R${boq.revision}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      setMsg("Export failed");
    }
  };

  const bill = () => act(() => api.post(`/boqs/${id}/bill`, {}), "IPC Draft created with unbilled progress");

  if (!boq) {
    return (
      <div className="projects-page" style={{ padding: 24 }}>
        <div style={{ color: "var(--muted)" }}>Loading BOQ Workspace...</div>
      </div>
    );
  }

  // Group items by division
  const groups = {};
  (boq.items || []).forEach((i) => {
    const d = i.division || "General / Unassigned";
    (groups[d] = groups[d] || []).push(i);
  });

  const totalSelling = Number(boq.total_amount || 0);
  const totalCost = (boq.items || []).reduce((acc, i) => acc + Number(i.quantity || 0) * Number(i.cost_rate || 0), 0);
  const totalMargin = totalSelling - totalCost;
  const marginPct = totalSelling > 0 ? ((totalMargin / totalSelling) * 100).toFixed(1) : 0;
  const totalProgressQty = (boq.items || []).reduce((acc, i) => acc + Number(i.progress_qty || 0), 0);
  const totalQty = (boq.items || []).reduce((acc, i) => acc + Number(i.quantity || 0), 0);
  const overallProgPct = totalQty > 0 ? Math.min(100, Math.round((totalProgressQty / totalQty) * 100)) : 0;

  return (
    <div className="projects-page">
      {/* 1. TOP TRANQUIL HEADER & NAVIGATION */}
      <div
        style={{
          padding: "16px 24px",
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Breadcrumb + Status Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => router.push("/boqs")}
              style={{ padding: "4px 8px", fontSize: 12 }}
            >
              ← All BOQs
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)" }}>
                {boq.number}
              </span>
              <span className="badge Active sm">R{boq.revision || 1}</span>
              <span className={`badge ${boq.status === "Approved" ? "Active" : boq.status === "Submitted" ? "Pending" : "Draft"}`}>
                {boq.status}
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {(FLOW[boq.status] || []).map((f) => (
              <button
                key={f.next}
                className={f.cls}
                disabled={busy}
                onClick={() => act(() => api.post(`/boqs/${id}/transition`, { status: f.next }), `Status moved to ${f.next}`)}
              >
                {f.label}
              </button>
            ))}

            {boq.status === "Approved" && (
              <>
                <button
                  className="btn ghost sm"
                  disabled={busy}
                  onClick={() => act(() => api.post(`/boqs/${id}/new-revision`, {}), "New revision created")}
                >
                  + New Revision (R{boq.revision + 1})
                </button>
                <button className="btn sm" disabled={busy} onClick={bill}>
                  ⚡ Generate IPC Bill
                </button>
              </>
            )}

            <button className="btn ghost sm" onClick={doExport} title="Download Excel">
              📥 Export XLSX
            </button>
          </div>
        </div>

        {/* Project Meta Subline */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13, color: "var(--muted)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <BiginAvatar name={boq.project?.name || "Project"} color="#0ba360" />
            <b style={{ color: "var(--fg)" }}>{boq.project?.name || "—"}</b>
            {boq.project?.code && <span>({boq.project.code})</span>}
          </div>
          <span>•</span>
          <span>Scope: {boq.title}</span>
          {boq.title_ar && (
            <>
              <span>•</span>
              <span dir="rtl">{boq.title_ar}</span>
            </>
          )}
        </div>
      </div>

      {msg && (
        <div className="alert err" style={{ margin: "10px 24px" }} onClick={() => setMsg("")}>
          {msg}
        </div>
      )}
      {ok && (
        <div className="alert ok" style={{ margin: "10px 24px" }} onClick={() => setOk("")}>
          {ok}
        </div>
      )}

      {/* 2. QS COMMERCIAL KPI TILES */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          padding: "16px 24px 8px",
        }}
      >
        <div className="card" style={{ padding: 14, borderLeft: "4px solid #0ba360" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Total Contract Value
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: "var(--primary-dark)" }}>
            {fmt(totalSelling)} SAR
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            Across {(boq.items || []).length} line items
          </div>
        </div>

        <div className="card" style={{ padding: 14, borderLeft: "4px solid #3b82f6" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Budgeted Cost Basis
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: "var(--fg)" }}>
            {fmt(totalCost)} SAR
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            Benchmark rate estimation
          </div>
        </div>

        <div className="card" style={{ padding: 14, borderLeft: "4px solid #8b5cf6" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Projected Margin
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: totalMargin >= 0 ? "var(--success)" : "var(--danger)" }}>
            {fmt(totalMargin)} SAR
            <span style={{ fontSize: 12, marginInlineStart: 6, fontWeight: 600 }}>
              ({marginPct}%)
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            Target markup
          </div>
        </div>

        <div className="card" style={{ padding: 14, borderLeft: "4px solid #f59e0b" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Execution Progress
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: "var(--fg)" }}>
            {overallProgPct}%
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            Site DPR verified quantity
          </div>
        </div>
      </div>

      {/* 3. WORKSPACE TABS */}
      <div style={{ padding: "0 24px" }}>
        <div style={{ display: "flex", gap: 10, borderBottom: "1px solid var(--border)", paddingBottom: 8, marginTop: 10 }}>
          <button
            className={`btn ${sec === "items" ? "" : "ghost"}`}
            style={{ padding: "6px 14px", fontSize: 13 }}
            onClick={() => setSec("items")}
          >
            📋 Schedule of Quantities ({(boq.items || []).length})
          </button>
          <button
            className={`btn ${sec === "cost" ? "" : "ghost"}`}
            style={{ padding: "6px 14px", fontSize: 13 }}
            onClick={() => setSec("cost")}
          >
            📊 Cost Control & Margins
          </button>
          <button
            className={`btn ${sec === "revisions" ? "" : "ghost"}`}
            style={{ padding: "6px 14px", fontSize: 13 }}
            onClick={() => setSec("revisions")}
          >
            🔄 Revisions ({revs.length})
          </button>
          <button
            className={`btn ${sec === "history" ? "" : "ghost"}`}
            style={{ padding: "6px 14px", fontSize: 13 }}
            onClick={() => setSec("history")}
          >
            🕒 Audit Trail ({hist.length})
          </button>
        </div>
      </div>

      {/* 4. TAB CONTENTS */}
      <div style={{ padding: "16px 24px" }}>
        {sec === "items" && (
          <div>
            {editable && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button className="btn sm" onClick={() => setShowAddDrawer(true)}>
                  + Add Line Item
                </button>
              </div>
            )}

            {Object.keys(groups).length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  border: "1px dashed var(--border)",
                  borderRadius: 10,
                  background: "var(--bg-subtle)",
                }}
              >
                <div style={{ fontSize: 32 }}>📑</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginTop: 8 }}>
                  No items in this BOQ yet
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                  Add your first line item or import from spreadsheet to populate quantities and rates.
                </div>
                {editable && (
                  <button
                    className="btn sm"
                    style={{ marginTop: 14 }}
                    onClick={() => setShowAddDrawer(true)}
                  >
                    + Add First Item
                  </button>
                )}
              </div>
            ) : (
              Object.entries(groups).map(([div, lines]) => {
                const divSelling = lines.reduce((acc, i) => acc + Number(i.amount || 0), 0);
                const divCost = lines.reduce((acc, i) => acc + Number(i.quantity || 0) * Number(i.cost_rate || 0), 0);
                return (
                  <div
                    key={div}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      marginBottom: 16,
                      overflow: "hidden",
                      background: "var(--bg)",
                    }}
                  >
                    {/* Division Header */}
                    <div
                      style={{
                        padding: "10px 16px",
                        background: "var(--bg-subtle)",
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontWeight: 750, fontSize: 13.5, color: "var(--fg)" }}>
                          {div}
                        </span>
                        <span className="badge neutral sm">{lines.length} item(s)</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--primary-dark)" }}>
                        Total: {fmt(divSelling)} SAR
                        <span style={{ fontSize: 11, color: "var(--muted)", marginInlineStart: 8, fontWeight: 500 }}>
                          (Cost: {fmt(divCost)} SAR)
                        </span>
                      </div>
                    </div>

                    {/* Division Items Table */}
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: "rgba(0,0,0,0.02)", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                            <th style={{ padding: "8px 12px", width: "90px" }}>Item #</th>
                            <th style={{ padding: "8px 12px" }}>Description</th>
                            <th style={{ padding: "8px 10px", width: "70px" }}>Unit</th>
                            <th style={{ padding: "8px 10px", textAlign: "right", width: "95px" }}>Quantity</th>
                            <th style={{ padding: "8px 10px", textAlign: "right", width: "110px" }}>Rate (SAR)</th>
                            <th style={{ padding: "8px 10px", textAlign: "right", width: "110px" }}>Cost Rate</th>
                            <th style={{ padding: "8px 12px", textAlign: "right", width: "120px" }}>Amount (SAR)</th>
                            <th style={{ padding: "8px 10px", textAlign: "center", width: "85px" }}>Progress</th>
                            <th style={{ padding: "8px 10px", textAlign: "right", width: "90px" }}>Billed</th>
                            {editable && <th style={{ padding: "8px 12px", width: "75px" }}></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {lines.map((i) => {
                            const isEditing = editId === i.id;
                            const progPct = i.quantity ? Math.round((Number(i.progress_qty || 0) / Number(i.quantity)) * 100) : 0;
                            return (
                              <tr key={i.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                <td style={{ padding: "8px 12px", fontWeight: 700, color: "var(--primary-dark)" }}>
                                  {i.line_no}
                                </td>
                                <td style={{ padding: "8px 12px" }}>
                                  {isEditing ? (
                                    <input
                                      className="input"
                                      value={editRow.description ?? i.description}
                                      onChange={(e) => setEditRow({ ...editRow, description: e.target.value })}
                                    />
                                  ) : (
                                    <div style={{ fontWeight: 500 }}>{i.description}</div>
                                  )}
                                </td>
                                <td style={{ padding: "8px 10px" }}>
                                  <span className="badge muted sm">{i.unit}</span>
                                </td>
                                <td style={{ padding: "8px 10px", textAlign: "right" }}>
                                  {isEditing ? (
                                    <input
                                      className="input"
                                      type="number"
                                      step="any"
                                      value={editRow.quantity ?? i.quantity}
                                      onChange={(e) => setEditRow({ ...editRow, quantity: e.target.value })}
                                    />
                                  ) : (
                                    fmt(i.quantity)
                                  )}
                                </td>
                                <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>
                                  {isEditing ? (
                                    <input
                                      className="input"
                                      type="number"
                                      step="any"
                                      value={editRow.unit_rate ?? i.unit_rate}
                                      onChange={(e) => setEditRow({ ...editRow, unit_rate: e.target.value })}
                                    />
                                  ) : (
                                    fmt(i.unit_rate)
                                  )}
                                </td>
                                <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--muted)" }}>
                                  {isEditing ? (
                                    <input
                                      className="input"
                                      type="number"
                                      step="any"
                                      value={editRow.cost_rate ?? i.cost_rate}
                                      onChange={(e) => setEditRow({ ...editRow, cost_rate: e.target.value })}
                                    />
                                  ) : (
                                    fmt(i.cost_rate)
                                  )}
                                </td>
                                <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 750 }}>
                                  {fmt(i.amount)}
                                </td>
                                <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                  <span className={`badge ${progPct >= 100 ? "Won" : progPct > 0 ? "Pending" : "neutral"} sm`}>
                                    {progPct}%
                                  </span>
                                </td>
                                <td style={{ padding: "8px 10px", textAlign: "right" }}>
                                  {fmt(i.billed_qty)}
                                </td>
                                {editable && (
                                  <td style={{ padding: "8px 12px", textAlign: "right" }}>
                                    {isEditing ? (
                                      <div style={{ display: "inline-flex", gap: 4 }}>
                                        <button className="btn sm" style={{ padding: "2px 6px" }} onClick={() => saveEdit(i)}>
                                          ✓
                                        </button>
                                        <button className="btn ghost sm" style={{ padding: "2px 6px" }} onClick={() => setEditId(null)}>
                                          ✕
                                        </button>
                                      </div>
                                    ) : (
                                      <div style={{ display: "inline-flex", gap: 4 }}>
                                        <button
                                          className="btn ghost sm"
                                          style={{ padding: "2px 6px" }}
                                          onClick={() => {
                                            setEditId(i.id);
                                            setEditRow({});
                                          }}
                                          title="Edit item"
                                        >
                                          ✎
                                        </button>
                                        <button
                                          className="btn ghost sm"
                                          style={{ color: "var(--danger)", padding: "2px 6px" }}
                                          onClick={() => delItem(i)}
                                          title="Delete item"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* COST CONTROL TAB */}
        {sec === "cost" && (
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)", fontWeight: 700 }}>
              QS Cost vs Selling Breakdown & Division Margin Analysis
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.02)", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "8px 12px" }}>Line</th>
                    <th style={{ padding: "8px 12px" }}>Description</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Selling Total (SAR)</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Cost Basis (SAR)</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Margin (SAR)</th>
                    <th style={{ padding: "8px 12px", textAlign: "center" }}>Progress</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Unbilled WIP</th>
                  </tr>
                </thead>
                <tbody>
                  {(cc?.lines || []).map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 700 }}>{r.line_no}</td>
                      <td style={{ padding: "8px 12px" }}>{r.description}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>{fmt(r.amount)}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--muted)" }}>{fmt(r.cost_amount)}</td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          fontWeight: 750,
                          color: Number(r.margin || 0) < 0 ? "var(--danger)" : "var(--success)",
                        }}
                      >
                        {fmt(r.margin)}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <span className="badge neutral sm">{r.progress_pct}%</span>
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>
                        {fmt(r.to_bill_qty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ padding: 14, background: "var(--bg-subtle)", display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, borderTop: "1px solid var(--border)" }}>
              {(cc?.divisions || []).map((d) => (
                <div key={d.division} style={{ padding: "4px 8px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6 }}>
                  <b>{d.division}</b>: Selling {fmt(d.amount)} / Cost {fmt(d.cost)} SAR
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REVISIONS TAB */}
        {sec === "revisions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card" style={{ padding: 16 }}>
              <h4 style={{ margin: "0 0 10px" }}>Current: R{boq.revision} · {boq.status}</h4>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(revs || []).map((r) => (
                  <span key={r.id} className="badge Active" style={{ padding: "6px 12px" }}>
                    Revision {r.revision} · {r.status} ({fmt(r.total_amount)} SAR)
                  </span>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <h4 style={{ margin: "0 0 10px" }}>Compare Two BOQ Revisions</h4>
              <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
                <div>
                  <label className="label">Baseline Revision</label>
                  <select className="select" value={cmpFrom} onChange={(e) => setCmpFrom(e.target.value)}>
                    <option value="">-- Choose From --</option>
                    {(revs || []).map((r) => (
                      <option key={r.id} value={r.id}>
                        Revision {r.revision} ({r.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Revised Revision</label>
                  <select className="select" value={cmpTo} onChange={(e) => setCmpTo(e.target.value)}>
                    <option value="">-- Choose To --</option>
                    {(revs || []).map((r) => (
                      <option key={r.id} value={r.id}>
                        Revision {r.revision} ({r.status})
                      </option>
                    ))}
                  </select>
                </div>
                <button className="btn" onClick={runCompare} disabled={!cmpFrom || !cmpTo}>
                  Compare Differences
                </button>
              </div>

              {cmp && (
                <div style={{ marginTop: 16, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "var(--bg-subtle)", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                        <th style={{ padding: "8px 12px" }}>Line</th>
                        <th style={{ padding: "8px 12px" }}>Change Type</th>
                        <th style={{ padding: "8px 12px" }}>Before</th>
                        <th style={{ padding: "8px 12px" }}>After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(cmp.diff || []).map((d, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 700 }}>{d.line_no}</td>
                          <td style={{ padding: "8px 12px" }}>
                            <span className="badge Pending sm">{d.change}</span>
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            {d.before ? `${fmt(d.before.quantity)} × ${fmt(d.before.unit_rate)} = ${fmt(d.before.amount)} SAR` : "—"}
                          </td>
                          <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                            {d.after ? `${fmt(d.after.quantity)} × ${fmt(d.after.unit_rate)} = ${fmt(d.after.amount)} SAR` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AUDIT LOG TAB */}
        {sec === "history" && (
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ margin: "0 0 12px" }}>BOQ Audit Trail & Revision History</h4>
            <div className="feed">
              {(hist || []).map((h) => (
                <div key={h.id} className="feed-row" style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <span className="feed-dot" style={{ background: "#0ba360" }} />
                  <span className="feed-tag badge Active sm">{h.action}</span>
                  <span className="feed-txt" style={{ marginInlineStart: 8, fontSize: 13 }}>
                    {h.detail || ""} · <b>{h.user_name || "System"}</b>
                  </span>
                  <span className="feed-date" style={{ marginInlineStart: "auto", fontSize: 12, color: "var(--muted)" }}>
                    {h.created_at ? new Date(h.created_at).toLocaleString() : ""}
                  </span>
                </div>
              ))}
              {!(hist || []).length && <p style={{ color: "var(--muted)" }}>No audit records found.</p>}
            </div>
          </div>
        )}
      </div>

      {/* 5. ADD ITEM DRAWER */}
      {showAddDrawer && (
        <div className="drawer-ov" onClick={() => setShowAddDrawer(false)}>
          <div
            className="drawer sheet-wide"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 750, width: "80vw" }}
          >
            <div className="drawer-h">
              <div>
                <h3>Add Line Item to BOQ</h3>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  Specify line number, standard trade division, unit rate and quantities
                </span>
              </div>
              <button className="btn ghost sm" onClick={() => setShowAddDrawer(false)}>×</button>
            </div>

            <form onSubmit={addItem} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label className="label">Line Item Number *</label>
                  <input
                    className="input"
                    placeholder="e.g. 03.10.01"
                    value={item.line_no}
                    onChange={(e) => setItem({ ...item, line_no: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">Division / Trade *</label>
                  <input
                    className="input"
                    placeholder="e.g. Division 03 - Concrete"
                    value={item.division}
                    onChange={(e) => setItem({ ...item, division: e.target.value })}
                    required
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="label">Detailed Description / Specification *</label>
                  <textarea
                    className="textarea"
                    rows={2}
                    placeholder="e.g. Supply and cast in-place reinforced concrete grade C35/40 for slab on grade..."
                    value={item.description}
                    onChange={(e) => setItem({ ...item, description: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">Unit of Measure</label>
                  <select
                    className="input"
                    value={item.unit}
                    onChange={(e) => setItem({ ...item, unit: e.target.value })}
                  >
                    <option value="M3">M3 (Cubic Meter)</option>
                    <option value="M2">M2 (Square Meter)</option>
                    <option value="LM">LM (Linear Meter)</option>
                    <option value="TON">TON</option>
                    <option value="KG">KG</option>
                    <option value="NOS">NOS (Number)</option>
                    <option value="BAG">BAG</option>
                    <option value="SUM">LUMP SUM</option>
                    <option value="SET">SET</option>
                  </select>
                </div>

                <div>
                  <label className="label">Quantity *</label>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    min="0.001"
                    value={item.quantity}
                    onChange={(e) => setItem({ ...item, quantity: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">Contract Selling Rate (SAR) *</label>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 350.00"
                    value={item.unit_rate}
                    onChange={(e) => setItem({ ...item, unit_rate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">Internal Cost Benchmark (SAR)</label>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 280.00"
                    value={item.cost_rate}
                    onChange={(e) => setItem({ ...item, cost_rate: e.target.value })}
                  />
                </div>
              </div>

              {/* Live line amount calculator */}
              <div
                style={{
                  background: "var(--bg-subtle)",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                }}
              >
                <span>Total Line Amount:</span>
                <b style={{ color: "var(--primary-dark)" }}>
                  {(Number(item.quantity || 0) * Number(item.unit_rate || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                  SAR
                </b>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
                <button type="button" className="btn ghost" onClick={() => setShowAddDrawer(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={busy}>
                  {busy ? "Saving..." : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
