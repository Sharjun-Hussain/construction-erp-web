"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAppStore } from "@/store/useAppStore";
import DataTable, { BiginAvatar } from "@/components/DataTable";
import TranquilSalesOrderModal from "@/components/TranquilSalesOrderModal";

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
const dstr = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

export default function SalesOrderPage() {
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
  const [editingOrder, setEditingOrder] = useState(null);

  const load = (p = page, l = limit) => {
    setLoading(true);
    const q = [`page=${p}`, `limit=${l}`];
    if (search) q.push("search=" + encodeURIComponent(search));
    if (statusFilter) q.push("status=" + statusFilter);

    api
      .get("/sales-orders?" + q.join("&"))
      .then((r) => {
        const list = r.data.data || [];
        setRows(list);
        setTotal(r.data.meta?.total || list.length);
        setLoading(false);
      })
      .catch(() => {
        setRows([]);
        setTotal(0);
        setLoading(false);
      });
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
  const confirmedRows = useMemo(() => rows.filter((r) => ["Confirmed", "In Production"].includes(r.status)), [rows]);
  const deliveredRows = useMemo(() => rows.filter((r) => ["Delivered", "Invoiced"].includes(r.status)), [rows]);

  const activeSum = useMemo(() => confirmedRows.reduce((a, b) => a + Number(b.net_amount || 0), 0), [confirmedRows]);
  const completedSum = useMemo(() => deliveredRows.reduce((a, b) => a + Number(b.net_amount || 0), 0), [deliveredRows]);
  const avgOrderVal = useMemo(() => (total > 0 ? (activeSum + completedSum) / total : 0), [total, activeSum, completedSum]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const c = { all: total, Draft: 0, Confirmed: 0, "In Production": 0, Delivered: 0, Invoiced: 0, Cancelled: 0 };
    rows.forEach((r) => {
      if (c[r.status] !== undefined) c[r.status]++;
    });
    return c;
  }, [rows, total]);

  const tabs = [
    { key: "all", label: "All Orders", count: total },
    { key: "Draft", label: "Draft", count: tabCounts.Draft },
    { key: "Confirmed", label: "Confirmed", count: tabCounts.Confirmed },
    { key: "In Production", label: "In Production", count: tabCounts["In Production"] },
    { key: "Delivered", label: "Delivered", count: tabCounts.Delivered },
    { key: "Invoiced", label: "Invoiced", count: tabCounts.Invoiced },
    { key: "Cancelled", label: "Cancelled", count: tabCounts.Cancelled },
  ];

  const handleTabChange = (key) => {
    setCurrentView(key);
    setStatusFilter(key === "all" ? "" : key);
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setEditingOrder(null);
    setIsModalOpen(true);
  };

  // Table Columns
  const columns = [
    {
      key: "order_no",
      label: "Order No.",
      sortable: true,
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 700, color: "#0f172a" }}>{r.order_no}</span>
          {r.quotation_no && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 650,
                background: "#e0f2fe",
                color: "#0369a1",
                border: "1px solid #bae6fd",
                borderRadius: 4,
                padding: "1px 5px",
              }}
            >
              From {r.quotation_no}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "customer_name",
      label: "Customer / Client",
      sortable: true,
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <BiginAvatar name={r.customer_name || "Customer"} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 650, color: "#1e293b", fontSize: 13 }}>
              {r.customer_name || "Direct Customer"}
            </span>
            {r.contact_person && (
              <span style={{ fontSize: 11, color: "#64748b" }}>Attn: {r.contact_person}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "customer_po_no",
      label: "PO & Reference",
      sortable: true,
      render: (r) => (
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 260 }}>
          <span style={{ fontWeight: 600, color: "#334155", fontSize: 13 }} className="truncate">
            {r.customer_po_no ? `PO: ${r.customer_po_no}` : r.reference || "Sales Order"}
          </span>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            {r.delivery_period || "Standard Delivery"} • {r.salesman || "Sales Team"}
          </span>
        </div>
      ),
    },
    {
      key: "order_date",
      label: "Order Date",
      sortable: true,
      render: (r) => (
        <span style={{ fontSize: 12.5, color: "#475569", fontWeight: 550 }}>
          {dstr(r.order_date)}
        </span>
      ),
    },
    {
      key: "net_amount",
      label: "Net Order Value",
      sortable: true,
      align: "right",
      render: (r) => (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontWeight: 750, color: "#0ba360", fontSize: 13.5 }}>
            {fmt(r.net_amount)} SAR
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
      key: "actions",
      label: "",
      align: "right",
      render: (r) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => handleEdit(r)}
            title="Edit / Open Order"
          >
            Open
          </button>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => {
              window.print();
            }}
            title="Print Order"
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
            <span className="bigin-kpi-label">Active Orders Value</span>
            <span className="bigin-kpi-val">{fmt(activeSum)} SAR</span>
            <span className="bigin-kpi-sub">{confirmedRows.length} confirmed & in production orders</span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Completed / Invoiced</span>
            <span className="bigin-kpi-val" style={{ color: "#0ba360" }}>
              {fmt(completedSum)} SAR
            </span>
            <span className="bigin-kpi-sub">{deliveredRows.length} delivered & invoiced orders</span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Average Order Size</span>
            <span className="bigin-kpi-val" style={{ color: "#0284c7" }}>
              {fmt(avgOrderVal)} SAR
            </span>
            <span className="bigin-kpi-sub">Across {total} total sales orders</span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Credit & VAT Control</span>
            <span className="bigin-kpi-val" style={{ fontSize: 16 }}>
              Saudi ZATCA Compliant
            </span>
            <span className="bigin-kpi-sub">Warehouse & credit limit verification</span>
          </div>
        </div>
      </div>

      {/* 2. DATA TABLE & NAVIGATION TABS */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <DataTable
          title="Sales Orders"
          subtitle="Customer sales orders, warehouse dispatch tracking, delivery schedules & credit limits"
          rows={rows}
          columns={columns}
          loading={loading}
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
          searchPlaceholder="Search order #, customer, PO #, reference..."
          onSearchChange={(q) => {
            setSearch(q);
            setPage(1);
            const query = [`page=1`, `limit=${limit}`];
            if (q) query.push("search=" + encodeURIComponent(q));
            if (statusFilter) query.push("status=" + statusFilter);
            api
              .get("/sales-orders?" + query.join("&"))
              .then((r) => {
                const list = r.data.data || [];
                setRows(list);
                setTotal(r.data.meta?.total || list.length);
              })
              .catch(() => {});
          }}
          tabs={tabs}
          activeTab={currentView}
          onTabChange={handleTabChange}
          onAdd={handleNew}
          addLabel="+ Sales Order"
        />
      </div>

      {/* 3. FULL SCREEN TRANQUIL CREATION MODAL */}
      <TranquilSalesOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => load(page, limit)}
        editData={editingOrder}
      />
    </div>
  );
}
