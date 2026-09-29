"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import DataTable, { BiginAvatar } from "@/components/DataTable";
import TranquilQuotationModal from "@/components/TranquilQuotationModal";

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

export default function SalesQuotationPage() {
  const router = useRouter();
  const { lang } = useAppStore();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentView, setCurrentView] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);

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
    load(1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
    setSelected([]);
    load(1, limit);
  }, [statusFilter]);

  // Calculations for KPI Ribbon
  const pipelineRows = useMemo(() => rows.filter((r) => ["Draft", "Sent"].includes(r.status)), [rows]);
  const wonRows = useMemo(() => rows.filter((r) => r.status === "Accepted"), [rows]);

  const pipelineSum = useMemo(() => pipelineRows.reduce((a, b) => a + Number(b.amount || 0), 0), [pipelineRows]);
  const wonSum = useMemo(() => wonRows.reduce((a, b) => a + Number(b.amount || 0), 0), [wonRows]);
  const avgTicket = useMemo(() => (total > 0 ? (pipelineSum + wonSum) / total : 0), [total, pipelineSum, wonSum]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const c = { all: total, Draft: 0, Sent: 0, Accepted: 0, Rejected: 0, Expired: 0 };
    rows.forEach((r) => {
      if (c[r.status] !== undefined) c[r.status]++;
    });
    return c;
  }, [rows, total]);

  const tabs = [
    { key: "all", label: "All Quotations", count: total },
    { key: "Draft", label: "Draft", count: tabCounts.Draft },
    { key: "Sent", label: "Sent / In Review", count: tabCounts.Sent },
    { key: "Accepted", label: "Accepted / Won", count: tabCounts.Accepted },
    { key: "Rejected", label: "Declined", count: tabCounts.Rejected },
    { key: "Expired", label: "Expired", count: tabCounts.Expired },
  ];

  const handleTabChange = (key) => {
    setCurrentView(key);
    setStatusFilter(key === "all" ? "" : key);
  };

  // Open modal for editing
  const handleEdit = (quotation) => {
    setEditingQuotation(quotation);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setEditingQuotation(null);
    setIsModalOpen(true);
  };

  // Columns for listing
  const columns = [
    {
      key: "number",
      label: "Quotation No.",
      sortable: true,
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 700, color: "#0f172a" }}>{r.number}</span>
          {Number(r.revision) > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 750,
                background: "#f1f5f9",
                color: "#475569",
                border: "1px solid #e2e8f0",
                borderRadius: 4,
                padding: "1px 5px",
              }}
            >
              R{r.revision}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "client_name",
      label: "Customer / Client",
      sortable: true,
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <BiginAvatar name={r.client_name || "Client"} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 650, color: "#1e293b", fontSize: 13 }}>
              {r.client_name || "Direct Client"}
            </span>
            {r.contact_person && (
              <span style={{ fontSize: 11, color: "#64748b" }}>Attn: {r.contact_person}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "title",
      label: "Reference & Scope",
      sortable: true,
      render: (r) => (
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 280 }}>
          <span style={{ fontWeight: 600, color: "#334155", fontSize: 13 }} className="truncate">
            {r.title}
          </span>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            {r.reference_no ? `Ref: ${r.reference_no} • ` : ""}
            {r.delivery_period || "Standard delivery"}
          </span>
        </div>
      ),
    },
    {
      key: "amount",
      label: "Net Quotation (SAR)",
      sortable: true,
      align: "right",
      render: (r) => (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontWeight: 750, color: "#0ba360", fontSize: 13.5 }}>
            {fmt(r.amount)} SAR
          </span>
          {Boolean(r.vat_exempt) && (
            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>VAT Exempt</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <span className={`badge ${r.status}`}>{r.status}</span>,
    },
    {
      key: "valid_until",
      label: "Valid Until",
      render: (r) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <DueDateChip due={r.valid_until} />
          <span style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{dstr(r.valid_until)}</span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (r) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => handleEdit(r)}
            title="Edit / Open Quotation"
          >
            Open
          </button>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => {
              window.open(`/proposals/${r.id}`, "_blank");
            }}
            title="Print Official Proposal"
          >
            Print
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
            <span className="bigin-kpi-label">Active Sales Pipeline</span>
            <span className="bigin-kpi-val">{fmt(pipelineSum)} SAR</span>
            <span className="bigin-kpi-sub">{pipelineRows.length} commercial quotations in review</span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Won / Accepted Value</span>
            <span className="bigin-kpi-val" style={{ color: "#0ba360" }}>
              {fmt(wonSum)} SAR
            </span>
            <span className="bigin-kpi-sub">{wonRows.length} commercial quotations won</span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Average Ticket Size</span>
            <span className="bigin-kpi-val" style={{ color: "#0284c7" }}>
              {fmt(avgTicket)} SAR
            </span>
            <span className="bigin-kpi-sub">Across {total} total quotations</span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">VAT Compliance</span>
            <span className="bigin-kpi-val" style={{ fontSize: 16 }}>
              Saudi ZATCA 15%
            </span>
            <span className="bigin-kpi-sub">Zero-rated & standard tax calculation</span>
          </div>
        </div>
      </div>

      {/* 2. DATA TABLE & NAVIGATION TABS */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <DataTable
          title="Commercial Quotations"
          subtitle="Sales quotation schedules, line-item pricing, customer proposals & revision controls"
          rows={rows}
          columns={columns}
          loading={loading}
          total={total}
          page={page}
          limit={limit}
          onPageChange={(p) => {
            setPage(p);
            load(p, limit);
          }}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
            load(1, l);
          }}
          selected={selected}
          onSelect={setSelected}
          searchPlaceholder="Search quotation #, client, scope, reference..."
          onSearch={(q) => {
            setSearch(q);
            setPage(1);
            const query = [`page=1`, `limit=${limit}`];
            if (q) query.push("search=" + encodeURIComponent(q));
            if (statusFilter) query.push("status=" + statusFilter);
            api
              .get("/prebid/proposals?" + query.join("&"))
              .then((r) => {
                setRows(r.data.data || []);
                setTotal(r.data.meta?.total || 0);
              })
              .catch(() => {});
          }}
          tabs={tabs}
          activeTab={currentView}
          onTabChange={handleTabChange}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => load(page, limit)}
                title="Refresh table"
              >
                ⟳ Refresh
              </button>
              <button
                type="button"
                className="btn sm"
                onClick={handleNew}
                style={{
                  background: "#0ba360",
                  borderColor: "#0ba360",
                  color: "#ffffff",
                  fontWeight: 650,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span>+</span> New Quotation
              </button>
            </div>
          }
        />
      </div>

      {/* 3. FULL SCREEN TRANQUIL CREATION MODAL */}
      <TranquilQuotationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => load(page, limit)}
        editData={editingQuotation}
      />
    </div>
  );
}
