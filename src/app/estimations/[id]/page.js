"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

const fmt = (n, d = 0) =>
  Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

const EST_STAGES = [
  { key: "Draft", label: "1. Draft Takeoff", desc: "Measurement, rates & BOQ quantification" },
  { key: "Submitted", label: "2. Submitted Review", desc: "Commercial QS & management audit" },
  { key: "Approved", label: "3. Approved Baseline", desc: "Locked contractual cost benchmark" },
];

const RESOURCE_TYPES = ["Mixed", "Material", "Labor", "Equipment", "Subcontract"];
const UNITS = ["LS", "m2", "m3", "LM", "Ton", "kg", "No", "Hr", "Day", "Month", "Item"];

export default function EstimationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { lang } = useAppStore();

  const [est, setEst] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [sec, setSec] = useState("items"); // 'items' | 'parameters' | 'breakdown'

  // Line item add/edit state
  const [showItemDrawer, setShowItemDrawer] = useState(false);
  const [itemForm, setItemForm] = useState({
    description: "",
    unit: "m3",
    division: "03 - Concrete Works",
    resource_type: "Mixed",
    quantity: 1,
    material_rate: 0,
    labor_rate: 0,
    equipment_rate: 0,
    unit_cost: 0,
    unit_sell: 0,
  });
  const [editItemId, setEditItemId] = useState(null);

  // Parameter edit state
  const [paramForm, setParamForm] = useState({
    overhead_pct: 5,
    contingency_pct: 5,
    escalation_pct: 0,
    margin_pct: 12,
  });

  const load = () => {
    setLoading(true);
    api
      .get("/estimations/" + id)
      .then((r) => {
        const d = r.data.data;
        setEst(d);
        setParamForm({
          overhead_pct: d.overhead_pct ?? 5,
          contingency_pct: d.contingency_pct ?? 5,
          escalation_pct: d.escalation_pct ?? 0,
          margin_pct: d.margin_pct ?? 12,
        });
        setLoading(false);
      })
      .catch((err) => {
        setMsg(err?.response?.data?.message || "Failed to load estimation");
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const act = async (fn, okMsg) => {
    setMsg("");
    setOk("");
    setBusy(true);
    try {
      const res = await fn();
      if (okMsg) setOk(okMsg);
      load();
      return res;
    } catch (e) {
      setMsg(e?.response?.data?.message || "Operation failed");
    } finally {
      setBusy(false);
    }
  };

  // State Transitions
  const handleTransition = (newStatus) => {
    act(
      () => api.post(`/estimations/${id}/transition`, { status: newStatus }),
      `Estimation status updated to ${newStatus}`
    );
  };

  // Revision generation
  const handleNewRevision = () => {
    if (!window.confirm("Create a new formal revision of this approved estimation?")) return;
    act(
      () => api.post(`/estimations/${id}/new-revision`, {}),
      "New revision generated successfully!"
    ).then((res) => {
      if (res?.data?.data?.id) {
        router.push(`/estimations/${res.data.data.id}`);
      }
    });
  };

  // Export to Excel
  const doExport = async () => {
    try {
      const r = await api.get(`/estimations/${id}/export`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Estimation-${est.number}-R${est.revision}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setMsg("Failed to export estimation spreadsheet");
    }
  };

  // Save commercial parameters
  const saveParameters = async (e) => {
    e.preventDefault();
    const patch = {
      overhead_pct: Number(paramForm.overhead_pct || 0),
      contingency_pct: Number(paramForm.contingency_pct || 0),
      escalation_pct: Number(paramForm.escalation_pct || 0),
      margin_pct: Number(paramForm.margin_pct || 0),
    };
    await act(() => api.put(`/estimations/${id}`, patch), "Commercial parameters updated and recalculated");
  };

  // Open item drawer for adding
  const openAddItem = () => {
    setItemForm({
      description: "",
      unit: "m3",
      division: "03 - Concrete Works",
      resource_type: "Mixed",
      quantity: 1,
      material_rate: 0,
      labor_rate: 0,
      equipment_rate: 0,
      unit_cost: 0,
      unit_sell: 0,
    });
    setEditItemId(null);
    setShowItemDrawer(true);
  };

  // Open item drawer for editing
  const openEditItem = (it) => {
    setItemForm({
      description: it.description || "",
      unit: it.unit || "m3",
      division: it.division || "",
      resource_type: it.resource_type || "Mixed",
      quantity: Number(it.quantity || 0),
      material_rate: Number(it.material_rate || 0),
      labor_rate: Number(it.labor_rate || 0),
      equipment_rate: Number(it.equipment_rate || 0),
      unit_cost: Number(it.unit_cost || 0),
      unit_sell: Number(it.unit_sell || 0),
    });
    setEditItemId(it.id);
    setShowItemDrawer(true);
  };

  // Auto calculate item unit cost if rates are provided
  const handleItemRateChange = (field, val) => {
    const updated = { ...itemForm, [field]: val };
    const m = Number(field === "material_rate" ? val : updated.material_rate || 0);
    const l = Number(field === "labor_rate" ? val : updated.labor_rate || 0);
    const e = Number(field === "equipment_rate" ? val : updated.equipment_rate || 0);
    const computedCost = m + l + e;

    if (computedCost > 0 && (!updated.unit_cost || updated.unit_cost === itemForm.unit_cost)) {
      updated.unit_cost = computedCost;
      if (!updated.unit_sell || updated.unit_sell === itemForm.unit_sell) {
        const marginMultiplier = 1 + Number(est?.margin_pct || 12) / 100;
        updated.unit_sell = Number((computedCost * marginMultiplier).toFixed(2));
      }
    }
    setItemForm(updated);
  };

  // Save line item (Create or Update)
  const saveLineItem = async (e) => {
    e.preventDefault();
    const payload = {
      description: itemForm.description.trim(),
      unit: itemForm.unit || "LS",
      division: itemForm.division.trim() || "General",
      resource_type: itemForm.resource_type || "Mixed",
      quantity: Number(itemForm.quantity || 0),
      material_rate: Number(itemForm.material_rate || 0),
      labor_rate: Number(itemForm.labor_rate || 0),
      equipment_rate: Number(itemForm.equipment_rate || 0),
      unit_cost: Number(itemForm.unit_cost || 0),
      unit_sell: Number(itemForm.unit_sell || 0),
    };

    if (!payload.unit_cost) {
      payload.unit_cost = payload.material_rate + payload.labor_rate + payload.equipment_rate;
    }
    if (!payload.unit_sell) {
      payload.unit_sell = payload.unit_cost;
    }

    if (editItemId) {
      await act(() => api.put(`/estimations/${id}/items/${editItemId}`, payload), "Takeoff item updated");
    } else {
      await act(() => api.post(`/estimations/${id}/items`, payload), "Takeoff item added to bill");
    }
    setShowItemDrawer(false);
  };

  // Delete line item
  const deleteLineItem = (itemId) => {
    if (!window.confirm("Remove this takeoff item from estimation?")) return;
    act(() => api.delete(`/estimations/${id}/items/${itemId}`), "Item removed");
  };

  if (loading && !est) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center", color: "#64748b" }}>
        Loading estimation workspace...
      </div>
    );
  }

  if (!est) {
    return (
      <div style={{ padding: 24 }}>
        <div className="alert err">{msg || "Estimation not found"}</div>
        <button className="btn" onClick={() => router.push("/estimations")}>
          ← Back to Estimations
        </button>
      </div>
    );
  }

  const editable = ["Draft", "Rejected"].includes(est.status);

  // Group line items by division
  const groups = {};
  (est.items || []).forEach((i) => {
    const d = i.division?.trim() || "General Works";
    if (!groups[d]) {
      groups[d] = {
        name: d,
        items: [],
        totalCost: 0,
        totalSell: 0,
      };
    }
    groups[d].items.push(i);
    groups[d].totalCost += Number(i.total_cost || 0);
    groups[d].totalSell += Number(i.total_sell || 0);
  });
  const divisionList = Object.values(groups);

  // Breakdown figures
  const buildRows = [
    { label: "Direct Materials", val: Number(est.material_cost || 0), color: "#0284c7" },
    { label: "Direct Workforce / Labour", val: Number(est.labor_cost || 0), color: "#f59e0b" },
    { label: "Plant & Heavy Equipment", val: Number(est.equipment_cost || 0), color: "#8b5cf6" },
    { label: "Subcontract Works", val: Number(est.subcontract_cost || 0), color: "#0ba360" },
  ];
  const baseDirect = buildRows.reduce((s, r) => s + r.val, 0);
  const ohPct = Number(est.overhead_pct || 0);
  const ohAmt = baseDirect * (ohPct / 100);
  const directPlusOh = baseDirect + ohAmt;
  const contPct = Number(est.contingency_pct || 0);
  const contAmt = directPlusOh * (contPct / 100);
  const escPct = Number(est.escalation_pct || 0);
  const escAmt = directPlusOh * (escPct / 100);
  const totalCost = Number(est.total_cost || 0);
  const sellTotal = Number(est.sell_total || 0);
  const grossProfit = sellTotal - totalCost;
  const marginPct = sellTotal > 0 ? (grossProfit / sellTotal) * 100 : 0;

  // Active stage index
  const stageOrder = ["Draft", "Submitted", "Approved"];
  const currentStageIdx = stageOrder.indexOf(est.status);

  return (
    <div className="projects-page" style={{ paddingBottom: 60 }}>
      {/* 1. TOP TRANQUIL WORKSPACE HEADER BAR */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #e2e8f0",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => router.push("/estimations")}
              style={{ fontSize: 11.5, padding: "2px 8px" }}
            >
              ← All Estimations
            </button>
            <span style={{ color: "#cbd5e1" }}>/</span>
            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
              {est.project?.code || "Takeoff Workspace"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
              {est.number}
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: "#f1f5f9",
                color: "#475569",
                padding: "2px 8px",
                borderRadius: 4,
                border: "1px solid #e2e8f0",
              }}
            >
              Revision {est.revision}
            </span>
            <span className={"badge " + est.status} style={{ fontSize: 11.5, padding: "3px 10px" }}>
              {est.status}
            </span>
          </div>

          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            Project: <b style={{ color: "#1e293b" }}>{est.project?.code} — {est.project?.name}</b>
            {est.project?.client_name && <span> • Client: {est.project.client_name}</span>}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={doExport}
            style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export XLSX
          </button>

          {/* Workflow Transitions */}
          {est.status === "Draft" && (
            <button
              type="button"
              className="btn sm"
              style={{ background: "#0284c7", borderColor: "#0284c7", color: "#fff", fontWeight: 600 }}
              onClick={() => handleTransition("Submitted")}
              disabled={busy}
            >
              Submit for Review →
            </button>
          )}

          {est.status === "Submitted" && (
            <>
              <button
                type="button"
                className="btn sm"
                style={{ background: "#0ba360", borderColor: "#0ba360", color: "#fff", fontWeight: 600 }}
                onClick={() => handleTransition("Approved")}
                disabled={busy}
              >
                ✓ Approve Baseline
              </button>
              <button
                type="button"
                className="btn ghost sm"
                style={{ color: "#e11d48", borderColor: "#fecdd3" }}
                onClick={() => handleTransition("Rejected")}
                disabled={busy}
              >
                Reject Takeoff
              </button>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => handleTransition("Draft")}
                disabled={busy}
              >
                Reopen Draft
              </button>
            </>
          )}

          {est.status === "Rejected" && (
            <button
              type="button"
              className="btn sm"
              style={{ background: "#0284c7", borderColor: "#0284c7", color: "#fff" }}
              onClick={() => handleTransition("Draft")}
              disabled={busy}
            >
              Reopen as Draft
            </button>
          )}

          {est.status === "Approved" && (
            <button
              type="button"
              className="btn sm"
              style={{ background: "#0ba360", borderColor: "#0ba360", color: "#fff", fontWeight: 600 }}
              onClick={handleNewRevision}
              disabled={busy}
            >
              + Create Revision (R{est.revision + 1})
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className="alert err" style={{ margin: "14px 24px 0" }} onClick={() => setMsg("")}>
          {msg}
        </div>
      )}
      {ok && (
        <div className="alert ok" style={{ margin: "14px 24px 0" }} onClick={() => setOk("")}>
          {ok}
        </div>
      )}

      {/* 2. TRANQUIL LIFECYCLE STEPPER BAR */}
      <div style={{ padding: "16px 24px 0" }}>
        <div className="tranquil-lifecycle-bar">
          {EST_STAGES.map((stg, i) => {
            const isCompleted = currentStageIdx > i;
            const isCurrent = est.status === stg.key;
            return (
              <div
                key={stg.key}
                className={`tranquil-step-pill ${isCompleted ? "completed" : ""} ${isCurrent ? "active" : ""}`}
                style={{ cursor: "default" }}
              >
                <div className="step-circle">
                  {isCompleted ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <div className="step-text">
                  <div className="title">{stg.label}</div>
                  <div className="desc">{stg.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. COMMERCIAL KPI RIBBON */}
      <div style={{ padding: "16px 24px 0" }}>
        <div className="bigin-kpi-banner">
          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Direct Cost + OH</span>
            <span className="bigin-kpi-val">{fmt(directPlusOh)} SAR</span>
            <span className="bigin-kpi-sub">
              Base: {fmt(baseDirect)} • OH: {est.overhead_pct}%
            </span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Contingency & Escalation</span>
            <span className="bigin-kpi-val" style={{ color: "#d97706" }}>
              {fmt(contAmt + escAmt)} SAR
            </span>
            <span className="bigin-kpi-sub">
              Cont {est.contingency_pct}% • Esc {est.escalation_pct}%
            </span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Total Cost Baseline</span>
            <span className="bigin-kpi-val" style={{ color: "#334155" }}>
              {fmt(totalCost)} SAR
            </span>
            <span className="bigin-kpi-sub">Contractual QS cost benchmark</span>
          </div>

          <div className="bigin-kpi-item primary">
            <span className="bigin-kpi-label">Commercial Sell Total</span>
            <span className="bigin-kpi-val" style={{ color: "#0ba360" }}>
              {fmt(sellTotal)} SAR
            </span>
            <span className="bigin-kpi-sub">
              Markup +{est.margin_pct}% • Profit {fmt(grossProfit)} SAR
            </span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Profit Margin Spread</span>
            <span
              className="bigin-kpi-val"
              style={{
                color: marginPct >= 12 ? "#0ba360" : marginPct >= 8 ? "#d97706" : "#e11d48",
              }}
            >
              {marginPct.toFixed(1)}%
            </span>
            <span className="bigin-kpi-sub">Effective Gross Margin</span>
          </div>
        </div>
      </div>

      {/* 4. SHEET TABS NAVIGATION */}
      <div style={{ padding: "16px 24px 0" }}>
        <div className="bigin-sheet-tabs">
          <button
            type="button"
            className={`bigin-tab-pill ${sec === "items" ? "active" : ""}`}
            onClick={() => setSec("items")}
          >
            Takeoff Line Items ({est.items?.length || 0})
          </button>
          <button
            type="button"
            className={`bigin-tab-pill ${sec === "parameters" ? "active" : ""}`}
            onClick={() => setSec("parameters")}
          >
            Commercial Parameters & Markups
          </button>
          <button
            type="button"
            className={`bigin-tab-pill ${sec === "breakdown" ? "active" : ""}`}
            onClick={() => setSec("breakdown")}
          >
            Cost Breakdown & Resource Analysis
          </button>
        </div>
      </div>

      {/* 5. ACTIVE TAB CONTENT */}
      <div style={{ padding: "16px 24px 0" }}>
        {/* TAB 1: TAKEOFF LINE ITEMS */}
        {sec === "items" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                  Bill of Quantities & Measurement Takeoff
                </h3>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  Detailed itemized build-up categorized by division and resource structure
                </span>
              </div>

              {editable && (
                <button
                  type="button"
                  className="btn"
                  style={{
                    background: "#0ba360",
                    borderColor: "#0ba360",
                    color: "#fff",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onClick={openAddItem}
                >
                  <span>+</span> Add Takeoff Line Item
                </button>
              )}
            </div>

            {divisionList.length === 0 ? (
              <div
                className="card"
                style={{
                  padding: 40,
                  textAlign: "center",
                  background: "#fff",
                  border: "1px dashed #cbd5e1",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>
                  No takeoff line items registered yet
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, marginBottom: 16 }}>
                  Start adding quantified line items, material rates, and labour heads.
                </div>
                {editable && (
                  <button type="button" className="btn sm" onClick={openAddItem}>
                    + Add First Line Item
                  </button>
                )}
              </div>
            ) : (
              divisionList.map((divGroup) => (
                <div
                  key={divGroup.name}
                  className="table-wrap"
                  style={{
                    marginBottom: 20,
                    background: "#fff",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    overflow: "hidden",
                  }}
                >
                  {/* Division Header Banner */}
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#0ba360",
                          display: "inline-block",
                        }}
                      />
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a" }}>
                        {divGroup.name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "#64748b",
                          background: "#e2e8f0",
                          padding: "1px 6px",
                          borderRadius: 4,
                          fontWeight: 600,
                        }}
                      >
                        {divGroup.items.length} items
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: "#475569", display: "flex", gap: 16 }}>
                      <span>
                        Cost: <b style={{ color: "#0f172a" }}>{fmt(divGroup.totalCost)} SAR</b>
                      </span>
                      <span>
                        Sell: <b style={{ color: "#0ba360" }}>{fmt(divGroup.totalSell)} SAR</b>
                      </span>
                    </div>
                  </div>

                  {/* Division Line Items Table */}
                  <table className="tbl" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: "32%" }}>Item Description</th>
                        <th>Resource</th>
                        <th>Unit</th>
                        <th style={{ textAlign: "right" }}>Quantity</th>
                        <th style={{ textAlign: "right" }}>Unit Cost</th>
                        <th style={{ textAlign: "right" }}>Total Cost</th>
                        <th style={{ textAlign: "right" }}>Unit Sell</th>
                        <th style={{ textAlign: "right" }}>Total Sell</th>
                        {editable && <th style={{ width: 80, textAlign: "center" }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {divGroup.items.map((it) => (
                        <tr key={it.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: "#0f172a" }}>{it.description}</div>
                            {(it.material_rate > 0 || it.labor_rate > 0 || it.equipment_rate > 0) && (
                              <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2 }}>
                                Mat: {fmt(it.material_rate)} • Lab: {fmt(it.labor_rate)} • Eqp: {fmt(it.equipment_rate)}
                              </div>
                            )}
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background:
                                  it.resource_type === "Material"
                                    ? "#e0f2fe"
                                    : it.resource_type === "Labor"
                                    ? "#fef3c7"
                                    : it.resource_type === "Equipment"
                                    ? "#ede9fe"
                                    : "#f1f5f9",
                                color:
                                  it.resource_type === "Material"
                                    ? "#0369a1"
                                    : it.resource_type === "Labor"
                                    ? "#b45309"
                                    : it.resource_type === "Equipment"
                                    ? "#6d28d9"
                                    : "#475569",
                              }}
                            >
                              {it.resource_type || "Mixed"}
                            </span>
                          </td>
                          <td style={{ fontWeight: 500, color: "#475569" }}>{it.unit}</td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>{fmt(it.quantity, 2)}</td>
                          <td style={{ textAlign: "right" }}>{fmt(it.unit_cost, 2)}</td>
                          <td style={{ textAlign: "right", fontWeight: 600, color: "#334155" }}>
                            {fmt(it.total_cost, 2)}
                          </td>
                          <td style={{ textAlign: "right" }}>{fmt(it.unit_sell, 2)}</td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "#0ba360" }}>
                            {fmt(it.total_sell, 2)}
                          </td>
                          {editable && (
                            <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                              <button
                                type="button"
                                className="btn ghost sm"
                                style={{ padding: "2px 6px", fontSize: 11, marginRight: 4 }}
                                onClick={() => openEditItem(it)}
                                title="Edit Item"
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                className="btn ghost sm"
                                style={{ padding: "2px 6px", fontSize: 11, color: "#e11d48" }}
                                onClick={() => deleteLineItem(it.id)}
                                title="Delete Item"
                              >
                                ×
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: COMMERCIAL PARAMETERS & MARKUPS */}
        {sec === "parameters" && (
          <div className="card" style={{ maxWidth: 840, background: "#fff", padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                Commercial Factors & Risk Contingency Setup
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                Adjusting these multipliers automatically re-totals the estimation cost baseline and commercial sell prices.
              </p>
            </div>

            <form onSubmit={saveParameters}>
              <div
                className="bigin-form-grid"
                style={{ gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}
              >
                <div className="bigin-form-field">
                  <label>General Site & Head Office Overhead (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="bigin-input"
                    value={paramForm.overhead_pct}
                    onChange={(e) => setParamForm({ ...paramForm, overhead_pct: e.target.value })}
                    disabled={!editable}
                  />
                  <span style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    Applied directly to Base Direct Cost (Material, Labor, Plant, Subcontract).
                  </span>
                </div>

                <div className="bigin-form-field">
                  <label>Unforeseen Risk Contingency (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="bigin-input"
                    value={paramForm.contingency_pct}
                    onChange={(e) => setParamForm({ ...paramForm, contingency_pct: e.target.value })}
                    disabled={!editable}
                  />
                  <span style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    Buffer for scope anomalies and site condition risks.
                  </span>
                </div>

                <div className="bigin-form-field">
                  <label>Market Price Escalation (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="bigin-input"
                    value={paramForm.escalation_pct}
                    onChange={(e) => setParamForm({ ...paramForm, escalation_pct: e.target.value })}
                    disabled={!editable}
                  />
                  <span style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    Hedging against commodity and inflation rate hikes over execution duration.
                  </span>
                </div>

                <div className="bigin-form-field">
                  <label>Commercial Profit Margin Markup (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="bigin-input"
                    value={paramForm.margin_pct}
                    onChange={(e) => setParamForm({ ...paramForm, margin_pct: e.target.value })}
                    disabled={!editable}
                  />
                  <span style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    Added on top of Total Cost to generate the final Commercial Tender quotation.
                  </span>
                </div>
              </div>

              {editable ? (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="submit"
                    className="btn"
                    style={{ background: "#0ba360", borderColor: "#0ba360", color: "#fff", fontWeight: 600 }}
                    disabled={busy}
                  >
                    {busy ? "Recalculating..." : "✓ Save & Recompute Takeoff"}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      setParamForm({
                        overhead_pct: est.overhead_pct ?? 5,
                        contingency_pct: est.contingency_pct ?? 5,
                        escalation_pct: est.escalation_pct ?? 0,
                        margin_pct: est.margin_pct ?? 12,
                      });
                    }}
                  >
                    Reset Changes
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  Parameters are locked because this estimation is in <b>{est.status}</b> stage.
                </div>
              )}
            </form>
          </div>
        )}

        {/* TAB 3: COST BREAKDOWN & RESOURCE ANALYSIS */}
        {sec === "breakdown" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Direct Cost Distribution */}
            <div className="card" style={{ background: "#fff", padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                Direct Cost Heads Distribution
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {buildRows.map((r) => {
                  const pct = baseDirect > 0 ? (r.val / baseDirect) * 100 : 0;
                  return (
                    <div key={r.label}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12.5,
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ color: "#334155" }}>{r.label}</span>
                        <span style={{ color: "#0f172a" }}>
                          {fmt(r.val)} SAR <span style={{ color: "#94a3b8", fontWeight: 400 }}>({pct.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: r.color,
                            borderRadius: 4,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                <div
                  style={{
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: 12,
                    marginTop: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 700,
                    fontSize: 13.5,
                  }}
                >
                  <span>Base Direct Cost Total:</span>
                  <span style={{ color: "#0ba360" }}>{fmt(baseDirect)} SAR</span>
                </div>
              </div>
            </div>

            {/* Commercial Multiplier Waterfall */}
            <div className="card" style={{ background: "#fff", padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                Commercial Pricing Waterfall
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                  <span style={{ color: "#64748b" }}>1. Base Direct Cost (M+L+E+S)</span>
                  <span style={{ fontWeight: 600 }}>{fmt(baseDirect)} SAR</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                  <span style={{ color: "#64748b" }}>2. General Overhead (+{est.overhead_pct}%)</span>
                  <span style={{ fontWeight: 600, color: "#0284c7" }}>+{fmt(ohAmt)} SAR</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    background: "#f8fafc",
                    borderRadius: 4,
                    paddingLeft: 8,
                    paddingRight: 8,
                    fontWeight: 600,
                  }}
                >
                  <span>Direct Cost + OH</span>
                  <span>{fmt(directPlusOh)} SAR</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                  <span style={{ color: "#64748b" }}>3. Risk Contingency (+{est.contingency_pct}%)</span>
                  <span style={{ fontWeight: 600, color: "#d97706" }}>+{fmt(contAmt)} SAR</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                  <span style={{ color: "#64748b" }}>4. Price Escalation (+{est.escalation_pct}%)</span>
                  <span style={{ fontWeight: 600, color: "#8b5cf6" }}>+{fmt(escAmt)} SAR</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: 6,
                    fontWeight: 700,
                    color: "#1e3a8a",
                  }}
                >
                  <span>Total Cost Baseline:</span>
                  <span>{fmt(totalCost)} SAR</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                  <span style={{ color: "#64748b" }}>5. Profit Margin Markup (+{est.margin_pct}%)</span>
                  <span style={{ fontWeight: 600, color: "#0ba360" }}>+{fmt(grossProfit)} SAR</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 6,
                    fontWeight: 800,
                    fontSize: 15,
                    color: "#166534",
                  }}
                >
                  <span>Final Commercial Sell Total:</span>
                  <span>{fmt(sellTotal)} SAR</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. SLIDE-OUT DRAWER FOR ADDING / EDITING TAKEOFF LINE ITEM */}
      {showItemDrawer && (
        <div className="bigin-drawer-overlay" onClick={() => setShowItemDrawer(false)}>
          <div className="bigin-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="bigin-drawer-head">
              <div className="bigin-drawer-title-wrap">
                <span className="badge InProgress">{editItemId ? "Edit Item" : "New Item"}</span>
                <div>
                  <h3 className="bigin-drawer-title">
                    {editItemId ? "Modify Takeoff Item" : "Add Takeoff Line Item"}
                  </h3>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>
                    Configure BOQ description, rates, unit, and division allocation
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="bigin-drawer-close"
                onClick={() => setShowItemDrawer(false)}
                aria-label="Close drawer"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={saveLineItem}
              style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}
            >
              <div className="bigin-drawer-body">
                {/* Section 1: Item Specification */}
                <div className="bigin-form-section">
                  <div className="bigin-form-section-title">
                    <span className="dot" />
                    <span>Item Specification</span>
                  </div>
                  <div className="bigin-form-grid" style={{ gridTemplateColumns: "1fr" }}>
                    <div className="bigin-form-field">
                      <label>
                        Description & Scope <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        className="bigin-input"
                        value={itemForm.description}
                        onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                        placeholder="e.g. C35 Ready-mix concrete pouring for foundation rafts"
                        required
                      />
                    </div>
                  </div>

                  <div className="bigin-form-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
                    <div className="bigin-form-field">
                      <label>Work Division / Package</label>
                      <input
                        type="text"
                        className="bigin-input"
                        value={itemForm.division}
                        onChange={(e) => setItemForm({ ...itemForm, division: e.target.value })}
                        placeholder="e.g. 03 - Concrete Works"
                      />
                    </div>

                    <div className="bigin-form-field">
                      <label>Resource Classification</label>
                      <select
                        className="bigin-input"
                        value={itemForm.resource_type}
                        onChange={(e) => setItemForm({ ...itemForm, resource_type: e.target.value })}
                      >
                        {RESOURCE_TYPES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bigin-form-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
                    <div className="bigin-form-field">
                      <label>Unit of Measurement</label>
                      <select
                        className="bigin-input"
                        value={itemForm.unit}
                        onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="bigin-form-field">
                      <label>Takeoff Quantity</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        className="bigin-input"
                        value={itemForm.quantity}
                        onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Rate Analysis & Unit Build-up */}
                <div className="bigin-form-section" style={{ marginTop: 20 }}>
                  <div className="bigin-form-section-title">
                    <span className="dot" />
                    <span>Unit Rate Breakdown (Optional Detailed Rates)</span>
                  </div>
                  <div
                    className="bigin-form-grid"
                    style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}
                  >
                    <div className="bigin-form-field">
                      <label>Material Rate</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="bigin-input"
                        value={itemForm.material_rate}
                        onChange={(e) => handleItemRateChange("material_rate", e.target.value)}
                      />
                    </div>

                    <div className="bigin-form-field">
                      <label>Labor Rate</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="bigin-input"
                        value={itemForm.labor_rate}
                        onChange={(e) => handleItemRateChange("labor_rate", e.target.value)}
                      />
                    </div>

                    <div className="bigin-form-field">
                      <label>Equipment Rate</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="bigin-input"
                        value={itemForm.equipment_rate}
                        onChange={(e) => handleItemRateChange("equipment_rate", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Final Pricing */}
                <div className="bigin-form-section" style={{ marginTop: 20 }}>
                  <div className="bigin-form-section-title">
                    <span className="dot" />
                    <span>Final Unit Cost & Sell Rates</span>
                  </div>
                  <div className="bigin-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div className="bigin-form-field">
                      <label>Unit Cost (SAR)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="bigin-input"
                        value={itemForm.unit_cost}
                        onChange={(e) => setItemForm({ ...itemForm, unit_cost: e.target.value })}
                        required
                      />
                      <span style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        Total Cost: {fmt(Number(itemForm.quantity || 0) * Number(itemForm.unit_cost || 0))} SAR
                      </span>
                    </div>

                    <div className="bigin-form-field">
                      <label>Unit Sell Rate (SAR)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="bigin-input"
                        value={itemForm.unit_sell}
                        onChange={(e) => setItemForm({ ...itemForm, unit_sell: e.target.value })}
                        required
                      />
                      <span style={{ fontSize: 11, color: "#0ba360", marginTop: 2 }}>
                        Total Sell: {fmt(Number(itemForm.quantity || 0) * Number(itemForm.unit_sell || 0))} SAR
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pinned Bottom Action Footer */}
              <div className="bigin-drawer-foot">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setShowItemDrawer(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{
                    background: "#0ba360",
                    borderColor: "#0ba360",
                    color: "#fff",
                    fontWeight: 600,
                  }}
                  disabled={busy}
                >
                  {busy ? "Saving..." : editItemId ? "✓ Update Item" : "✓ Add Takeoff Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
