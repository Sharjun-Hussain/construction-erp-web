"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
const dstr = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

function DueDateChip({ due }) {
  if (!due) return <span style={{ color: "#94a3b8" }}>—</span>;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(due);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / 86400000);

  if (diffDays < 0) {
    return <span className="tl-chip over">Overdue {Math.abs(diffDays)}d</span>;
  }
  if (diffDays <= 5) {
    return <span className="tl-chip hot">{diffDays}d left</span>;
  }
  return <span className="tl-chip">{diffDays}d left</span>;
}

const ENQUIRY_STAGES = [
  { key: "New", label: "1. New Lead", desc: "Received RFP & Registration" },
  { key: "UnderReview", label: "2. Under Review", desc: "Technical & Commercial Assessment" },
  { key: "Inspected", label: "3. Site Inspected", desc: "Site Visit, Risks & Logistics" },
  { key: "Estimated", label: "4. Cost Estimated", desc: "Preliminary Takeoff & Budget" },
  { key: "Quoted", label: "5. Quoted", desc: "Formal Commercial Bid Dispatched" },
  { key: "Won", label: "6. Awarded / Won", desc: "Converted to Project & BOQ" },
];

const FLOW = {
  New: ["UnderReview", "Dropped"],
  UnderReview: ["Inspected", "Estimated", "Dropped"],
  Inspected: ["Estimated", "Dropped"],
  Estimated: ["Quoted", "Dropped"],
  Quoted: ["Won", "Lost"],
  Won: [],
  Lost: [],
  Dropped: [],
};

const SOURCES = ["Client", "Consultant", "Portal", "Referral", "Repeat", "Other"];
const CURRENCIES = ["SAR", "USD", "EUR", "AED", "KWD", "QAR", "BHD", "OMR"];

export default function EnquiryDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { lang } = useAppStore();

  const [eq, setEq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [sec, setSec] = useState("overview"); // 'overview' | 'inspections' | 'documents'

  // Edit Drawer
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Schedule Inspection Drawer
  const [showInspDrawer, setShowInspDrawer] = useState(false);
  const [inspForm, setInspForm] = useState({
    visit_date: new Date().toISOString().slice(0, 10),
    inspector: "",
    location: "",
    site_condition: "",
    access_notes: "",
    utilities_notes: "",
    risks: "",
    findings: "",
    recommendation: "Go",
  });

  // Lost Modal
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReason, setLostReason] = useState("");

  // Customers for editing
  const [customers, setCustomers] = useState([]);

  const load = () => {
    setLoading(true);
    api
      .get("/prebid/enquiries/" + id)
      .then((r) => {
        setEq(r.data.data);
        setEditForm(r.data.data);
        setLoading(false);
      })
      .catch((err) => {
        setMsg(err?.response?.data?.message || "Failed to load enquiry");
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    api.get("/customers?limit=200").then((r) => setCustomers(r.data.data || [])).catch(() => {});
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

  // State Transition
  const handleTransition = (newStatus, reason = null) => {
    act(
      () =>
        api.post(`/prebid/enquiries/${id}/transition`, {
          status: newStatus,
          ...(reason ? { reason_lost: reason } : {}),
        }),
      `Enquiry moved to ${newStatus}`
    );
  };

  // Convert to Project + Tender
  const handleConvert = () => {
    if (!window.confirm("Convert this Enquiry into an active Bidding Tender + Project Workspace?")) return;
    act(
      () => api.post(`/prebid/enquiries/${id}/convert`, {}),
      "Converted successfully! Project and Tender workspace initialized."
    ).then((res) => {
      if (res?.data?.data?.tender?.id) {
        router.push(`/tenders/${res.data.data.tender.id}`);
      }
    });
  };

  // Save Edit Enquiry
  const saveEnquiry = async (e) => {
    e.preventDefault();
    const payload = {
      title: editForm.title,
      client_name: editForm.client_name,
      client_id: editForm.client_id || null,
      consultant_name: editForm.consultant_name || null,
      source: editForm.source || "Client",
      received_date: editForm.received_date || null,
      due_date: editForm.due_date || null,
      est_value: Number(editForm.est_value || 0),
      currency: editForm.currency || "SAR",
      assigned_to: editForm.assigned_to || null,
      probability: Number(editForm.probability || 0),
      notes: editForm.notes || null,
    };
    await act(() => api.put(`/prebid/enquiries/${id}`, payload), "Enquiry details updated successfully");
    setShowEditDrawer(false);
  };

  // Schedule Inspection
  const scheduleInspection = async (e) => {
    e.preventDefault();
    await act(
      () => api.post("/prebid/inspections", { ...inspForm, enquiry_id: id }),
      "Site inspection scheduled successfully"
    );
    setShowInspDrawer(false);
    setInspForm({
      visit_date: new Date().toISOString().slice(0, 10),
      inspector: "",
      location: "",
      site_condition: "",
      access_notes: "",
      utilities_notes: "",
      risks: "",
      findings: "",
      recommendation: "Go",
    });
    setSec("inspections");
  };

  // Document Upload
  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("entity_type", "enquiry");
    fd.append("entity_id", id);
    try {
      await api.post("/documents/upload", fd);
      setOk("File uploaded successfully");
      load();
    } catch (err) {
      setMsg(err?.response?.data?.message || "File upload failed");
    } finally {
      e.target.value = "";
    }
  };

  // Document Download
  const downloadDoc = async (docId, fileName) => {
    try {
      const res = await api.get(`/documents/${docId}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setMsg("Failed to download document");
    }
  };

  // Allowed transitions
  const allowed = useMemo(() => {
    if (!eq) return [];
    return eq.allowed_transitions || FLOW[eq.status] || [];
  }, [eq]);

  // Loading state
  if (loading && !eq) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Loading enquiry workspace...</div>
      </div>
    );
  }

  if (!eq) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div className="alert err">{msg || "Enquiry not found"}</div>
        <button type="button" className="btn sm" onClick={() => router.push("/enquiries")} style={{ marginTop: 16 }}>
          ← Return to Enquiries
        </button>
      </div>
    );
  }

  const isTerminal = ["Won", "Lost", "Dropped"].includes(eq.status);

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
        {/* Left: Back button + Enquiry reference + Title + Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => router.push("/enquiries")}
            style={{ padding: "5px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            ← All Enquiries
          </button>
          <div style={{ width: 1, height: 22, background: "#e2e8f0" }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontFamily: "monospace",
                  fontWeight: 800,
                  fontSize: 14,
                  color: "#0f172a",
                  background: "#f1f5f9",
                  padding: "2px 8px",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                }}
              >
                {eq.number}
              </span>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                {eq.title}
              </h2>
              <span className={"badge " + eq.status}>{eq.status}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748b", marginTop: 3 }}>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>
                {eq.client_name || eq.client?.name || "Direct Client"}
              </span>
              {eq.consultant_name && (
                <>
                  <span>·</span>
                  <span>Consultant: <b>{eq.consultant_name}</b></span>
                </>
              )}
              <span>·</span>
              <span>Source: <b>{eq.source || "Client"}</b></span>
              <span>·</span>
              <span>Due: <DueDateChip due={eq.due_date} /></span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Edit Button */}
          <button
            type="button"
            className="btn ghost sm"
            disabled={busy}
            onClick={() => {
              setEditForm(eq);
              setShowEditDrawer(true);
            }}
            style={{ fontSize: 12 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 5 }}>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Edit Enquiry
          </button>

          {/* If already converted to tender */}
          {eq.tender_id && (
            <button
              type="button"
              className="btn sm"
              onClick={() => router.push(`/tenders/${eq.tender_id}`)}
              style={{ background: "#0ba360", borderColor: "#0ba360", fontSize: 12 }}
            >
              Open Tender {eq.tender?.number || ""} →
            </button>
          )}

          {/* Convert to Tender + Project */}
          {!eq.tender_id && !isTerminal && (
            <button
              type="button"
              className="btn sm"
              disabled={busy}
              onClick={handleConvert}
              style={{ background: "#0284c7", borderColor: "#0284c7", fontSize: 12 }}
            >
              ⚡ Convert to Tender + Project
            </button>
          )}

          {/* Quick Drop / Lost transitions */}
          {!isTerminal && (
            <>
              <button
                type="button"
                className="btn ghost sm"
                disabled={busy}
                style={{ color: "#dc2626", borderColor: "#fecaca", fontSize: 12 }}
                onClick={() => {
                  setLostReason("");
                  setShowLostModal(true);
                }}
              >
                Mark Lost
              </button>
              <button
                type="button"
                className="btn ghost sm"
                disabled={busy}
                style={{ color: "#64748b", borderColor: "#e2e8f0", fontSize: 12 }}
                onClick={() => {
                  if (window.confirm("Drop this enquiry? It will be archived as unpursued.")) {
                    handleTransition("Dropped");
                  }
                }}
              >
                Drop
              </button>
            </>
          )}
        </div>
      </div>

      {/* ALERTS */}
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
        {ENQUIRY_STAGES.map((st, idx) => {
          const isWon = eq.status === "Won";
          const isLostOrDropped = eq.status === "Lost" || eq.status === "Dropped";
          const currentIdx = ENQUIRY_STAGES.findIndex((s) => s.key === eq.status);
          const isCurrent = eq.status === st.key;
          const isPassed = !isLostOrDropped && (isWon || (currentIdx > idx && currentIdx !== -1));
          const canAdvance = allowed.includes(st.key);

          return (
            <button
              key={st.key}
              type="button"
              disabled={busy || (!canAdvance && !isCurrent)}
              className={"tranquil-stage-step" + (isCurrent ? " current" : "") + (isPassed ? " passed" : "")}
              onClick={() => {
                if (canAdvance) {
                  handleTransition(st.key);
                }
              }}
              title={`Stage: ${st.label} (${st.desc})${canAdvance ? " · Click to advance" : ""}`}
              style={{ cursor: canAdvance ? "pointer" : isCurrent ? "default" : "not-allowed" }}
            >
              <span className="step-num">{isPassed ? "✓" : idx + 1}</span>
              <span className="step-text">{st.label}</span>
            </button>
          );
        })}

        {eq.status === "Lost" && (
          <div className="tranquil-stage-step current" style={{ borderColor: "#fecaca", color: "#dc2626", background: "#fef2f2" }}>
            <span className="step-num" style={{ background: "#dc2626", color: "#fff" }}>✕</span>
            <span className="step-text">Lost Opportunity</span>
          </div>
        )}

        {eq.status === "Dropped" && (
          <div className="tranquil-stage-step current" style={{ borderColor: "#cbd5e1", color: "#64748b", background: "#f1f5f9" }}>
            <span className="step-num">✕</span>
            <span className="step-text">Dropped / Archived</span>
          </div>
        )}
      </div>

      {/* 3. BIGIN COMMERCIAL KPI BANNER */}
      <div style={{ padding: "0 24px 16px" }}>
        <div className="bigin-kpi-banner">
          <div className="bigin-kpi-item primary">
            <span className="bigin-kpi-label">Estimated Contract Value</span>
            <span className="bigin-kpi-val">
              {fmt(eq.est_value)} {eq.currency || "SAR"}
            </span>
            <span className="bigin-kpi-sub">Preliminary commercial target</span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Submission Due Date</span>
            <span className="bigin-kpi-val" style={{ fontSize: 18 }}>
              {dstr(eq.due_date)}
            </span>
            <span className="bigin-kpi-sub">
              <DueDateChip due={eq.due_date} />
            </span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Win Probability</span>
            <span
              className="bigin-kpi-val"
              style={{
                color: (eq.probability || 0) >= 70 ? "#0ba360" : (eq.probability || 0) >= 40 ? "#d97706" : "#dc2626",
              }}
            >
              {eq.probability || 0}%
            </span>
            <span className="bigin-kpi-sub">
              {(eq.probability || 0) >= 70 ? "High strategic win rate" : "Competitive multi-bidder"}
            </span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Site Inspections</span>
            <span className="bigin-kpi-val" style={{ fontSize: 18, color: "#6366f1" }}>
              {(eq.inspections || []).length} Recorded
            </span>
            <span className="bigin-kpi-sub">Pre-bid technical reconnaissance</span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Tender Conversion</span>
            <span className="bigin-kpi-val" style={{ fontSize: 17, color: eq.tender_id ? "#0ba360" : "#64748b" }}>
              {eq.tender_id ? (eq.tender?.number || "Converted") : "Pending"}
            </span>
            <span className="bigin-kpi-sub">
              {eq.tender_id ? "Active bidding workspace linked" : "Awaiting estimation freeze"}
            </span>
          </div>
        </div>
      </div>

      {/* 4. TRANQUIL SHEET TABS */}
      <div className="bigin-sheet-tabs" style={{ margin: "0 24px 16px" }}>
        {[
          { key: "overview", label: "Commercial Overview & Terms" },
          { key: "inspections", label: `Site Inspections (${(eq.inspections || []).length})` },
          { key: "documents", label: `RFP Documents (${(eq.documents || []).length})` },
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
        {/* TAB 1: OVERVIEW */}
        {sec === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {eq.reason_lost && (
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
                <b style={{ fontWeight: 700 }}>Enquiry Lost Reason:</b> {eq.reason_lost}
              </div>
            )}

            <div className="bigin-section-card">
              <div className="bigin-section-head">
                <span className="badge Draft">01</span>
                <span className="bigin-section-title">Commercial & Lead Identification</span>
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
                  <div className="label">Client Developer</div>
                  <div style={{ fontWeight: 600, color: "#0f172a" }}>{eq.client_name || "—"}</div>
                </div>
                <div>
                  <div className="label">Supervising Consultant</div>
                  <div style={{ fontWeight: 600, color: "#0f172a" }}>{eq.consultant_name || "—"}</div>
                </div>
                <div>
                  <div className="label">Acquisition Source</div>
                  <div>
                    <span
                      style={{
                        background: "#f1f5f9",
                        color: "#475569",
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    >
                      {eq.source || "Client"}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="label">Lead Received Date</div>
                  <div>{dstr(eq.received_date)}</div>
                </div>
                <div>
                  <div className="label">Submission Due Date</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{dstr(eq.due_date)}</span>
                    <DueDateChip due={eq.due_date} />
                  </div>
                </div>
                <div>
                  <div className="label">Estimated Contract Value</div>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>
                    {fmt(eq.est_value)} {eq.currency || "SAR"}
                  </div>
                </div>
                <div>
                  <div className="label">Assigned Estimator</div>
                  <div style={{ fontWeight: 600, color: "#0f172a" }}>{eq.assigned_to || "Unassigned"}</div>
                </div>
                <div>
                  <div className="label">Win Probability Score</div>
                  <div style={{ fontWeight: 700, color: "#0ba360" }}>{eq.probability || 0}%</div>
                </div>
                <div>
                  <div className="label">Linked Bidding Tender</div>
                  <div>
                    {eq.tender_id ? (
                      <a
                        href={`/tenders/${eq.tender_id}`}
                        style={{ color: "#0284c7", fontWeight: 600, textDecoration: "underline" }}
                      >
                        {eq.tender?.number || "Open Tender Workspace →"}
                      </a>
                    ) : (
                      <span className="muted">Not yet converted</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bigin-section-card">
              <div className="bigin-section-head">
                <span className="badge Draft">02</span>
                <span className="bigin-section-title">Scope Notes & Bidding Strategy</span>
              </div>
              <div style={{ padding: "12px 0 0" }}>
                {eq.notes ? (
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: "#334155",
                      background: "#f8fafc",
                      padding: "14px 16px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {eq.notes}
                  </div>
                ) : (
                  <div className="muted" style={{ fontStyle: "italic", fontSize: 13 }}>
                    No pre-bid notes recorded. Click "Edit Enquiry" above to add scope details, RFP instructions, or site constraints.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SITE INSPECTIONS */}
        {sec === "inspections" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                  Site Reconnaissance & Inspections
                </h3>
                <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>
                  Record site visits, ground conditions, logistical access, utility availability, and technical risks.
                </p>
              </div>
              <button
                type="button"
                className="btn sm"
                onClick={() => setShowInspDrawer(true)}
                style={{ fontSize: 12 }}
              >
                + Schedule Site Inspection
              </button>
            </div>

            <div className="table-wrap" style={{ background: "#fff", borderRadius: 8, border: "1px solid #edf2f7" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>Inspection #</th>
                    <th style={{ width: 120 }}>Visit Date</th>
                    <th>Inspector</th>
                    <th>Location</th>
                    <th>Site Condition & Risks</th>
                    <th style={{ width: 130 }}>Recommendation</th>
                    <th style={{ width: 100 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(eq.inspections || []).map((i) => (
                    <tr key={i.id}>
                      <td>
                        <a
                          href={`/inspections?open=${i.id}`}
                          style={{ fontWeight: 700, color: "#0284c7", fontFamily: "monospace" }}
                        >
                          {i.number || `INS-${i.id}`}
                        </a>
                      </td>
                      <td>{dstr(i.visit_date)}</td>
                      <td style={{ fontWeight: 600, color: "#0f172a" }}>{i.inspector || "—"}</td>
                      <td>{i.location || "—"}</td>
                      <td style={{ maxWidth: 320 }}>
                        {i.site_condition && (
                          <div style={{ fontSize: 12, color: "#0f172a" }}>
                            <b>Condition:</b> {i.site_condition}
                          </div>
                        )}
                        {i.risks && (
                          <div style={{ fontSize: 11.5, color: "#dc2626", marginTop: 2 }}>
                            <b>Risks:</b> {i.risks}
                          </div>
                        )}
                        {!i.site_condition && !i.risks && <span className="muted">—</span>}
                      </td>
                      <td>
                        <span
                          className={
                            "badge " +
                            (i.recommendation === "Go"
                              ? "Approved"
                              : i.recommendation === "NoGo"
                              ? "Cancelled"
                              : "Draft")
                          }
                        >
                          {i.recommendation || "Pending"}
                        </span>
                      </td>
                      <td>
                        <span className={"badge " + (i.status === "Completed" ? "Approved" : "Draft")}>
                          {i.status || "Scheduled"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!(eq.inspections || []).length && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "36px 20px" }}>
                        <div style={{ color: "#64748b", fontSize: 13 }}>
                          No site inspections recorded for this enquiry yet.
                        </div>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => setShowInspDrawer(true)}
                          style={{ marginTop: 10 }}
                        >
                          Schedule First Inspection
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: RFP DOCUMENTS */}
        {sec === "documents" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                  Enquiry RFP Documents & Attachments
                </h3>
                <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>
                  Tender specifications, architectural drawings, client RFQ packages, and addenda.
                </p>
              </div>
              <label className="btn sm" style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload File
                <input type="file" hidden onChange={handleDocUpload} />
              </label>
            </div>

            <div className="table-wrap" style={{ background: "#fff", borderRadius: 8, border: "1px solid #edf2f7" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th style={{ width: 140 }}>File Size</th>
                    <th style={{ width: 160 }}>Uploaded Date</th>
                    <th style={{ width: 120, textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(eq.documents || []).map((d) => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600, color: "#0f172a" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          {d.file_name}
                        </div>
                      </td>
                      <td>{d.size ? Math.round(d.size / 1024) + " KB" : "—"}</td>
                      <td>{dstr(d.created_at)}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => downloadDoc(d.id, d.file_name)}
                          style={{ padding: "3px 8px", fontSize: 11 }}
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!(eq.documents || []).length && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "36px 20px" }}>
                        <div style={{ color: "#64748b", fontSize: 13 }}>
                          No documents uploaded yet. Upload the RFP pack, drawings, or client specification sheets.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* DRAWER 1: EDIT ENQUIRY                                          */}
      {/* ============================================================== */}
      {showEditDrawer && (
        <div className="drawer-overlay" onClick={() => setShowEditDrawer(false)}>
          <div className="drawer sheet-wide" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="drawer-head">
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Edit Enquiry Details</h3>
                <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>
                  Modify RFP details, estimated contract value, probability, and dates
                </p>
              </div>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setShowEditDrawer(false)}
                style={{ fontSize: 16, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveEnquiry} style={{ display: "flex", flexDirection: "column", height: "calc(100% - 65px)" }}>
              <div className="drawer-body" style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="label">Project Title / RFP Name *</label>
                    <input
                      className="input"
                      required
                      value={editForm.title || ""}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label">Client / Developer</label>
                    <input
                      className="input"
                      value={editForm.client_name || ""}
                      onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                      placeholder="e.g. Al-Futtaim Properties"
                    />
                  </div>

                  <div>
                    <label className="label">Supervising Consultant</label>
                    <input
                      className="input"
                      value={editForm.consultant_name || ""}
                      onChange={(e) => setEditForm({ ...editForm, consultant_name: e.target.value })}
                      placeholder="e.g. Khatib & Alami"
                    />
                  </div>

                  <div>
                    <label className="label">Acquisition Source</label>
                    <select
                      className="select"
                      value={editForm.source || "Client"}
                      onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                    >
                      {SOURCES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Assigned Estimator</label>
                    <input
                      className="input"
                      value={editForm.assigned_to || ""}
                      onChange={(e) => setEditForm({ ...editForm, assigned_to: e.target.value })}
                      placeholder="e.g. Eng. Tariq"
                    />
                  </div>

                  <div>
                    <label className="label">Lead Received Date</label>
                    <input
                      className="input"
                      type="date"
                      value={editForm.received_date ? String(editForm.received_date).slice(0, 10) : ""}
                      onChange={(e) => setEditForm({ ...editForm, received_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label">Submission Due Date</label>
                    <input
                      className="input"
                      type="date"
                      value={editForm.due_date ? String(editForm.due_date).slice(0, 10) : ""}
                      onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label">Estimated Value</label>
                    <input
                      className="input"
                      type="number"
                      value={editForm.est_value || 0}
                      onChange={(e) => setEditForm({ ...editForm, est_value: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label">Currency</label>
                    <select
                      className="select"
                      value={editForm.currency || "SAR"}
                      onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <label className="label" style={{ margin: 0 }}>
                        Win Probability: <b>{editForm.probability || 0}%</b>
                      </label>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={editForm.probability || 0}
                      onChange={(e) => setEditForm({ ...editForm, probability: Number(e.target.value) })}
                      style={{ width: "100%", accentColor: "#0ba360" }}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="label">Scope Notes & Bidding Strategy</label>
                    <textarea
                      className="input"
                      rows={4}
                      value={editForm.notes || ""}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      placeholder="Key tender constraints, client requirements, commercial terms..."
                    />
                  </div>
                </div>
              </div>

              <div className="drawer-actions">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setShowEditDrawer(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={busy}>
                  {busy ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DRAWER 2: SCHEDULE INSPECTION                                  */}
      {/* ============================================================== */}
      {showInspDrawer && (
        <div className="drawer-overlay" onClick={() => setShowInspDrawer(false)}>
          <div className="drawer sheet-wide" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div className="drawer-head">
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Schedule Site Inspection</h3>
                <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>
                  Record reconnaissance visit details, site access, and logistical risks
                </p>
              </div>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setShowInspDrawer(false)}
                style={{ fontSize: 16, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={scheduleInspection} style={{ display: "flex", flexDirection: "column", height: "calc(100% - 65px)" }}>
              <div className="drawer-body" style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label className="label">Visit Date *</label>
                    <input
                      className="input"
                      type="date"
                      required
                      value={inspForm.visit_date}
                      onChange={(e) => setInspForm({ ...inspForm, visit_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label">Inspector / Engineer *</label>
                    <input
                      className="input"
                      required
                      value={inspForm.inspector}
                      onChange={(e) => setInspForm({ ...inspForm, inspector: e.target.value })}
                      placeholder="e.g. Eng. Khalid Al-Otaibi"
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="label">Site Location / Address</label>
                    <input
                      className="input"
                      value={inspForm.location}
                      onChange={(e) => setInspForm({ ...inspForm, location: e.target.value })}
                      placeholder="e.g. Riyadh Industrial City Phase 2, Plot 44"
                    />
                  </div>

                  <div>
                    <label className="label">Initial Recommendation</label>
                    <select
                      className="select"
                      value={inspForm.recommendation}
                      onChange={(e) => setInspForm({ ...inspForm, recommendation: e.target.value })}
                    >
                      <option value="Go">Go (Favorable to bid)</option>
                      <option value="Review">Review (High risks)</option>
                      <option value="NoGo">NoGo (Do not bid)</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Site Condition</label>
                    <input
                      className="input"
                      value={inspForm.site_condition}
                      onChange={(e) => setInspForm({ ...inspForm, site_condition: e.target.value })}
                      placeholder="e.g. Cleared lot / brownfield / rough terrain"
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="label">Access & Logistics Notes</label>
                    <input
                      className="input"
                      value={inspForm.access_notes}
                      onChange={(e) => setInspForm({ ...inspForm, access_notes: e.target.value })}
                      placeholder="Road width, heavy vehicle restrictions, permit required..."
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="label">Technical Risks & Constraints</label>
                    <textarea
                      className="input"
                      rows={3}
                      value={inspForm.risks}
                      onChange={(e) => setInspForm({ ...inspForm, risks: e.target.value })}
                      placeholder="High groundwater, existing utility lines, neighboring structures..."
                    />
                  </div>
                </div>
              </div>

              <div className="drawer-actions">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setShowInspDrawer(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={busy}>
                  {busy ? "Scheduling..." : "Schedule Inspection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: MARK LOST REASON                                        */}
      {/* ============================================================== */}
      {showLostModal && (
        <div className="drawer-overlay" onClick={() => setShowLostModal(false)}>
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 480,
              maxWidth: "90vw",
              background: "#ffffff",
              borderRadius: 12,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              padding: 24,
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#991b1b" }}>
              Mark Enquiry as Lost
            </h3>
            <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>
              Please specify the commercial or client reason for losing this bidding opportunity:
            </p>

            <textarea
              className="input"
              rows={3}
              required
              autoFocus
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="e.g. Client budget cancelled, competitor price 15% lower, unfeasible timeline..."
              style={{ width: "100%", marginBottom: 16 }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setShowLostModal(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn sm"
                disabled={busy || !lostReason.trim()}
                style={{ background: "#dc2626", borderColor: "#dc2626" }}
                onClick={() => {
                  setShowLostModal(false);
                  handleTransition("Lost", lostReason.trim());
                }}
              >
                Confirm Lost
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
