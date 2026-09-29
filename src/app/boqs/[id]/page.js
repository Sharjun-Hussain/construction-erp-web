"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const BOQ_STAGES = [
  { key: "Draft", label: "1. Draft", desc: "Pricing & Takeoff" },
  { key: "Submitted", label: "2. Submitted", desc: "Commercial Review" },
  { key: "Approved", label: "3. Approved Baseline", desc: "Authorized for Execution & IPC" },
  { key: "Revised", label: "4. Revised", desc: "Superseded Revision" },
];

const STANDARD_DIVISIONS = [
  "Division 01 - General Requirements",
  "Division 02 - Existing Conditions & Sitework",
  "Division 03 - Concrete Works",
  "Division 04 - Masonry Works",
  "Division 05 - Metals & Structural Steel",
  "Division 06 - Wood, Plastics & Composites",
  "Division 07 - Thermal & Moisture Protection",
  "Division 08 - Openings, Doors & Windows",
  "Division 09 - Finishes, Plaster & Tiles",
  "Division 10 - Specialties",
  "Division 11 - Equipment",
  "Division 12 - Furnishings",
  "Division 21 - Fire Suppression",
  "Division 22 - Plumbing Works",
  "Division 23 - HVAC Works",
  "Division 26 - Electrical Works",
];

export default function BoqDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { lang } = useAppStore();

  const [boq, setBoq] = useState(null);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [sec, setSec] = useState("items"); // 'items' | 'cost' | 'revisions' | 'history'

  // Item search & filter state
  const [itemSearch, setItemSearch] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("");
  const [collapsedDivs, setCollapsedDivs] = useState({});

  // Line item add / edit state
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showImportDrawer, setShowImportDrawer] = useState(false);
  const [itemForm, setItemForm] = useState({
    line_no: "",
    description: "",
    unit: "M3",
    quantity: 1,
    unit_rate: 0,
    cost_rate: 0,
    division: "Division 03 - Concrete Works",
  });
  const [editId, setEditId] = useState(null);
  const [editRow, setEditRow] = useState({});

  // Revisions & Comparison state
  const [revs, setRevs] = useState([]);
  const [cmp, setCmp] = useState(null);
  const [cmpFrom, setCmpFrom] = useState("");
  const [cmpTo, setCmpTo] = useState("");
  const [hist, setHist] = useState([]);
  const [cc, setCc] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadData = () => {
    api
      .get("/boqs/" + id)
      .then((r) => setBoq(r.data.data))
      .catch(() => {});
    api
      .get("/boqs/" + id + "/cost-control")
      .then((r) => setCc(r.data.data))
      .catch(() => {});
    api
      .get("/boqs/" + id + "/revisions")
      .then((r) => setRevs(r.data.data || []))
      .catch(() => {});
    api
      .get("/boqs/" + id + "/history")
      .then((r) => setHist(r.data.data || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const act = async (fn, okMsg) => {
    setMsg("");
    setOk("");
    setBusy(true);
    try {
      await fn();
      if (okMsg) setOk(okMsg);
      loadData();
    } catch (e) {
      setMsg(e?.response?.data?.message || "Operation failed");
    } finally {
      setBusy(false);
    }
  };

  const editable = boq && ["Draft", "Submitted"].includes(boq.status);

  // Transitions
  const handleTransition = (newStatus) => {
    if (!window.confirm(`Move BOQ lifecycle stage to "${newStatus}"?`)) return;
    act(() => api.post(`/boqs/${id}/transition`, { status: newStatus }), `BOQ moved to ${newStatus}`);
  };

  // Add Item
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!itemForm.description) return;
    act(
      () =>
        api.post(`/boqs/${id}/items`, {
          ...itemForm,
          quantity: Number(itemForm.quantity || 0),
          unit_rate: Number(itemForm.unit_rate || 0),
          cost_rate: Number(itemForm.cost_rate || 0),
        }),
      "Item added to BOQ"
    ).then(() => {
      setItemForm((prev) => ({
        ...prev,
        line_no: "",
        description: "",
        quantity: 1,
        unit_rate: 0,
        cost_rate: 0,
      }));
      setShowAddDrawer(false);
    });
  };

  // Inline edit save
  const handleSaveEdit = (it) => {
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
  };

  // Delete line item
  const handleDeleteItem = (it) => {
    if (window.confirm(`Delete line ${it.line_no} (${it.description})?`)) {
      act(() => api.delete(`/boqs/${id}/items/${it.id}`), "Line item deleted");
    }
  };

  // Excel Import into current BOQ
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("boq_id", id);
      const r = await api.post("/boqs/import", fd);
      setOk(r.data.message || "Items imported successfully");
      setShowImportDrawer(false);
      loadData();
    } catch (err) {
      setMsg(err?.response?.data?.message || "Import failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  // Export XLSX
  const handleExport = async () => {
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

  // Bill remaining to IPC
  const handleBill = () => {
    if (window.confirm("Draft an IPC invoice for unbilled work in this approved BOQ?")) {
      act(() => api.post(`/boqs/${id}/bill`, {}), "IPC Draft Invoice created");
    }
  };

  // New revision
  const handleNewRevision = () => {
    if (window.confirm(`Create a new revision R${boq.revision + 1} from this approved baseline?`)) {
      act(() => api.post(`/boqs/${id}/new-revision`, {}), "New revision created");
    }
  };

  // Compare revisions
  const handleRunCompare = () => {
    if (!cmpFrom || !cmpTo) return;
    api
      .get(`/boqs/compare?from=${cmpFrom}&to=${cmpTo}`)
      .then((r) => setCmp(r.data.data))
      .catch(() => {});
  };

  // Toggle division collapse
  const toggleDiv = (div) => {
    setCollapsedDivs((prev) => ({ ...prev, [div]: !prev[div] }));
  };

  // Filtered Items & Divisions
  const allItems = boq?.items || [];
  const filteredItems = useMemo(() => {
    return allItems.filter((i) => {
      if (divisionFilter && i.division !== divisionFilter) return false;
      if (!itemSearch) return true;
      const s = itemSearch.toLowerCase();
      return (
        String(i.line_no || "").toLowerCase().includes(s) ||
        String(i.description || "").toLowerCase().includes(s) ||
        String(i.division || "").toLowerCase().includes(s)
      );
    });
  }, [allItems, itemSearch, divisionFilter]);

  // Group by division
  const groups = useMemo(() => {
    const map = {};
    filteredItems.forEach((i) => {
      const d = i.division || "General / Unassigned";
      (map[d] = map[d] || []).push(i);
    });
    return map;
  }, [filteredItems]);

  const uniqueDivisions = useMemo(() => {
    const set = new Set();
    allItems.forEach((i) => {
      if (i.division) set.add(i.division);
    });
    return Array.from(set);
  }, [allItems]);

  // Financial Calculations
  const totalSelling = Number(boq?.total_amount || 0);
  const totalCost = allItems.reduce(
    (acc, i) => acc + Number(i.quantity || 0) * Number(i.cost_rate || 0),
    0
  );
  const totalMargin = totalSelling - totalCost;
  const marginPct = totalSelling > 0 ? ((totalMargin / totalSelling) * 100).toFixed(1) : 0;
  const totalBilledVal = allItems.reduce(
    (acc, i) => acc + Number(i.billed_qty || 0) * Number(i.unit_rate || 0),
    0
  );
  const billedPct = totalSelling > 0 ? Math.min(100, Math.round((totalBilledVal / totalSelling) * 100)) : 0;

  if (!boq) {
    return (
      <div className="projects-page" style={{ padding: 32, textAlign: "center" }}>
        <div style={{ color: "#64748b", fontSize: 14 }}>Loading BOQ Workspace...</div>
      </div>
    );
  }

  return (
    <div className="projects-page">
      {/* 1. TOP HEADER WORKSPACE BAR */}
      <div
        style={{
          padding: "16px 24px",
          background: "#ffffff",
          borderBottom: "1px solid #edf2f7",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* Left: Back button + Title + Revision + Project context */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => router.push("/boqs")}
            style={{ padding: "5px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            ← All BOQs
          </button>
          <div style={{ width: 1, height: 22, background: "#e2e8f0" }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                {boq.number}
              </h2>
              <span
                style={{
                  background: "#f0fdf4",
                  color: "#0ba360",
                  fontWeight: 800,
                  fontSize: 11.5,
                  padding: "2px 8px",
                  borderRadius: 6,
                  border: "1px solid #bbf7d0",
                }}
              >
                R{boq.revision || 1}
              </span>
              <span className={"badge " + boq.status}>{boq.status}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748b", marginTop: 3 }}>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>{boq.project?.name || "Project"}</span>
              {boq.project?.code && <span>({boq.project.code})</span>}
              <span>·</span>
              <span>{boq.title}</span>
              {boq.title_ar && (
                <>
                  <span>·</span>
                  <span dir="rtl">{boq.title_ar}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {boq.status === "Approved" && (
            <>
              <button
                type="button"
                className="btn ghost sm"
                disabled={busy}
                onClick={handleNewRevision}
                title="Create a new revision R2"
              >
                + New Revision (R{boq.revision + 1})
              </button>
              <button
                type="button"
                className="btn sm"
                disabled={busy}
                onClick={handleBill}
                title="Generate IPC invoice"
              >
                ⚡ Bill via IPC
              </button>
            </>
          )}

          <button
            type="button"
            className="btn ghost sm"
            onClick={handleExport}
            title="Download formatted Excel spreadsheet"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            Export XLSX
          </button>
        </div>
      </div>

      {msg && (
        <div className="alert err" style={{ margin: "0 24px 14px" }} onClick={() => setMsg("")}>
          {msg}
        </div>
      )}
      {ok && (
        <div className="alert ok" style={{ margin: "0 24px 14px" }} onClick={() => setOk("")}>
          {ok}
        </div>
      )}

      {/* 2. TRANQUIL LIFECYCLE STAGE PIPELINE */}
      <div className="tranquil-lifecycle-bar" style={{ margin: "0 24px 16px" }}>
        {BOQ_STAGES.map((st, idx) => {
          const currentIdx = BOQ_STAGES.findIndex((s) => s.key === boq.status);
          const isCurrent = boq.status === st.key;
          const isPassed = currentIdx > idx;
          return (
            <button
              key={st.key}
              type="button"
              disabled={busy}
              className={"tranquil-stage-step" + (isCurrent ? " current" : "") + (isPassed ? " passed" : "")}
              onClick={() => handleTransition(st.key)}
              title={`Click to transition BOQ status to: ${st.label} (${st.desc})`}
            >
              <span className="step-num">{isPassed ? "✓" : idx + 1}</span>
              <span className="step-text">{st.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. BIGIN COMMERCIAL KPI BANNER */}
      <div style={{ padding: "0 24px 16px" }}>
        <div className="bigin-kpi-banner">
          <div className="bigin-kpi-item primary">
            <span className="bigin-kpi-label">Contract Selling Value</span>
            <span className="bigin-kpi-val">{fmt(totalSelling)} SAR</span>
            <span className="bigin-kpi-sub">{allItems.length} schedule line items</span>
          </div>
          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Planned Cost Budget</span>
            <span className="bigin-kpi-val" style={{ color: "#d97706" }}>
              {fmt(totalCost)} SAR
            </span>
            <span className="bigin-kpi-sub">Benchmark rate estimation</span>
          </div>
          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Projected Margin</span>
            <span
              className="bigin-kpi-val"
              style={{
                color:
                  totalMargin >= 0 && Number(marginPct) >= 10
                    ? "#0ba360"
                    : totalMargin >= 0
                    ? "#d97706"
                    : "#dc2626",
              }}
            >
              {fmt(totalMargin)} SAR
            </span>
            <span
              className="bigin-kpi-sub"
              style={{ fontWeight: 700, color: totalMargin >= 0 ? "#0ba360" : "#dc2626" }}
            >
              {marginPct}% Gross Margin
            </span>
          </div>
          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">IPC Certified Billed</span>
            <span className="bigin-kpi-val">{fmt(totalBilledVal)} SAR</span>
            <span className="bigin-kpi-sub">{billedPct}% certified work</span>
          </div>
          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Trade Divisions</span>
            <span className="bigin-kpi-val">{uniqueDivisions.length} Divisions</span>
            <span className="bigin-kpi-sub">MasterFormat hierarchy</span>
          </div>
        </div>
      </div>

      {/* 4. BIGIN SECTION TABS */}
      <div className="bigin-sheet-tabs" style={{ margin: "0 0 16px" }}>
        {[
          { id: "items", label: `1. Schedule of Quantities (${allItems.length})` },
          { id: "cost", label: "2. Cost Control & Margins" },
          { id: "revisions", label: `3. Revision History & Audit Diff (${revs.length})` },
          { id: "history", label: `4. Audit Trail (${hist.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={"bigin-tab-pill" + (sec === tab.id ? " active" : "")}
            onClick={() => setSec(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 5. TAB CONTENTS */}
      <div style={{ padding: "0 24px 24px" }}>
        {sec === "items" && (
          <div>
            {/* Integrated Toolbar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 16,
                padding: "8px 12px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: 260 }}>
                <input
                  className="input"
                  style={{ maxWidth: 320, padding: "6px 12px", fontSize: 12.5 }}
                  placeholder="Search line items by number, description..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />

                <select
                  className="input"
                  style={{ maxWidth: 240, padding: "6px 12px", fontSize: 12.5 }}
                  value={divisionFilter}
                  onChange={(e) => setDivisionFilter(e.target.value)}
                >
                  <option value="">All Divisions ({uniqueDivisions.length})</option>
                  {uniqueDivisions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                {(itemSearch || divisionFilter) && (
                  <button
                    className="btn ghost sm"
                    onClick={() => {
                      setItemSearch("");
                      setDivisionFilter("");
                    }}
                    style={{ fontSize: 12, padding: "4px 8px" }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {editable && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => setShowImportDrawer(true)}
                  >
                    Import Excel
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => setShowAddDrawer(true)}
                  >
                    + Line Item
                  </button>
                </div>
              )}
            </div>

            {/* Empty State */}
            {Object.keys(groups).length === 0 ? (
              <div
                style={{
                  padding: 48,
                  textAlign: "center",
                  border: "1px dashed #e2e8f0",
                  borderRadius: 10,
                  background: "#f8fafc",
                }}
              >
                <div style={{ fontSize: 32 }}>📑</div>
                <div style={{ fontWeight: 750, fontSize: 15, marginTop: 10, color: "#0f172a" }}>
                  {itemSearch || divisionFilter ? "No line items matching your search" : "No items in this BOQ schedule yet"}
                </div>
                <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 4, maxWidth: 460, marginInline: "auto" }}>
                  {itemSearch || divisionFilter
                    ? "Try adjusting your search criteria or resetting filters."
                    : "Add your first manual trade item or upload an existing Excel spreadsheet."}
                </div>
                {editable && !itemSearch && !divisionFilter && (
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
                    <button className="btn sm" onClick={() => setShowAddDrawer(true)}>
                      + Add Line Item
                    </button>
                    <button className="btn ghost sm" onClick={() => setShowImportDrawer(true)}>
                      Import Excel
                    </button>
                  </div>
                )}
              </div>
            ) : (
              Object.entries(groups).map(([div, lines]) => {
                const isCollapsed = collapsedDivs[div];
                const divSelling = lines.reduce((acc, i) => acc + Number(i.amount || 0), 0);
                const divCost = lines.reduce(
                  (acc, i) => acc + Number(i.quantity || 0) * Number(i.cost_rate || 0),
                  0
                );
                const divMargin = divSelling - divCost;
                const divMarginPct = divSelling > 0 ? ((divMargin / divSelling) * 100).toFixed(1) : 0;

                return (
                  <div
                    key={div}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      marginBottom: 16,
                      overflow: "hidden",
                      background: "#ffffff",
                    }}
                  >
                    {/* Division Header Accordion */}
                    <div
                      onClick={() => toggleDiv(div)}
                      style={{
                        padding: "10px 16px",
                        background: "#f8fafc",
                        borderBottom: isCollapsed ? "none" : "1px solid #e2e8f0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>
                          {isCollapsed ? "▶" : "▼"}
                        </span>
                        <span style={{ fontWeight: 750, fontSize: 13.5, color: "#0f172a" }}>
                          {div}
                        </span>
                        <span className="badge neutral sm">{lines.length} item(s)</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12.5 }}>
                        <span style={{ color: "#64748b" }}>
                          Cost: <b>{fmt(divCost)} SAR</b>
                        </span>
                        <span style={{ color: "#0ba360", fontWeight: 750 }}>
                          Selling: {fmt(divSelling)} SAR
                        </span>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: divMargin >= 0 ? "#0ba360" : "#dc2626",
                          }}
                        >
                          ({divMarginPct}% margin)
                        </span>
                      </div>
                    </div>

                    {/* Division Items Table */}
                    {!isCollapsed && (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                          <thead>
                            <tr
                              style={{
                                background: "#ffffff",
                                textAlign: "left",
                                borderBottom: "1px solid #e2e8f0",
                                color: "#64748b",
                                fontSize: 11.5,
                                textTransform: "uppercase",
                                letterSpacing: "0.03em",
                              }}
                            >
                              <th style={{ padding: "8px 12px", width: "95px" }}>Item #</th>
                              <th style={{ padding: "8px 12px" }}>Description</th>
                              <th style={{ padding: "8px 10px", width: "65px" }}>Unit</th>
                              <th style={{ padding: "8px 10px", textAlign: "right", width: "95px" }}>
                                Quantity
                              </th>
                              <th style={{ padding: "8px 10px", textAlign: "right", width: "115px" }}>
                                Rate (SAR)
                              </th>
                              <th style={{ padding: "8px 10px", textAlign: "right", width: "115px" }}>
                                Cost Rate
                              </th>
                              <th style={{ padding: "8px 12px", textAlign: "right", width: "130px" }}>
                                Amount (SAR)
                              </th>
                              <th style={{ padding: "8px 10px", textAlign: "center", width: "80px" }}>
                                Margin
                              </th>
                              <th style={{ padding: "8px 10px", textAlign: "center", width: "85px" }}>
                                Progress
                              </th>
                              <th style={{ padding: "8px 10px", textAlign: "right", width: "90px" }}>
                                Billed
                              </th>
                              {editable && <th style={{ padding: "8px 12px", width: "75px" }}></th>}
                            </tr>
                          </thead>
                          <tbody>
                            {lines.map((i) => {
                              const isEditing = editId === i.id;
                              const sellingAmt = Number(i.amount || 0);
                              const costAmt = Number(i.quantity || 0) * Number(i.cost_rate || 0);
                              const itmMargin = sellingAmt - costAmt;
                              const itmMarginPct = sellingAmt > 0 ? ((itmMargin / sellingAmt) * 100).toFixed(0) : 0;
                              const progPct = i.quantity
                                ? Math.round((Number(i.progress_qty || 0) / Number(i.quantity)) * 100)
                                : 0;

                              return (
                                <tr key={i.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                  <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0ba360" }}>
                                    {i.line_no}
                                  </td>
                                  <td style={{ padding: "8px 12px" }}>
                                    {isEditing ? (
                                      <input
                                        className="input"
                                        style={{ padding: "4px 8px" }}
                                        value={editRow.description ?? i.description}
                                        onChange={(e) =>
                                          setEditRow({ ...editRow, description: e.target.value })
                                        }
                                      />
                                    ) : (
                                      <div style={{ fontWeight: 500, color: "#0f172a" }}>{i.description}</div>
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
                                        style={{ padding: "4px 8px", textAlign: "right" }}
                                        value={editRow.quantity ?? i.quantity}
                                        onChange={(e) =>
                                          setEditRow({ ...editRow, quantity: e.target.value })
                                        }
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
                                        style={{ padding: "4px 8px", textAlign: "right" }}
                                        value={editRow.unit_rate ?? i.unit_rate}
                                        onChange={(e) =>
                                          setEditRow({ ...editRow, unit_rate: e.target.value })
                                        }
                                      />
                                    ) : (
                                      fmt(i.unit_rate)
                                    )}
                                  </td>
                                  <td style={{ padding: "8px 10px", textAlign: "right", color: "#64748b" }}>
                                    {isEditing ? (
                                      <input
                                        className="input"
                                        type="number"
                                        step="any"
                                        style={{ padding: "4px 8px", textAlign: "right" }}
                                        value={editRow.cost_rate ?? i.cost_rate}
                                        onChange={(e) =>
                                          setEditRow({ ...editRow, cost_rate: e.target.value })
                                        }
                                      />
                                    ) : (
                                      fmt(i.cost_rate)
                                    )}
                                  </td>
                                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 750, color: "#0f172a" }}>
                                    {fmt(i.amount)}
                                  </td>
                                  <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: itmMargin < 0 ? "#dc2626" : "#0ba360",
                                      }}
                                    >
                                      {itmMarginPct}%
                                    </span>
                                  </td>
                                  <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                    <span
                                      className={`badge ${
                                        progPct >= 100 ? "Won" : progPct > 0 ? "Pending" : "neutral"
                                      } sm`}
                                    >
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
                                          <button
                                            className="btn sm"
                                            style={{ padding: "2px 6px" }}
                                            onClick={() => handleSaveEdit(i)}
                                            title="Save edit"
                                          >
                                            ✓
                                          </button>
                                          <button
                                            className="btn ghost sm"
                                            style={{ padding: "2px 6px" }}
                                            onClick={() => setEditId(null)}
                                            title="Cancel edit"
                                          >
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
                                            style={{ color: "#dc2626", padding: "2px 6px" }}
                                            onClick={() => handleDeleteItem(i)}
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
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* COST CONTROL & MARGINS TAB */}
        {sec === "cost" && (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, background: "#ffffff", overflow: "hidden" }}>
            <div
              style={{
                padding: "12px 16px",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                fontWeight: 700,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ color: "#0f172a" }}>QS Cost vs Selling Breakdown & Margins</span>
              <span style={{ fontSize: 11.5, color: "#64748b", fontWeight: 500 }}>
                Loss-leader and negative-margin items highlighted
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "#ffffff", textAlign: "left", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: 11.5, textTransform: "uppercase" }}>
                    <th style={{ padding: "8px 12px" }}>Line</th>
                    <th style={{ padding: "8px 12px" }}>Description</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Selling Total (SAR)</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Cost Basis (SAR)</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Gross Margin (SAR)</th>
                    <th style={{ padding: "8px 12px", textAlign: "center" }}>Margin %</th>
                    <th style={{ padding: "8px 12px", textAlign: "center" }}>Progress</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Unbilled WIP</th>
                  </tr>
                </thead>
                <tbody>
                  {(cc?.lines || []).map((r) => {
                    const isNeg = Number(r.margin || 0) < 0;
                    const pct = Number(r.amount || 0) > 0 ? ((Number(r.margin || 0) / Number(r.amount)) * 100).toFixed(1) : 0;
                    return (
                      <tr
                        key={r.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          background: isNeg ? "rgba(239, 68, 68, 0.04)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0ba360" }}>{r.line_no}</td>
                        <td style={{ padding: "8px 12px" }}>{r.description}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>{fmt(r.amount)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "#64748b" }}>{fmt(r.cost_amount)}</td>
                        <td
                          style={{
                            padding: "8px 12px",
                            textAlign: "right",
                            fontWeight: 750,
                            color: isNeg ? "#dc2626" : "#0ba360",
                          }}
                        >
                          {fmt(r.margin)}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                          <span className={`badge ${isNeg ? "Suspended" : "Active"} sm`}>
                            {pct}%
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                          <span className="badge neutral sm">{r.progress_pct}%</span>
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>
                          {fmt(r.to_bill_qty)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div
              style={{
                padding: 14,
                background: "#f8fafc",
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
                fontSize: 12.5,
                borderTop: "1px solid #e2e8f0",
              }}
            >
              {(cc?.divisions || []).map((d) => (
                <div
                  key={d.division}
                  style={{
                    padding: "6px 12px",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                  }}
                >
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
              <h4 style={{ margin: "0 0 10px", fontSize: 14 }}>
                Active Baseline: Revision {boq.revision} · {boq.status}
              </h4>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {(revs || []).map((r) => (
                  <button
                    key={r.id}
                    className={`btn ${r.id === boq.id ? "" : "ghost"} sm`}
                    onClick={() => router.push(`/boqs/${r.id}`)}
                    style={{ padding: "6px 14px", fontSize: 12.5 }}
                  >
                    Revision {r.revision} · {r.status} ({fmt(r.total_amount)} SAR)
                  </button>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <h4 style={{ margin: "0 0 10px", fontSize: 14 }}>Compare Revisions (Audit Diff)</h4>
              <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
                <div>
                  <label className="label">Baseline Revision</label>
                  <select className="select" value={cmpFrom} onChange={(e) => setCmpFrom(e.target.value)}>
                    <option value="">-- Baseline --</option>
                    {(revs || []).map((r) => (
                      <option key={r.id} value={r.id}>
                        Revision {r.revision} ({r.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Target Revision</label>
                  <select className="select" value={cmpTo} onChange={(e) => setCmpTo(e.target.value)}>
                    <option value="">-- Target Revision --</option>
                    {(revs || []).map((r) => (
                      <option key={r.id} value={r.id}>
                        Revision {r.revision} ({r.status})
                      </option>
                    ))}
                  </select>
                </div>
                <button className="btn sm" onClick={handleRunCompare} disabled={!cmpFrom || !cmpTo}>
                  Compare Differences
                </button>
              </div>

              {cmp && (
                <div style={{ marginTop: 16, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "8px 12px" }}>Line</th>
                        <th style={{ padding: "8px 12px" }}>Change Type</th>
                        <th style={{ padding: "8px 12px" }}>Before Baseline</th>
                        <th style={{ padding: "8px 12px" }}>After Revision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(cmp.diff || []).map((d, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 700 }}>{d.line_no}</td>
                          <td style={{ padding: "8px 12px" }}>
                            <span className="badge Pending sm">{d.change}</span>
                          </td>
                          <td style={{ padding: "8px 12px", color: "#64748b" }}>
                            {d.before ? `${fmt(d.before.quantity)} × ${fmt(d.before.unit_rate)} = ${fmt(d.before.amount)} SAR` : "—"}
                          </td>
                          <td style={{ padding: "8px 12px", fontWeight: 600, color: "#0f172a" }}>
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

        {/* AUDIT TRAIL TAB */}
        {sec === "history" && (
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>BOQ Audit Trail & Revision History</h4>
            <div className="feed">
              {(hist || []).map((h) => (
                <div key={h.id} className="feed-row" style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span className="feed-dot" style={{ background: "#0ba360" }} />
                  <span className="feed-tag badge Active sm">{h.action}</span>
                  <span className="feed-txt" style={{ marginInlineStart: 8, fontSize: 12.5 }}>
                    {h.detail || ""} · <b>{h.user_name || "System User"}</b>
                  </span>
                  <span className="feed-date" style={{ marginInlineStart: "auto", fontSize: 11.5, color: "#94a3b8" }}>
                    {h.created_at ? new Date(h.created_at).toLocaleString() : ""}
                  </span>
                </div>
              ))}
              {!(hist || []).length && <p style={{ color: "#94a3b8", fontSize: 13 }}>No audit records found.</p>}
            </div>
          </div>
        )}
      </div>

      {/* 6. ADD LINE ITEM DRAWER */}
      {showAddDrawer && (
        <div className="drawer-ov" onClick={() => setShowAddDrawer(false)}>
          <div
            className="drawer sheet-wide"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 800, width: "85vw" }}
          >
            <div className="drawer-h">
              <div>
                <h3>Add Line Item to Schedule</h3>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  Specify line numbering, trade division, engineering unit, and unit rate
                </span>
              </div>
              <button className="btn ghost sm" onClick={() => setShowAddDrawer(false)}>✕</button>
            </div>

            <form onSubmit={handleAddItem} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label className="label">Item / Line Number *</label>
                  <input
                    className="input"
                    placeholder="e.g. 03.10.01"
                    value={itemForm.line_no}
                    onChange={(e) => setItemForm({ ...itemForm, line_no: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">Division / Trade *</label>
                  <select
                    className="input"
                    value={itemForm.division}
                    onChange={(e) => setItemForm({ ...itemForm, division: e.target.value })}
                  >
                    {STANDARD_DIVISIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="label">Item Description / Specifications *</label>
                  <textarea
                    className="textarea"
                    rows={3}
                    placeholder="Supply and cast in-place reinforced concrete grade C35/40 with sulfate resistant cement for foundation raft, including compaction, curing, and testing..."
                    value={itemForm.description}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">Unit of Measure</label>
                  <select
                    className="input"
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
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
                    <option value="HRS">HRS</option>
                  </select>
                </div>

                <div>
                  <label className="label">Quantity *</label>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    min="0.001"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
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
                    placeholder="e.g. 380.00"
                    value={itemForm.unit_rate}
                    onChange={(e) => setItemForm({ ...itemForm, unit_rate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">Internal Cost Benchmark Rate (SAR)</label>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 310.00"
                    value={itemForm.cost_rate}
                    onChange={(e) => setItemForm({ ...itemForm, cost_rate: e.target.value })}
                  />
                </div>
              </div>

              {/* Real-time Calculation Summary */}
              <div
                style={{
                  background: "#f8fafc",
                  padding: 14,
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <span style={{ fontSize: 10.5, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                    Selling Amount:
                  </span>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0ba360", marginTop: 2 }}>
                    {(Number(itemForm.quantity || 0) * Number(itemForm.unit_rate || 0)).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}{" "}
                    SAR
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: 10.5, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                    Cost Basis:
                  </span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                    {(Number(itemForm.quantity || 0) * Number(itemForm.cost_rate || 0)).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}{" "}
                    SAR
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: 10.5, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                    Gross Margin:
                  </span>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color:
                        Number(itemForm.unit_rate || 0) >= Number(itemForm.cost_rate || 0)
                          ? "#0ba360"
                          : "#dc2626",
                      marginTop: 2,
                    }}
                  >
                    {(
                      Number(itemForm.quantity || 0) * Number(itemForm.unit_rate || 0) -
                      Number(itemForm.quantity || 0) * Number(itemForm.cost_rate || 0)
                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                    SAR
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" className="btn ghost" onClick={() => setShowAddDrawer(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={busy}>
                  {busy ? "Saving..." : "Add Item to Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. IMPORT EXCEL INTO CURRENT BOQ DRAWER */}
      {showImportDrawer && (
        <div className="drawer-ov" onClick={() => setShowImportDrawer(false)}>
          <div
            className="drawer sheet-wide"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 750, width: "80vw" }}
          >
            <div className="drawer-h">
              <div>
                <h3>Import Items into BOQ {boq.number}</h3>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  Upload Excel (.xlsx, .xls) to append or populate line items into this revision
                </span>
              </div>
              <button className="btn ghost sm" onClick={() => setShowImportDrawer(false)}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: 10,
                  padding: "36px 20px",
                  textAlign: "center",
                  background: "#f8fafc",
                  cursor: "pointer",
                }}
              >
                <label style={{ cursor: "pointer", display: "block" }}>
                  <span style={{ fontSize: 36 }}>📊</span>
                  <div style={{ fontWeight: 750, fontSize: 15, marginTop: 10, color: "#0f172a" }}>
                    Click to browse or drop BOQ spreadsheet file here
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Columns supported: Line No, Description, Unit, Quantity, Unit Rate, Division.
                  </div>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{ display: "none" }}
                    onChange={handleImportExcel}
                    disabled={busy}
                  />
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" className="btn ghost" onClick={() => setShowImportDrawer(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
