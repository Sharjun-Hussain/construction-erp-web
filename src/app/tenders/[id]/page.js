"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtDec = (n) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dstr = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

function DeadlineChip({ d }) {
  if (!d) return <span style={{ color: "#94a3b8" }}>—</span>;
  if (d.overdue) return <span className="tl-chip over">Overdue {Math.abs(d.days_remaining)}d</span>;
  if (d.urgent) return <span className="tl-chip hot">{d.days_remaining}d left</span>;
  return <span className="tl-chip">{d.days_remaining}d left</span>;
}

const TENDER_LIFECYCLE_STAGES = [
  { key: "Draft", label: "1. Draft", desc: "Takeoff & Cost Estimation" },
  { key: "Submitted", label: "2. Submitted", desc: "Commercial Review & Frozen Baseline" },
  { key: "Won", label: "3. Awarded / Won", desc: "Project & BOQ Conversion" },
];

const CONTRACT_TYPES = ["LumpSum", "UnitRate", "CostPlus", "GMP"];
const TENDER_TYPES = ["Open", "Selective", "Limited", "Negotiated"];
const CURRENCIES = ["SAR", "USD", "EUR", "AED", "KWD", "QAR", "BHD", "OMR"];
const BOND_STATUSES = ["None", "Pending", "Issued", "Released", "Forfeited"];
const ADDENDA_TYPES = ["Clarification", "Addendum", "QandA", "Corrigendum"];

export default function TenderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { lang } = useAppStore();

  const [td, setTd] = useState(null);
  const [ca, setCa] = useState(null);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [sec, setSec] = useState("overview"); // 'overview' | 'cost' | 'addenda' | 'documents' | 'history'
  const [busy, setBusy] = useState(false);

  // Addenda state
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [newAdd, setNewAdd] = useState({ type: "Clarification", subject: "", body: "" });
  const [answer, setAnswer] = useState({});

  // Edit Drawer state
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [editTab, setEditTab] = useState("sec-edit-gen");
  const [editForm, setEditForm] = useState({});

  const load = () => {
    api
      .get("/tenders/" + id)
      .then((r) => {
        setTd(r.data.data);
        setEditForm(r.data.data);
      })
      .catch(() => {});
    api
      .get("/tenders/" + id + "/cost-analysis")
      .then((r) => setCa(r.data.data))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, [id]);

  const act = async (fn, okMsg) => {
    setMsg("");
    setOk("");
    setBusy(true);
    try {
      const r = await fn();
      if (okMsg) setOk(okMsg);
      load();
      return r;
    } catch (e) {
      setMsg(e?.response?.data?.message || "Operation failed");
    } finally {
      setBusy(false);
    }
  };

  // Save edited header
  const saveHeader = async (e) => {
    e.preventDefault();
    const patch = {};
    for (const k of ["bid_amount", "cost_amount", "contingency_pct", "escalation_pct", "bond_amount", "probability"]) {
      if (editForm[k] !== undefined) patch[k] = Number(editForm[k] || 0);
    }
    for (const k of [
      "title",
      "reference",
      "client_name",
      "consultant_name",
      "contract_type",
      "tender_type",
      "currency",
      "issue_date",
      "submission_deadline",
      "validity_date",
      "bond_type",
      "bond_expiry",
      "bond_status",
      "scope",
      "notes",
    ]) {
      patch[k] = editForm[k] ?? null;
    }

    await act(() => api.put("/tenders/" + id, patch), "Tender details updated successfully");
    setShowEditDrawer(false);
  };

  // Add Addendum / Clarification
  const addAddendum = async (e) => {
    e.preventDefault();
    if (!newAdd.subject) return;
    await act(
      () =>
        api.post(`/tenders/${id}/addenda`, {
          ...newAdd,
          issued_date: new Date().toISOString().slice(0, 10),
        }),
      "Addendum logged successfully"
    );
    setNewAdd({ type: "Clarification", subject: "", body: "" });
    setShowAddDrawer(false);
  };

  // Answer Addendum inline
  const saveAnswer = (a) => {
    act(
      () => api.put(`/tenders/${id}/addenda/${a.id}/answer`, { response: answer[a.id] || "" }),
      "Clarification answer recorded"
    );
  };

  // Export XLSX
  const doExport = async () => {
    try {
      const r = await api.get(`/tenders/${id}/export`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const el = document.createElement("a");
      el.href = url;
      el.download = `Tender-${td.number}.xlsx`;
      el.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      setMsg("Export failed");
    }
  };

  // Lifecycle Transitions
  const handleLifecycleStage = (targetStage) => {
    if (targetStage === td.status) return;

    if (targetStage === "Submitted" && td.status === "Draft") {
      if (!window.confirm("Submit tender and freeze cost baseline from BOQ / Takeoff?")) return;
      act(() => api.post(`/tenders/${id}/submit`), "Tender submitted — cost baseline frozen successfully");
    } else if (targetStage === "Won" && td.status === "Submitted") {
      if (!window.confirm("Mark tender as Won / Awarded?")) return;
      act(() => api.post(`/tenders/${id}/decision`, { status: "Won" }), "Tender won — project awarded!");
    } else if (targetStage === "Lost" && td.status === "Submitted") {
      const reason = window.prompt("Reason for tender loss (pricing, technical, competitor, etc.):");
      if (!reason) return;
      act(() => api.post(`/tenders/${id}/decision`, { status: "Lost", reason_lost: reason }), "Tender marked Lost");
    }
  };

  // Convert to Project + BOQ
  const handleConvert = () => {
    if (!window.confirm("Convert this Won tender into an active project and baseline BOQ?")) return;
    act(() => api.post(`/tenders/${id}/convert`, {}), "Tender converted — Project and BOQ created!");
  };

  if (!td) {
    return (
      <div className="projects-page" style={{ padding: 32, textAlign: "center" }}>
        <div style={{ color: "#64748b", fontSize: 14 }}>Loading Tender Workspace...</div>
      </div>
    );
  }

  const editable = ["Draft"].includes(td.status);
  const s = ca?.summary;
  const divs = ca?.divisions || [];
  const lines = ca?.lines || [];

  const bidVal = Number(td.bid_amount || 0);
  const costVal = Number(td.cost_amount || 0);
  const marginVal = bidVal - costVal;
  const marginPct = Number(td.computed_margin_pct ?? td.margin_pct ?? 0);

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
        {/* Left: Back button + Tender number + Reference + Project context */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => router.push("/tenders")}
            style={{ padding: "5px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            ← All Tenders
          </button>
          <div style={{ width: 1, height: 22, background: "#e2e8f0" }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                {td.number}
              </h2>
              {td.reference && (
                <span
                  style={{
                    background: "#f1f5f9",
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: 11.5,
                    padding: "2px 8px",
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  Ref: {td.reference}
                </span>
              )}
              <span className={"badge " + td.status}>{td.status}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748b", marginTop: 3 }}>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>{td.client_name || td.client?.name || "Client"}</span>
              {td.project && (
                <>
                  <span>·</span>
                  <span style={{ fontWeight: 550 }}>
                    {td.project.code} — {td.project.name}
                  </span>
                </>
              )}
              <span>·</span>
              <span>{td.contract_type}</span>
              <span>·</span>
              <span>{td.currency || "SAR"}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {editable && (
            <>
              <button
                type="button"
                className="btn ghost sm"
                disabled={busy}
                onClick={() => {
                  setEditForm(td);
                  setShowEditDrawer(true);
                }}
              >
                ✏️ Edit Tender
              </button>
              <button
                type="button"
                className="btn sm"
                disabled={busy}
                onClick={() => handleLifecycleStage("Submitted")}
                title="Freeze takeoff cost baseline and mark tender Submitted"
              >
                🚀 Submit & Freeze Baseline
              </button>
            </>
          )}

          {td.status === "Submitted" && (
            <>
              <button
                type="button"
                className="btn sm"
                disabled={busy}
                style={{ background: "#0ba360", borderColor: "#0ba360" }}
                onClick={() => handleLifecycleStage("Won")}
              >
                🏆 Mark Won
              </button>
              <button
                type="button"
                className="btn ghost sm"
                disabled={busy}
                style={{ color: "#dc2626", borderColor: "#fecaca" }}
                onClick={() => handleLifecycleStage("Lost")}
              >
                ❌ Mark Lost
              </button>
              <button
                type="button"
                className="btn ghost sm"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Cancel this tender bid?")) {
                    act(() => api.post(`/tenders/${id}/decision`, { status: "Cancelled" }), "Tender cancelled");
                  }
                }}
              >
                Cancel
              </button>
            </>
          )}

          {td.status === "Won" && !td.awarded_project_id && (
            <button
              type="button"
              className="btn sm"
              disabled={busy}
              onClick={handleConvert}
              style={{ background: "#0284c7", borderColor: "#0284c7" }}
            >
              ⚡ Convert to Project + BOQ
            </button>
          )}

          {td.awarded_project_id && (
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => router.push(`/projects/${td.project_id}`)}
              style={{ color: "#0ba360", borderColor: "#bbf7d0" }}
            >
              🔗 View Awarded Project
            </button>
          )}

          <button
            type="button"
            className="btn ghost sm"
            onClick={doExport}
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
        {TENDER_LIFECYCLE_STAGES.map((st, idx) => {
          const isWon = td.status === "Won";
          const isLost = td.status === "Lost" || td.status === "Cancelled";
          const currentIdx = TENDER_LIFECYCLE_STAGES.findIndex((s) => s.key === td.status);
          const isCurrent = td.status === st.key;
          const isPassed = !isLost && (isWon || (currentIdx > idx && currentIdx !== -1));

          return (
            <button
              key={st.key}
              type="button"
              disabled={busy}
              className={"tranquil-stage-step" + (isCurrent ? " current" : "") + (isPassed ? " passed" : "")}
              onClick={() => {
                if (st.key === "Submitted" && td.status === "Draft") handleLifecycleStage("Submitted");
                if (st.key === "Won" && td.status === "Submitted") handleLifecycleStage("Won");
              }}
              title={`Stage: ${st.label} (${st.desc})`}
            >
              <span className="step-num">{isPassed ? "✓" : idx + 1}</span>
              <span className="step-text">{st.label}</span>
            </button>
          );
        })}
        {td.status === "Lost" && (
          <div className="tranquil-stage-step current" style={{ borderColor: "#fecaca", color: "#dc2626", background: "#fef2f2" }}>
            <span className="step-num" style={{ background: "#dc2626", color: "#fff" }}>✕</span>
            <span className="step-text">Lost / Non-Awarded</span>
          </div>
        )}
        {td.status === "Cancelled" && (
          <div className="tranquil-stage-step current" style={{ borderColor: "#cbd5e1", color: "#64748b", background: "#f1f5f9" }}>
            <span className="step-num">✕</span>
            <span className="step-text">Cancelled</span>
          </div>
        )}
      </div>

      {/* 3. BIGIN COMMERCIAL KPI BANNER */}
      <div style={{ padding: "0 24px 16px" }}>
        <div className="bigin-kpi-banner">
          <div className="bigin-kpi-item primary">
            <span className="bigin-kpi-label">Commercial Bid Value</span>
            <span className="bigin-kpi-val">{fmt(bidVal)} {td.currency || "SAR"}</span>
            <span className="bigin-kpi-sub">{td.contract_type} contracting basis</span>
          </div>
          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Cost Baseline</span>
            <span className="bigin-kpi-val" style={{ color: "#d97706" }}>
              {fmt(costVal)} {td.currency || "SAR"}
            </span>
            <span className="bigin-kpi-sub">
              {td.baseline_frozen_at ? `Frozen on ${dstr(td.baseline_frozen_at)}` : "Live estimate"}
            </span>
          </div>
          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Projected Margin</span>
            <span
              className="bigin-kpi-val"
              style={{
                color: marginPct >= 10 ? "#0ba360" : marginPct >= 5 ? "#d97706" : "#dc2626",
              }}
            >
              {fmt(marginVal)} {td.currency || "SAR"} ({marginPct.toFixed(1)}%)
            </span>
            <span className="bigin-kpi-sub">
              {marginPct >= 10 ? "Above target threshold" : "Tight commercial markup"}
            </span>
          </div>
          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Submission Deadline</span>
            <span className="bigin-kpi-val" style={{ fontSize: 18 }}>
              {dstr(td.submission_deadline)}
            </span>
            <span className="bigin-kpi-sub">
              <DeadlineChip d={td.deadline} />
            </span>
          </div>
          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Bid Bond Security</span>
            <span className="bigin-kpi-val" style={{ fontSize: 18 }}>
              {td.bond_amount ? `${fmt(td.bond_amount)} ${td.currency || "SAR"}` : "None"}
            </span>
            <span className="bigin-kpi-sub">
              {td.bond_type || "No guarantee"} · <span style={{ fontWeight: 600 }}>{td.bond_status || "None"}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 4. TRANQUIL SHEET TABS */}
      <div className="bigin-sheet-tabs" style={{ margin: "0 24px 16px" }}>
        {[
          { key: "overview", label: "Commercial Overview & Terms" },
          { key: "cost", label: `Cost Analysis & Frozen Baseline ${lines.length ? `(${lines.length})` : ""}` },
          { key: "addenda", label: `Addenda & Clarifications (${(td.addenda || []).length})` },
          { key: "documents", label: `Tender Documents (${(td.documents || []).length})` },
          { key: "history", label: "Stage History & Audit Trail" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={"bigin-tab-pill" + (sec === tab.key ? " active" : "")}
            onClick={() => setSec(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 5. TAB PANELS */}
      <div style={{ padding: "0 24px 32px" }}>
        {/* TAB 1: COMMERCIAL OVERVIEW */}
        {sec === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {td.reason_lost && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  padding: "12px 16px",
                  color: "#991b1b",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <b style={{ fontWeight: 700 }}>Tender Lost Reason:</b> {td.reason_lost}
              </div>
            )}

            <div className="bigin-section-card">
              <div className="bigin-section-head">
                <span className="badge Draft">01</span>
                <span className="bigin-section-title">Commercial & Contractual Parameters</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 16,
                  padding: "12px 0 0",
                }}
              >
                <div>
                  <div className="label">Client / Employer</div>
                  <div style={{ fontSize: 13.5, fontWeight: 650, color: "#0f172a" }}>
                    {td.client_name || td.client?.name || "—"}
                  </div>
                </div>
                <div>
                  <div className="label">Supervising Consultant</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>
                    {td.consultant_name || "—"}
                  </div>
                </div>
                <div>
                  <div className="label">Linked Project Master</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>
                    {td.project ? `${td.project.code} — ${td.project.name}` : "—"}
                  </div>
                </div>
                <div>
                  <div className="label">Contract Type</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>
                    {td.contract_type}
                  </div>
                </div>
                <div>
                  <div className="label">Tender Procurement Method</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>
                    {td.tender_type} Bidding
                  </div>
                </div>
                <div>
                  <div className="label">Currency</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>
                    {td.currency || "SAR"}
                  </div>
                </div>
                <div>
                  <div className="label">Tender Issue Date</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>
                    {dstr(td.issue_date)}
                  </div>
                </div>
                <div>
                  <div className="label">Submission Deadline</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>
                    {dstr(td.submission_deadline)}
                  </div>
                </div>
                <div>
                  <div className="label">Offer Validity Deadline</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>
                    {dstr(td.validity_date)}
                  </div>
                </div>
                <div>
                  <div className="label">Win Probability %</div>
                  <div style={{ fontSize: 13.5, fontWeight: 650, color: "#0284c7" }}>
                    {td.probability || 0}%
                  </div>
                </div>
                <div>
                  <div className="label">Cost Baseline Snapshot</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>
                    {td.baseline_frozen_at ? new Date(td.baseline_frozen_at).toLocaleString() : "Not Frozen"}
                  </div>
                </div>
                <div>
                  <div className="label">Bid Bond Security</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>
                    {td.bond_amount ? `${fmt(td.bond_amount)} ${td.currency} (${td.bond_type} · ${td.bond_status})` : "None"}
                  </div>
                </div>
              </div>

              {td.scope && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                  <div className="label">Scope of Work & Specification Package</div>
                  <div style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-wrap", marginTop: 4, lineHeight: 1.5 }}>
                    {td.scope}
                  </div>
                </div>
              )}

              {td.notes && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                  <div className="label">Commercial Notes & Special Conditions</div>
                  <div style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-wrap", marginTop: 4, lineHeight: 1.5 }}>
                    {td.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: COST ANALYSIS & FROZEN BASELINE */}
        {sec === "cost" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Loss-making lines alert */}
            {s && s.negative_lines > 0 && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  padding: "12px 16px",
                  color: "#991b1b",
                  fontSize: 13,
                }}
              >
                ⚠️ <b>Commercial Alert:</b> {s.negative_lines} schedule line item(s) are priced below estimated direct cost (negative margin). Please review item unit rates before submission.
              </div>
            )}

            {/* Cost Breakdown Cards */}
            {s && (
              <div className="bigin-section-card">
                <div className="bigin-section-head">
                  <span className="badge Draft">01</span>
                  <span className="bigin-section-title">Cost Baseline & Allowance Breakdown</span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                    gap: 12,
                    padding: "12px 0 0",
                  }}
                >
                  <div>
                    <div className="label">Commercial Bid Value</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{fmt(s.bid_amount)}</div>
                  </div>
                  <div>
                    <div className="label">Direct Estimate Cost</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#64748b" }}>{fmt(s.direct_cost)}</div>
                  </div>
                  <div>
                    <div className="label">Contingency Allowance</div>
                    <div style={{ fontSize: 16, fontWeight: 650, color: "#d97706" }}>{fmt(s.contingency)}</div>
                  </div>
                  <div>
                    <div className="label">Escalation Allowance</div>
                    <div style={{ fontSize: 16, fontWeight: 650, color: "#d97706" }}>{fmt(s.escalation)}</div>
                  </div>
                  <div>
                    <div className="label">Total Frozen Baseline Cost</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#dc2626" }}>{fmt(s.total_cost)}</div>
                  </div>
                  <div>
                    <div className="label">Target Gross Margin</div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: s.margin_pct >= 10 ? "#0ba360" : s.margin_pct >= 5 ? "#d97706" : "#dc2626",
                      }}
                    >
                      {fmt(s.margin)} ({s.margin_pct}%)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MasterFormat Trade Divisions Table */}
            {divs.length > 0 && (
              <div className="bigin-section-card">
                <div className="bigin-section-head">
                  <span className="badge Draft">02</span>
                  <span className="bigin-section-title">Breakdown by CSI Trade Division</span>
                </div>
                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>CSI Trade Division</th>
                        <th style={{ textAlign: "center" }}>Lines</th>
                        <th style={{ textAlign: "right" }}>Bid Amount ({td.currency || "SAR"})</th>
                        <th style={{ textAlign: "right" }}>Cost Basis ({td.currency || "SAR"})</th>
                        <th style={{ textAlign: "right" }}>Projected Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {divs.map((d) => (
                        <tr key={d.division}>
                          <td style={{ fontWeight: 600 }}>{d.division}</td>
                          <td style={{ textAlign: "center" }}>{d.lines}</td>
                          <td style={{ textAlign: "right", fontWeight: 650 }}>{fmtDec(d.amount)}</td>
                          <td style={{ textAlign: "right", color: "#64748b" }}>{fmtDec(d.cost)}</td>
                          <td
                            style={{
                              textAlign: "right",
                              fontWeight: 700,
                              color: d.margin < 0 ? "#dc2626" : "#0ba360",
                            }}
                          >
                            {fmtDec(d.margin)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Frozen Baseline Line Items Table */}
            <div className="bigin-section-card">
              <div className="bigin-section-head">
                <span className="badge Draft">03</span>
                <span className="bigin-section-title">Frozen Schedule Line Items (Takeoff Baseline)</span>
              </div>
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Line</th>
                      <th>Item Description</th>
                      <th>CSI Division</th>
                      <th style={{ textAlign: "right" }}>Qty</th>
                      <th>Unit</th>
                      <th style={{ textAlign: "right" }}>Unit Rate</th>
                      <th style={{ textAlign: "right" }}>Bid Amount</th>
                      <th style={{ textAlign: "right" }}>Cost Basis</th>
                      <th style={{ textAlign: "right" }}>Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.id}>
                        <td style={{ fontWeight: 600, color: "#64748b" }}>{l.line_no || "—"}</td>
                        <td style={{ fontWeight: 550, color: "#0f172a" }}>{l.description}</td>
                        <td style={{ fontSize: 11, color: "#64748b" }}>{l.division || "—"}</td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{fmtDec(l.quantity)}</td>
                        <td style={{ fontSize: 11, color: "#64748b" }}>{l.unit || "Item"}</td>
                        <td style={{ textAlign: "right" }}>{fmtDec(l.unit_rate)}</td>
                        <td style={{ textAlign: "right", fontWeight: 650 }}>{fmtDec(l.amount)}</td>
                        <td style={{ textAlign: "right", color: "#64748b" }}>{fmtDec(l.cost_amount)}</td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            color: l.margin < 0 ? "#dc2626" : "#0ba360",
                          }}
                        >
                          {fmtDec(l.margin)} ({l.margin_pct}%)
                        </td>
                      </tr>
                    ))}
                    {!lines.length && (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", padding: "32px 16px", color: "#64748b" }}>
                          No baseline frozen yet — click <b>"🚀 Submit & Freeze Baseline"</b> above to snapshot the BOQ and estimation takeoff.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ADDENDA & CLARIFICATIONS */}
        {sec === "addenda" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                  Addenda, Bulletins & Clarification Q&A
                </h3>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  Record employer circulars, tender addenda, and technical queries
                </span>
              </div>
              <button
                type="button"
                className="btn sm"
                onClick={() => setShowAddDrawer(true)}
              >
                + Log Clarification / Addendum
              </button>
            </div>

            <div className="bigin-section-card">
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>Ref No</th>
                      <th>Type</th>
                      <th>Subject</th>
                      <th>Inquiry / Details</th>
                      <th style={{ minWidth: 240 }}>Employer / Consultant Response</th>
                      <th>Issued Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(td.addenda || []).map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{a.ref_no}</td>
                        <td>
                          <span className="badge Draft">{a.type}</span>
                        </td>
                        <td style={{ fontWeight: 600, color: "#0f172a" }}>{a.subject}</td>
                        <td style={{ maxWidth: 260, fontSize: 12, color: "#475569" }}>{a.body}</td>
                        <td>
                          {a.status === "Answered" ? (
                            <div>
                              <div style={{ fontWeight: 550, color: "#0f172a", fontSize: 12.5 }}>{a.response}</div>
                              {a.responded_date && (
                                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                                  Replied: {dstr(a.responded_date)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: 5 }}>
                              <input
                                className="input"
                                style={{ height: 28, fontSize: 11 }}
                                placeholder="Log consultant reply..."
                                value={answer[a.id] || ""}
                                onChange={(e) => setAnswer({ ...answer, [a.id]: e.target.value })}
                              />
                              <button
                                type="button"
                                className="btn ghost sm"
                                style={{ height: 28, fontSize: 11 }}
                                onClick={() => saveAnswer(a)}
                              >
                                Save
                              </button>
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 12 }}>{dstr(a.issued_date)}</td>
                        <td>
                          <span className={"badge " + (a.status === "Answered" ? "Approved" : "Draft")}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!(td.addenda || []).length && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "32px 16px", color: "#64748b" }}>
                          No addenda or technical clarifications logged yet. Click "+ Log Clarification / Addendum" above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TENDER DOCUMENTS */}
        {sec === "documents" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                  Tender RFP Pack, Drawings & Documents
                </h3>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  Architectural drawings, structural specifications, BOQs and submission forms
                </span>
              </div>
              <label className="btn sm" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
                <span>+ Upload Document</span>
                <input
                  type="file"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files[0];
                    if (!f) return;
                    const fd = new FormData();
                    fd.append("file", f);
                    fd.append("entity_type", "tender");
                    fd.append("entity_id", id);
                    try {
                      await api.post("/documents/upload", fd);
                      setOk("Document uploaded successfully");
                      load();
                    } catch (err) {
                      setMsg(err?.response?.data?.message || "Upload failed");
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            <div className="bigin-section-card">
              {(td.documents || []).length > 0 ? (
                <div className="table-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>File Name</th>
                        <th>Type / MIME</th>
                        <th>Size</th>
                        <th>Uploaded Date</th>
                        <th style={{ textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {td.documents.map((d) => (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 600, color: "#0f172a" }}>{d.file_name}</td>
                          <td style={{ fontSize: 11, color: "#64748b" }}>{d.mime || "—"}</td>
                          <td style={{ fontSize: 12 }}>{d.size ? Math.round(d.size / 1024) + " KB" : "—"}</td>
                          <td style={{ fontSize: 12 }}>{dstr(d.created_at)}</td>
                          <td style={{ textAlign: "right" }}>
                            <a
                              className="btn ghost sm"
                              href={`/api/v1/documents/${d.id}/download`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: 11, padding: "2px 8px" }}
                            >
                              Download ⬇
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "32px 16px", color: "#64748b" }}>
                  No tender documents uploaded yet. Click "+ Upload Document" to attach drawings, specifications, or addenda.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT TRAIL & STAGE HISTORY */}
        {sec === "history" && (
          <div className="bigin-section-card">
            <div className="bigin-section-head">
              <span className="badge Draft">01</span>
              <span className="bigin-section-title">Tender Lifecycle Audit Trail</span>
            </div>
            <div className="feed" style={{ marginTop: 12 }}>
              {(td.history || []).map((h) => (
                <div key={h.id} className="feed-row">
                  <span className="feed-dot" style={{ background: "#0284c7" }} />
                  <span className="feed-tag">{h.action}</span>
                  <span className="feed-txt">
                    {h.detail || ""} {h.user_name ? `· by ${h.user_name}` : ""}
                  </span>
                  <span className="feed-date">
                    {h.created_at ? new Date(h.created_at).toLocaleString() : ""}
                  </span>
                </div>
              ))}
              {!(td.history || []).length && (
                <div style={{ color: "#64748b", fontSize: 13, padding: 12 }}>No lifecycle logs recorded yet.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 6. PANORAMIC SLIDE-OUT DRAWER FOR EDITING TENDER DETAILS */}
      {showEditDrawer && (
        <div className="bigin-drawer-overlay" onClick={() => setShowEditDrawer(false)}>
          <div className="bigin-drawer sheet-wide" onClick={(e) => e.stopPropagation()}>
            <div className="bigin-drawer-head">
              <div className="bigin-drawer-title-wrap">
                <span className="badge InProgress">Edit Mode</span>
                <div>
                  <h3 className="bigin-drawer-title">Edit Tender Workspace — {td.number}</h3>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>
                    Update commercial rates, milestone dates, and bond guarantee parameters
                  </span>
                </div>
              </div>
              <div className="bigin-drawer-actions">
                <button
                  type="button"
                  className="bigin-drawer-close"
                  onClick={() => setShowEditDrawer(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={saveHeader} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div className="bigin-drawer-body">
                <div className="bigin-section-card">
                  <div className="bigin-section-head">
                    <span className="badge Draft">01</span>
                    <span className="bigin-section-title">General & Commercial Setup</span>
                  </div>
                  <div className="form-grid">
                    <div>
                      <label className="label">Title / Package Name</label>
                      <input
                        className="input"
                        value={editForm.title || ""}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Client Reference</label>
                      <input
                        className="input"
                        value={editForm.reference || ""}
                        onChange={(e) => setEditForm({ ...editForm, reference: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Client Name</label>
                      <input
                        className="input"
                        value={editForm.client_name || ""}
                        onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Consultant Name</label>
                      <input
                        className="input"
                        value={editForm.consultant_name || ""}
                        onChange={(e) => setEditForm({ ...editForm, consultant_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Contract Type</label>
                      <select
                        className="select"
                        value={editForm.contract_type}
                        onChange={(e) => setEditForm({ ...editForm, contract_type: e.target.value })}
                      >
                        {CONTRACT_TYPES.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Tender Type</label>
                      <select
                        className="select"
                        value={editForm.tender_type}
                        onChange={(e) => setEditForm({ ...editForm, tender_type: e.target.value })}
                      >
                        {TENDER_TYPES.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Commercial Bid Value ({editForm.currency || "SAR"})</label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        value={editForm.bid_amount || 0}
                        onChange={(e) => setEditForm({ ...editForm, bid_amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Direct Cost Basis ({editForm.currency || "SAR"})</label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        value={editForm.cost_amount || 0}
                        onChange={(e) => setEditForm({ ...editForm, cost_amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Contingency %</label>
                      <input
                        className="input"
                        type="number"
                        step="0.1"
                        value={editForm.contingency_pct || 0}
                        onChange={(e) => setEditForm({ ...editForm, contingency_pct: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Escalation %</label>
                      <input
                        className="input"
                        type="number"
                        step="0.1"
                        value={editForm.escalation_pct || 0}
                        onChange={(e) => setEditForm({ ...editForm, escalation_pct: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Win Probability %</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        max="100"
                        value={editForm.probability || 0}
                        onChange={(e) => setEditForm({ ...editForm, probability: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="bigin-section-card" style={{ marginTop: 16 }}>
                  <div className="bigin-section-head">
                    <span className="badge Draft">02</span>
                    <span className="bigin-section-title">Milestones & Bond Security</span>
                  </div>
                  <div className="form-grid">
                    <div>
                      <label className="label">Issue Date</label>
                      <input
                        className="input"
                        type="date"
                        value={editForm.issue_date || ""}
                        onChange={(e) => setEditForm({ ...editForm, issue_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Submission Deadline</label>
                      <input
                        className="input"
                        type="date"
                        value={editForm.submission_deadline || ""}
                        onChange={(e) => setEditForm({ ...editForm, submission_deadline: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Validity Deadline</label>
                      <input
                        className="input"
                        type="date"
                        value={editForm.validity_date || ""}
                        onChange={(e) => setEditForm({ ...editForm, validity_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Bond Type</label>
                      <input
                        className="input"
                        value={editForm.bond_type || ""}
                        onChange={(e) => setEditForm({ ...editForm, bond_type: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Bond Value</label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        value={editForm.bond_amount || 0}
                        onChange={(e) => setEditForm({ ...editForm, bond_amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Bond Expiry</label>
                      <input
                        className="input"
                        type="date"
                        value={editForm.bond_expiry || ""}
                        onChange={(e) => setEditForm({ ...editForm, bond_expiry: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Bond Status</label>
                      <select
                        className="select"
                        value={editForm.bond_status || "None"}
                        onChange={(e) => setEditForm({ ...editForm, bond_status: e.target.value })}
                      >
                        {BOND_STATUSES.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bigin-section-card" style={{ marginTop: 16 }}>
                  <div className="bigin-section-head">
                    <span className="badge Draft">03</span>
                    <span className="bigin-section-title">Scope & Notes</span>
                  </div>
                  <div className="form-grid">
                    <div style={{ gridColumn: "span 2" }}>
                      <label className="label">Scope Summary</label>
                      <textarea
                        className="input"
                        rows={3}
                        value={editForm.scope || ""}
                        onChange={(e) => setEditForm({ ...editForm, scope: e.target.value })}
                      />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label className="label">Commercial Notes</label>
                      <textarea
                        className="input"
                        rows={2}
                        value={editForm.notes || ""}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bigin-drawer-foot">
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setShowEditDrawer(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn sm" disabled={busy}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL / DRAWER FOR LOGGING ADDENDUM / CLARIFICATION */}
      {showAddDrawer && (
        <div className="bigin-drawer-overlay" onClick={() => setShowAddDrawer(false)}>
          <div className="bigin-drawer" style={{ width: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="bigin-drawer-head">
              <div className="bigin-drawer-title-wrap">
                <span className="badge Draft">RFP Circular</span>
                <div>
                  <h3 className="bigin-drawer-title">Log Addendum / Clarification</h3>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>
                    Record formal technical query or employer circular
                  </span>
                </div>
              </div>
              <div className="bigin-drawer-actions">
                <button
                  type="button"
                  className="bigin-drawer-close"
                  onClick={() => setShowAddDrawer(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={addAddendum} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div className="bigin-drawer-body" style={{ gap: 14 }}>
                <div>
                  <label className="label">Communication Type</label>
                  <select
                    className="select"
                    value={newAdd.type}
                    onChange={(e) => setNewAdd({ ...newAdd, type: e.target.value })}
                  >
                    {ADDENDA_TYPES.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Subject / Query Heading *</label>
                  <input
                    className="input"
                    placeholder="e.g. Specification for Concrete Mix Grade C40"
                    value={newAdd.subject}
                    onChange={(e) => setNewAdd({ ...newAdd, subject: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Detail / Query Description</label>
                  <textarea
                    className="input"
                    rows={4}
                    placeholder="Enter the full inquiry or addendum notes..."
                    value={newAdd.body}
                    onChange={(e) => setNewAdd({ ...newAdd, body: e.target.value })}
                  />
                </div>
              </div>

              <div className="bigin-drawer-foot">
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setShowAddDrawer(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn sm" disabled={busy}>
                  Save Addendum
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
