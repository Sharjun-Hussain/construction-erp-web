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
    return <span className="tl-chip over">Expired {Math.abs(diffDays)}d ago</span>;
  }
  if (diffDays <= 7) {
    return <span className="tl-chip hot">{diffDays}d left</span>;
  }
  return <span className="tl-chip">{diffDays}d left</span>;
}

const PROPOSAL_STAGES = [
  { key: "Draft", label: "1. Draft Proposal", desc: "Pricing, BOQ lines & Terms" },
  { key: "Sent", label: "2. Dispatched to Client", desc: "Commercial review & negotiation" },
  { key: "Accepted", label: "3. Accepted / Won", desc: "Awarded contract" },
];

const CURRENCIES = ["SAR", "USD", "EUR", "AED", "KWD", "QAR", "BHD", "OMR"];

export default function ProposalDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { lang } = useAppStore();

  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [sec, setSec] = useState("boq"); // 'boq' | 'terms' | 'letter'

  // Edit Drawer
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [editForm, setEditForm] = useState({});

  const load = () => {
    setLoading(true);
    api
      .get("/prebid/proposals/" + id)
      .then((r) => {
        setP(r.data.data);
        setEditForm(r.data.data);
        setLoading(false);
      })
      .catch((err) => {
        setMsg(err?.response?.data?.message || "Failed to load proposal");
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
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
  const handleTransition = (newStatus) => {
    act(
      () => api.post(`/prebid/proposals/${id}/transition`, { status: newStatus }),
      `Proposal marked as ${newStatus}`
    );
  };

  // Revise Proposal
  const handleRevise = () => {
    if (!window.confirm("Create a new formal revision of this quotation? Current proposal will remain recorded in history.")) return;
    act(
      () => api.post(`/prebid/proposals/${id}/revise`, {}),
      "New revision generated successfully!"
    ).then((res) => {
      if (res?.data?.data?.id) {
        router.push(`/proposals/${res.data.data.id}`);
      }
    });
  };

  // Save Edit Form
  const saveProposal = async (e) => {
    e.preventDefault();
    const payload = {
      title: editForm.title,
      client_name: editForm.client_name,
      amount: Number(editForm.amount || 0),
      currency: editForm.currency || "SAR",
      validity_days: Number(editForm.validity_days || 0),
      valid_until: editForm.valid_until || null,
      payment_terms: editForm.payment_terms || null,
      delivery_terms: editForm.delivery_terms || null,
      exclusions: editForm.exclusions || null,
      cover_letter: editForm.cover_letter || null,
    };
    await act(() => api.put(`/prebid/proposals/${id}`, payload), "Quotation details updated successfully");
    setShowEditDrawer(false);
  };

  // Export to Excel
  const doExport = async () => {
    try {
      const res = await api.get(`/prebid/proposals/${id}/export`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Proposal-${p.number}-R${p.revision}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setMsg("Failed to export proposal spreadsheet");
    }
  };

  const allowed = useMemo(() => {
    if (!p) return [];
    return p.allowed_transitions || [];
  }, [p]);

  if (loading && !p) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Loading proposal workspace...</div>
      </div>
    );
  }

  if (!p) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div className="alert err">{msg || "Proposal not found"}</div>
        <button type="button" className="btn sm" onClick={() => router.push("/proposals")} style={{ marginTop: 16 }}>
          ← Return to Quotations
        </button>
      </div>
    );
  }

  const lines = p.lines || [];
  const linesTotal = lines.reduce((acc, l) => acc + Number(l.total_sell ?? (Number(l.quantity || 0) * Number(l.unit_sell || l.unit_rate || 0))), 0);

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
        {/* Left: Back button + Proposal number + Revision + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => router.push("/proposals")}
            style={{ padding: "5px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            ← All Quotations
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
                {p.number}
              </span>
              <span
                style={{
                  background: "#0ba360",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 11,
                  padding: "2px 7px",
                  borderRadius: 12,
                }}
              >
                Rev {p.revision}
              </span>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                {p.title}
              </h2>
              <span className={"badge " + p.status}>{p.status}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748b", marginTop: 3 }}>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>{p.client_name || "Direct Client"}</span>
              {p.tender && (
                <>
                  <span>·</span>
                  <span>
                    Tender:{" "}
                    <a href={`/tenders/${p.tender.id}`} style={{ color: "#0284c7", fontWeight: 600, textDecoration: "underline" }}>
                      {p.tender.number}
                    </a>
                  </span>
                </>
              )}
              <span>·</span>
              <span>Valid until: <b>{dstr(p.valid_until)}</b></span>
              <DueDateChip due={p.valid_until} />
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Export to Excel */}
          <button
            type="button"
            className="btn ghost sm"
            onClick={doExport}
            style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}
            title="Download formatted Excel quotation schedule"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export XLSX
          </button>

          {/* Edit Drawer Trigger (Draft Only) */}
          {p.status === "Draft" && (
            <button
              type="button"
              className="btn ghost sm"
              disabled={busy}
              onClick={() => {
                setEditForm(p);
                setShowEditDrawer(true);
              }}
              style={{ fontSize: 12 }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 5 }}>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Edit Proposal
            </button>
          )}

          {/* Stage Buttons */}
          {p.status === "Draft" && (
            <button
              type="button"
              className="btn sm"
              disabled={busy}
              onClick={() => handleTransition("Sent")}
              style={{ background: "#0284c7", borderColor: "#0284c7", fontSize: 12 }}
            >
              🚀 Dispatch / Mark Sent
            </button>
          )}

          {p.status === "Sent" && (
            <>
              <button
                type="button"
                className="btn sm"
                disabled={busy}
                onClick={() => handleTransition("Accepted")}
                style={{ background: "#0ba360", borderColor: "#0ba360", fontSize: 12 }}
              >
                🏆 Mark Accepted
              </button>
              <button
                type="button"
                className="btn ghost sm"
                disabled={busy}
                onClick={() => handleTransition("Rejected")}
                style={{ color: "#dc2626", borderColor: "#fecaca", fontSize: 12 }}
              >
                Mark Rejected
              </button>
              <button
                type="button"
                className="btn ghost sm"
                disabled={busy}
                onClick={() => handleTransition("Expired")}
                style={{ color: "#64748b", fontSize: 12 }}
              >
                Expire
              </button>
            </>
          )}

          {/* Revise Button */}
          {["Sent", "Accepted", "Rejected", "Expired"].includes(p.status) && (
            <button
              type="button"
              className="btn ghost sm"
              disabled={busy}
              onClick={handleRevise}
              style={{ fontSize: 12, borderColor: "#cbd5e1", color: "#0f172a" }}
              title="Issue revised commercial offer R+1"
            >
              ⚡ Create Revision R{p.revision + 1}
            </button>
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
        {PROPOSAL_STAGES.map((st, idx) => {
          const isAccepted = p.status === "Accepted";
          const isClosed = p.status === "Rejected" || p.status === "Expired";
          const currentIdx = PROPOSAL_STAGES.findIndex((s) => s.key === p.status);
          const isCurrent = p.status === st.key;
          const isPassed = !isClosed && (isAccepted || (currentIdx > idx && currentIdx !== -1));
          const canAdvance = allowed.includes(st.key);

          return (
            <button
              key={st.key}
              type="button"
              disabled={busy || (!canAdvance && !isCurrent)}
              className={"tranquil-stage-step" + (isCurrent ? " current" : "") + (isPassed ? " passed" : "")}
              onClick={() => {
                if (canAdvance) handleTransition(st.key);
              }}
              title={`Stage: ${st.label} (${st.desc})`}
              style={{ cursor: canAdvance ? "pointer" : isCurrent ? "default" : "not-allowed" }}
            >
              <span className="step-num">{isPassed ? "✓" : idx + 1}</span>
              <span className="step-text">{st.label}</span>
            </button>
          );
        })}

        {p.status === "Rejected" && (
          <div className="tranquil-stage-step current" style={{ borderColor: "#fecaca", color: "#dc2626", background: "#fef2f2" }}>
            <span className="step-num" style={{ background: "#dc2626", color: "#fff" }}>✕</span>
            <span className="step-text">Rejected by Client</span>
          </div>
        )}

        {p.status === "Expired" && (
          <div className="tranquil-stage-step current" style={{ borderColor: "#cbd5e1", color: "#64748b", background: "#f1f5f9" }}>
            <span className="step-num">✕</span>
            <span className="step-text">Quotation Expired</span>
          </div>
        )}
      </div>

      {/* 3. BIGIN COMMERCIAL KPI BANNER */}
      <div style={{ padding: "0 24px 16px" }}>
        <div className="bigin-kpi-banner">
          <div className="bigin-kpi-item primary">
            <span className="bigin-kpi-label">Total Commercial Price</span>
            <span className="bigin-kpi-val">
              {fmt(p.amount)} {p.currency || "SAR"}
            </span>
            <span className="bigin-kpi-sub">Inclusive contract sum</span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Commercial Validity</span>
            <span className="bigin-kpi-val" style={{ fontSize: 18 }}>
              {dstr(p.valid_until)}
            </span>
            <span className="bigin-kpi-sub">
              <DueDateChip due={p.valid_until} />
            </span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Document Revision</span>
            <span className="bigin-kpi-val" style={{ color: "#0ba360" }}>
              Rev {p.revision}
            </span>
            <span className="bigin-kpi-sub">
              {p.sent_at ? `Dispatched ${dstr(p.sent_at)}` : "Draft baseline"}
            </span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Priced Schedule Items</span>
            <span className="bigin-kpi-val" style={{ fontSize: 18, color: "#6366f1" }}>
              {lines.length} Line Items
            </span>
            <span className="bigin-kpi-sub">
              {linesTotal > 0 ? `Subtotal: ${fmt(linesTotal)} ${p.currency || "SAR"}` : "Lump sum offer"}
            </span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Tender Association</span>
            <span className="bigin-kpi-val" style={{ fontSize: 17 }}>
              {p.tender ? p.tender.number : "Standalone"}
            </span>
            <span className="bigin-kpi-sub">
              {p.tender ? "Linked to active tender bid" : "Direct negotiation"}
            </span>
          </div>
        </div>
      </div>

      {/* 4. TRANQUIL SHEET TABS */}
      <div className="bigin-sheet-tabs" style={{ margin: "0 24px 16px" }}>
        {[
          { key: "boq", label: `Priced BOQ & Items ${lines.length ? `(${lines.length})` : ""}` },
          { key: "terms", label: "Commercial Terms & Parameters" },
          { key: "letter", label: "Cover Letter & Exclusions" },
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
        {/* TAB 1: PRICED BOQ ITEMS */}
        {sec === "boq" && (
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
                  Priced Schedule of Quantities
                </h3>
                <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>
                  Detailed breakdown of pricing schedule derived from cost estimation takeoff.
                </p>
              </div>
              <button
                type="button"
                className="btn ghost sm"
                onClick={doExport}
                style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                Export Schedule (XLSX)
              </button>
            </div>

            <div className="table-wrap" style={{ background: "#fff", borderRadius: 8, border: "1px solid #edf2f7" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>#</th>
                    <th>Item Description</th>
                    <th style={{ width: 100 }}>Unit</th>
                    <th style={{ width: 120, textAlign: "right" }}>Quantity</th>
                    <th style={{ width: 150, textAlign: "right" }}>Unit Sell Price</th>
                    <th style={{ width: 160, textAlign: "right" }}>Total Sell Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => {
                    const qty = Number(l.quantity || 0);
                    const rate = Number(l.unit_sell ?? l.unit_rate ?? 0);
                    const totalLine = Number(l.total_sell ?? (qty * rate));
                    return (
                      <tr key={l.id || i}>
                        <td style={{ color: "#64748b", fontFamily: "monospace", fontSize: 12 }}>{i + 1}</td>
                        <td style={{ fontWeight: 600, color: "#0f172a" }}>{l.description}</td>
                        <td>{l.unit || "—"}</td>
                        <td style={{ textAlign: "right", fontFamily: "monospace" }}>{fmt(qty)}</td>
                        <td style={{ textAlign: "right", fontFamily: "monospace" }}>{fmt(rate)} {p.currency || "SAR"}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "#0f172a", fontFamily: "monospace" }}>
                          {fmt(totalLine)} {p.currency || "SAR"}
                        </td>
                      </tr>
                    );
                  })}
                  {!lines.length && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "36px 20px" }}>
                        <div style={{ color: "#64748b", fontSize: 13 }}>
                          No granular takeoff line items attached. Lump sum commercial offer of{" "}
                          <b>{fmt(p.amount)} {p.currency}</b> applies.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f8fafc", borderTop: "2px solid #cbd5e1" }}>
                    <td colSpan={5} style={{ textAlign: "right", fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                      GRAND COMMERCIAL TOTAL ({p.currency || "SAR"}):
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800, fontSize: 15, color: "#0ba360", fontFamily: "monospace" }}>
                      {fmt(p.amount)} {p.currency || "SAR"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: TERMS & CONDITIONS */}
        {sec === "terms" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                  <div className="label">Client Developer</div>
                  <div style={{ fontWeight: 600, color: "#0f172a" }}>{p.client_name || "—"}</div>
                </div>
                <div>
                  <div className="label">Origin Tender</div>
                  <div>
                    {p.tender ? (
                      <a href={`/tenders/${p.tender.id}`} style={{ color: "#0284c7", fontWeight: 600, textDecoration: "underline" }}>
                        {p.tender.number} — View Tender
                      </a>
                    ) : (
                      <span className="muted">Direct Standalone Offer</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="label">Estimation Reference</div>
                  <div>
                    {p.estimation ? (
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>
                        {p.estimation.number} (Revision {p.estimation.revision})
                      </span>
                    ) : (
                      <span className="muted">Direct Takeoff</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="label">Offer Validity Deadline</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{dstr(p.valid_until)}</span>
                    <DueDateChip due={p.valid_until} />
                  </div>
                </div>
                <div>
                  <div className="label">Total Commercial Price</div>
                  <div style={{ fontWeight: 700, color: "#0ba360", fontSize: 15 }}>
                    {fmt(p.amount)} {p.currency || "SAR"}
                  </div>
                </div>
                <div>
                  <div className="label">Dispatch Date</div>
                  <div>{p.sent_at ? new Date(p.sent_at).toLocaleString() : "Not dispatched yet"}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="label">Payment Terms & Milestones</div>
                  <div style={{ fontWeight: 550, color: "#334155", background: "#f8fafc", padding: "10px 14px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                    {p.payment_terms || "Standard commercial terms apply."}
                  </div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="label">Delivery & Execution Terms</div>
                  <div style={{ fontWeight: 550, color: "#334155", background: "#f8fafc", padding: "10px 14px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                    {p.delivery_terms || "As per agreed baseline construction schedule."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COVER LETTER & EXCLUSIONS */}
        {sec === "letter" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="bigin-section-card">
              <div className="bigin-section-head">
                <span className="badge Draft">01</span>
                <span className="bigin-section-title">Executive Cover Letter</span>
              </div>
              <div style={{ padding: "12px 0 0" }}>
                {p.cover_letter ? (
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      fontSize: 13,
                      lineHeight: 1.7,
                      color: "#1e293b",
                      background: "#f8fafc",
                      padding: "16px 20px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {p.cover_letter}
                  </div>
                ) : (
                  <div className="muted" style={{ fontStyle: "italic", fontSize: 13 }}>
                    No cover letter text provided. Click "Edit Proposal" to draft the transmittal letter.
                  </div>
                )}
              </div>
            </div>

            <div className="bigin-section-card">
              <div className="bigin-section-head">
                <span className="badge Draft" style={{ background: "#fef2f2", color: "#dc2626", borderColor: "#fecaca" }}>
                  02
                </span>
                <span className="bigin-section-title">Contractual Exclusions & Scope Boundaries</span>
              </div>
              <div style={{ padding: "12px 0 0" }}>
                {p.exclusions ? (
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: "#991b1b",
                      background: "#fff5f5",
                      padding: "14px 18px",
                      borderRadius: 8,
                      border: "1px solid #fed7d7",
                    }}
                  >
                    {p.exclusions}
                  </div>
                ) : (
                  <div className="muted" style={{ fontStyle: "italic", fontSize: 13 }}>
                    No specific exclusions recorded. Standard FIDIC/NEC boundary clauses apply.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* DRAWER: EDIT PROPOSAL                                          */}
      {/* ============================================================== */}
      {showEditDrawer && (
        <div className="drawer-overlay" onClick={() => setShowEditDrawer(false)}>
          <div className="drawer sheet-wide" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="drawer-head">
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Edit Proposal Offer</h3>
                <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>
                  Update commercial proposal parameters, validity, and scope definitions
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

            <form onSubmit={saveProposal} style={{ display: "flex", flexDirection: "column", height: "calc(100% - 65px)" }}>
              <div className="drawer-body" style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="label">Proposal Title / Subject *</label>
                    <input
                      className="input"
                      required
                      value={editForm.title || ""}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label">Client / Developer *</label>
                    <input
                      className="input"
                      required
                      value={editForm.client_name || ""}
                      onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label">Validity Deadline</label>
                    <input
                      className="input"
                      type="date"
                      value={editForm.valid_until ? String(editForm.valid_until).slice(0, 10) : ""}
                      onChange={(e) => setEditForm({ ...editForm, valid_until: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label">Quoted Commercial Sum</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      required
                      value={editForm.amount || 0}
                      onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
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
                    <label className="label">Payment Terms</label>
                    <input
                      className="input"
                      value={editForm.payment_terms || ""}
                      onChange={(e) => setEditForm({ ...editForm, payment_terms: e.target.value })}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="label">Delivery & Execution Terms</label>
                    <input
                      className="input"
                      value={editForm.delivery_terms || ""}
                      onChange={(e) => setEditForm({ ...editForm, delivery_terms: e.target.value })}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="label">Scope Exclusions</label>
                    <textarea
                      className="input"
                      rows={2}
                      value={editForm.exclusions || ""}
                      onChange={(e) => setEditForm({ ...editForm, exclusions: e.target.value })}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="label">Cover Letter</label>
                    <textarea
                      className="input"
                      rows={4}
                      value={editForm.cover_letter || ""}
                      onChange={(e) => setEditForm({ ...editForm, cover_letter: e.target.value })}
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
                  {busy ? "Saving..." : "Save Proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
