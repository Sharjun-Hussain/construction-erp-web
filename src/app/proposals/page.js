"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable, { BiginAvatar } from "@/components/DataTable";

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

const STATUSES = ["Draft", "Sent", "Accepted", "Rejected", "Expired"];
const CURRENCIES = ["SAR", "USD", "EUR", "AED", "KWD", "QAR", "BHD", "OMR"];

export default function ProposalsPage() {
  const router = useRouter();
  const { lang } = useAppStore();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentView, setCurrentView] = useState("all");

  // Metadata for drawer creation
  const [tenders, setTenders] = useState([]);
  const [estimations, setEstimations] = useState([]);
  const [showDrawer, setShowDrawer] = useState(false);
  const [busy, setBusy] = useState(false);

  const initialForm = {
    title: "",
    client_name: "",
    tender_id: "",
    estimation_id: "",
    amount: 0,
    currency: "SAR",
    validity_days: 90,
    payment_terms: "Net 30 days after invoice certification",
    delivery_terms: "As per contractual milestone schedule",
    exclusions: "VAT, municipal permits, unforeseen geotechnical conditions",
    cover_letter: "",
  };
  const [form, setForm] = useState(initialForm);

  const load = (p = page, l = limit) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`];
    if (search) q.push("search=" + encodeURIComponent(search));
    if (statusFilter) q.push("status=" + statusFilter);

    api
      .get("/prebid/proposals?" + q.join("&"))
      .then((r) => {
        setRows(r.data.data || []);
        setTotal(r.data.meta?.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    api.get("/tenders?limit=200").then((r) => setTenders(r.data.data || [])).catch(() => {});
    api.get("/estimations?limit=200").then((r) => setEstimations(r.data.data || [])).catch(() => {});
    load(1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
    setSelected([]);
    load(1, limit);
  }, [statusFilter]);

  // When tender is selected in drawer, auto-populate proposal fields
  const handleTenderSelect = (tId) => {
    const tdr = tenders.find((t) => String(t.id) === String(tId));
    if (tdr) {
      setForm((prev) => ({
        ...prev,
        tender_id: tId,
        title: prev.title || `Commercial Proposal: ${tdr.title || tdr.number}`,
        client_name: tdr.client_name || prev.client_name,
        amount: tdr.bid_amount || prev.amount,
        currency: tdr.currency || prev.currency,
        estimation_id: tdr.estimation_id || prev.estimation_id,
      }));
    } else {
      setForm((prev) => ({ ...prev, tender_id: tId }));
    }
  };

  // Submit Create Proposal
  const create = async (e) => {
    e.preventDefault();
    if (!form.title) return;
    setBusy(true);
    setMsg("");
    setOk("");
    try {
      const payload = {
        ...form,
        amount: Number(form.amount || 0),
        validity_days: Number(form.validity_days || 0),
      };
      if (!payload.tender_id) delete payload.tender_id;
      if (!payload.estimation_id) delete payload.estimation_id;

      const r = await api.post("/prebid/proposals", payload);
      setShowDrawer(false);
      setForm(initialForm);
      router.push(`/proposals/${r.data.data.id}`);
    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to create proposal");
    } finally {
      setBusy(false);
    }
  };

  // Quick State Transition
  const quickTransition = (id, st) => {
    setMsg("");
    setOk("");
    api
      .post(`/prebid/proposals/${id}/transition`, { status: st })
      .then(() => {
        setOk(`Proposal marked as ${st}`);
        load();
      })
      .catch((e) => setMsg(e?.response?.data?.message || "Operation failed"));
  };

  // Views definition for DataTable
  const views = useMemo(() => {
    return [
      { key: "all", label: "All Quotations", count: total },
      { key: "pipeline", label: "Active Pipeline" },
      { key: "draft", label: "Draft Proposals" },
      { key: "sent", label: "Sent / In Review" },
      { key: "accepted", label: "Accepted / Won" },
      { key: "closed", label: "Rejected / Expired" },
    ];
  }, [total]);

  const handleViewChange = (vKey) => {
    setCurrentView(vKey);
    setPage(1);
    if (vKey === "all") setStatusFilter("");
    else if (vKey === "pipeline") setStatusFilter("");
    else if (vKey === "draft") setStatusFilter("Draft");
    else if (vKey === "sent") setStatusFilter("Sent");
    else if (vKey === "accepted") setStatusFilter("Accepted");
    else if (vKey === "closed") setStatusFilter("Rejected");
  };

  // Summary Metrics
  const pipelineRows = rows.filter((r) => ["Draft", "Sent"].includes(r.status));
  const pipelineVal = pipelineRows.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const wonRows = rows.filter((r) => r.status === "Accepted");
  const wonVal = wonRows.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const totalClosed = rows.filter((r) => ["Accepted", "Rejected"].includes(r.status)).length;
  const winRate = totalClosed > 0 ? Math.round((wonRows.length / totalClosed) * 100) : 0;
  const avgAmount = rows.length > 0 ? Math.round(rows.reduce((acc, r) => acc + Number(r.amount || 0), 0) / rows.length) : 0;

  // DataTable columns
  const columns = [
    {
      key: "number",
      label: "Proposal Ref & Title",
      sortable: true,
      render: (x) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BiginAvatar
            name={x.number}
            subline={x.title || "Untitled Proposal"}
            size={34}
            color="#0ba360"
          />
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              background: "#f1f5f9",
              color: "#475569",
              padding: "1px 6px",
              borderRadius: 4,
              border: "1px solid #e2e8f0",
              marginLeft: 4,
            }}
          >
            R{x.revision}
          </span>
        </div>
      ),
    },
    {
      key: "client_name",
      label: "Client & Origin Tender",
      render: (x) => (
        <div>
          <div style={{ fontWeight: 600, color: "#0f172a" }}>{x.client_name || "Direct Client"}</div>
          {x.tender ? (
            <div style={{ fontSize: 11, color: "#0284c7", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
              <span>Tender:</span>
              <a href={`/tenders/${x.tender.id}`} style={{ textDecoration: "underline", fontWeight: 500 }}>
                {x.tender.number}
              </a>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Direct Commercial Quote</div>
          )}
        </div>
      ),
    },
    {
      key: "amount",
      label: "Quotation Amount",
      sortable: true,
      render: (x) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 13.5 }}>
            {fmt(x.amount)} {x.currency || "SAR"}
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            {x.payment_terms || "Standard Terms"}
          </div>
        </div>
      ),
    },
    {
      key: "valid_until",
      label: "Validity & Deadline",
      render: (x) => (
        <div>
          <div style={{ fontSize: 12, fontWeight: 550, color: "#0f172a" }}>{dstr(x.valid_until)}</div>
          <div style={{ marginTop: 2 }}>
            <DueDateChip due={x.valid_until} />
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Stage",
      render: (x) => <span className={"badge " + x.status}>{x.status}</span>,
    },
    {
      key: "actions",
      label: "",
      render: (x) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
          {x.status === "Draft" && (
            <button
              type="button"
              className="btn ghost sm"
              style={{ fontSize: 11, padding: "3px 8px", color: "#0284c7", borderColor: "#bae6fd" }}
              onClick={() => quickTransition(x.id, "Sent")}
              title="Dispatch proposal to client"
            >
              Send
            </button>
          )}
          {x.status === "Sent" && (
            <button
              type="button"
              className="btn ghost sm"
              style={{ fontSize: 11, padding: "3px 8px", color: "#0ba360", borderColor: "#bbf7d0" }}
              onClick={() => quickTransition(x.id, "Accepted")}
              title="Mark proposal accepted by client"
            >
              Accept
            </button>
          )}
          <button
            type="button"
            className="btn ghost sm"
            style={{ fontSize: 11, padding: "3px 10px" }}
            onClick={() => router.push(`/proposals/${x.id}`)}
          >
            Workspace →
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="projects-page">
      {/* 1. TOP COMMERCIAL KPI RIBBON */}
      <div style={{ padding: "16px 24px 0" }}>
        <div className="bigin-kpi-banner">
          <div className="bigin-kpi-item primary">
            <span className="bigin-kpi-label">Active Proposal Pipeline</span>
            <span className="bigin-kpi-val">{fmt(pipelineVal)} SAR</span>
            <span className="bigin-kpi-sub">{pipelineRows.length} active quotations in negotiation</span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Accepted Contracts Value</span>
            <span className="bigin-kpi-val" style={{ color: "#0ba360" }}>
              {fmt(wonVal)} SAR
            </span>
            <span className="bigin-kpi-sub">{wonRows.length} commercial quotations won</span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Proposal Win Rate</span>
            <span className="bigin-kpi-val" style={{ color: winRate >= 50 ? "#0ba360" : "#d97706" }}>
              {winRate}%
            </span>
            <span className="bigin-kpi-sub">based on decided bids</span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Average Quotation Ticket</span>
            <span className="bigin-kpi-val" style={{ fontSize: 18 }}>
              {fmt(avgAmount)} SAR
            </span>
            <span className="bigin-kpi-sub">Across {total} total quotations</span>
          </div>
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

      {/* 2. ZOHO BIGIN DATA TABLE */}
      <DataTable
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        limit={limit}
        onPage={(p) => {
          setPage(p);
          load(p, limit);
        }}
        onLimit={(l) => {
          setLimit(l);
          setPage(1);
          load(1, l);
        }}
        selected={selected}
        onSelect={setSelected}
        keyOf={(x) => x.id}
        loading={loading}
        title="Commercial Quotations & Proposals"
        views={views}
        activeView={currentView}
        onViewChange={handleViewChange}
        search={search}
        searchPlaceholder="Search proposals by number, title, client..."
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
          clearTimeout(window.__pr);
          window.__pr = setTimeout(() => load(1, limit), 300);
        }}
        onAdd={() => {
          setForm(initialForm);
          setShowDrawer(true);
        }}
        addLabel="Create Proposal"
        rightActions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Status Filter */}
            <select
              className="bigin-select-pill"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              title="Filter by proposal lifecycle stage"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* 3. PANORAMIC SLIDE-OUT DRAWER FOR NEW PROPOSAL */}
      {showDrawer && (
        <div className="bigin-drawer-overlay" onClick={() => setShowDrawer(false)}>
          <div className="bigin-drawer sheet-wide" onClick={(e) => e.stopPropagation()}>
            <div className="bigin-drawer-head">
              <div className="bigin-drawer-title-wrap">
                <span className="badge InProgress">Quotation Setup</span>
                <div>
                  <h3 className="bigin-drawer-title">Create Commercial Proposal</h3>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>
                    Configure pricing schedule, contractual terms, validity, and origin tender
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="bigin-drawer-close"
                onClick={() => setShowDrawer(false)}
                title="Close drawer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={create} style={{ display: "flex", flexDirection: "column", flex: "1 1 0%", minHeight: 0, height: "calc(100% - 65px)", overflow: "hidden" }}>
              <div className="bigin-drawer-body" style={{ flex: "1 1 0%", minHeight: 0, overflowY: "auto" }}>
                <div className="bigin-drawer-section">
                  <div className="bigin-drawer-section-title">01 Origin & Commercial Details</div>
                  <div className="bigin-drawer-grid">
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label className="label">Proposal Title / Subject *</label>
                      <input
                        className="input"
                        required
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g. Commercial Offer for Fit-Out & MEP Works"
                      />
                    </div>

                    <div>
                      <label className="label">Origin Tender (Optional)</label>
                      <select
                        className="select"
                        value={form.tender_id}
                        onChange={(e) => handleTenderSelect(e.target.value)}
                      >
                        <option value="">— Standalone / Direct Quotation —</option>
                        {tenders.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.number} — {x.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">Cost Estimation Reference</label>
                      <select
                        className="select"
                        value={form.estimation_id}
                        onChange={(e) => setForm({ ...form, estimation_id: e.target.value })}
                      >
                        <option value="">— Link Estimation —</option>
                        {estimations.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.number} — R{x.revision}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">Client / Developer *</label>
                      <input
                        className="input"
                        required
                        value={form.client_name}
                        onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                        placeholder="e.g. Kingdom Holding"
                      />
                    </div>

                    <div>
                      <label className="label">Validity Period (Days)</label>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        value={form.validity_days}
                        onChange={(e) => setForm({ ...form, validity_days: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="label">Quoted Commercial Amount *</label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        required
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="label">Currency</label>
                      <select
                        className="select"
                        value={form.currency}
                        onChange={(e) => setForm({ ...form, currency: e.target.value })}
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bigin-drawer-section">
                  <div className="bigin-drawer-section-title">02 Contractual Terms & Exclusions</div>
                  <div className="bigin-drawer-grid">
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label className="label">Payment Terms</label>
                      <input
                        className="input"
                        value={form.payment_terms}
                        onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                        placeholder="e.g. 10% Advance, 80% Monthly Progress, 10% Retention"
                      />
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <label className="label">Delivery & Execution Terms</label>
                      <input
                        className="input"
                        value={form.delivery_terms}
                        onChange={(e) => setForm({ ...form, delivery_terms: e.target.value })}
                        placeholder="e.g. 120 calendar days from receipt of mobilization payment"
                      />
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <label className="label">Specific Exclusions</label>
                      <textarea
                        className="input"
                        rows={2}
                        value={form.exclusions}
                        onChange={(e) => setForm({ ...form, exclusions: e.target.value })}
                        placeholder="e.g. Dewatering, primary power connection, municipal road permits"
                      />
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <label className="label">Cover Letter / Executive Summary</label>
                      <textarea
                        className="input"
                        rows={4}
                        value={form.cover_letter}
                        onChange={(e) => setForm({ ...form, cover_letter: e.target.value })}
                        placeholder="Formal proposal introduction addressed to client management..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bigin-drawer-footer" style={{ flexShrink: 0, position: "sticky", bottom: 0, zIndex: 30, background: "#ffffff", borderTop: "1px solid #edf2f7" }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setShowDrawer(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={busy}>
                  {busy ? "Generating..." : "Generate Proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
