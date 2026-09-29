"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

export default function ProcurementHubPage() {
  const { lang, projectId } = useAppStore();
  const [stats, setStats] = useState({
    posCount: 0,
    poCommitted: 0,
    grnCount: 0,
    grnValue: 0,
    suppliersCount: 0,
    indentsPending: 0,
    reorderCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/procurement/pos"),
      api.get("/procurement/grns"),
      api.get("/procurement/suppliers"),
      api.get("/procurement/indents"),
      api.get("/procurement/reorder"),
    ])
      .then(([posRes, grnRes, supRes, indRes, reorderRes]) => {
        const pos = posRes.data.data || [];
        const grns = grnRes.data.data || [];
        const sups = supRes.data.data || [];
        const indents = indRes.data.data || [];
        const reorders = reorderRes.data.data || [];

        setStats({
          posCount: pos.length,
          poCommitted: pos.reduce((acc, p) => acc + Number(p.total || 0), 0),
          grnCount: grns.length,
          grnValue: grns.reduce((acc, g) => acc + Number(g.total || 0), 0),
          suppliersCount: sups.length,
          indentsPending: indents.filter((i) => ["Draft", "Submitted"].includes(i.status)).length,
          reorderCount: reorders.length,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  const modules = [
    {
      title: "Purchase Orders (PO)",
      code: "PO",
      desc: "Raise and approve vendor purchase orders with itemized rates, delivery tracking, and 15% VAT compliance.",
      href: "/procurement/pos",
      badge: `${stats.posCount} Orders`,
      highlight: `${stats.poCommitted.toLocaleString(undefined, { maximumFractionDigits: 0 })} SAR Committed`,
      color: "#0ba360",
      actionText: "Manage POs →",
    },
    {
      title: "Goods Receipt Notes (GRN)",
      code: "GRN",
      desc: "Receive site materials against approved POs with 3-way match validation and automatic stock posting.",
      href: "/procurement/grns",
      badge: `${stats.grnCount} Receipts`,
      highlight: `${stats.grnValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} SAR Received`,
      color: "#3b82f6",
      actionText: "Process GRNs →",
    },
    {
      title: "Suppliers & Vendors (AVL)",
      code: "AVL",
      desc: "Maintain your Approved Vendor List with Saudi Commercial Registration (CR), ZATCA VAT, and ratings.",
      href: "/procurement/suppliers",
      badge: `${stats.suppliersCount} Vendors`,
      highlight: "Pre-qualified Directory",
      color: "#8b5cf6",
      actionText: "View Suppliers →",
    },
    {
      title: "Material Indents (MR)",
      code: "MR",
      desc: "Site engineers raise material requisitions directly against project BOQ with 1-click approvals.",
      href: "/procurement/indents",
      badge: `${stats.indentsPending} Pending`,
      highlight: stats.indentsPending > 0 ? "Requires Review" : "All Clear",
      color: "#f59e0b",
      actionText: "Review Indents →",
    },
    {
      title: "Materials & Site Stock",
      code: "STOCK",
      desc: "Standard material catalog, unit rates benchmarking, project site balances, and reorder threshold alerts.",
      href: "/inventory/product",
      badge: stats.reorderCount > 0 ? `${stats.reorderCount} Shortages` : "Healthy",
      highlight: "Inventory & Rates",
      color: "#06b6d4",
      actionText: "Check Stock →",
    },
  ];

  return (
    <div className="projects-page">
      {/* KPI TILES BANNER */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="card" style={{ padding: 18, borderLeft: "4px solid #0ba360" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Total PO Committed
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: "var(--fg)" }}>
            {loading ? "..." : `${stats.poCommitted.toLocaleString(undefined, { maximumFractionDigits: 0 })} SAR`}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
            Across {stats.posCount} Purchase Orders
          </div>
        </div>

        <div className="card" style={{ padding: 18, borderLeft: "4px solid #3b82f6" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Goods Received (GRN)
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: "var(--fg)" }}>
            {loading ? "..." : `${stats.grnValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} SAR`}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
            Posted to Site Physical Stock
          </div>
        </div>

        <div className="card" style={{ padding: 18, borderLeft: "4px solid #f59e0b" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Pending Indents (MR)
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: stats.indentsPending > 0 ? "var(--warning)" : "var(--fg)" }}>
            {loading ? "..." : stats.indentsPending}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
            Awaiting Head Office Approval
          </div>
        </div>

        <div className="card" style={{ padding: 18, borderLeft: "4px solid #8b5cf6" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Active Vendor List
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: "var(--fg)" }}>
            {loading ? "..." : `${stats.suppliersCount} Vendors`}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
            Saudi CR & VAT Verified
          </div>
        </div>
      </div>

      {/* MODULE CARDS GRID */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>
          Procurement Sub-Modules
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {modules.map((m) => (
            <div
              key={m.code}
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: 20,
                position: "relative",
                transition: "all 0.2s ease",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span
                    style={{
                      background: m.color,
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: 6,
                      letterSpacing: 1,
                    }}
                  >
                    {m.code}
                  </span>
                  <span className="badge Active sm">{m.badge}</span>
                </div>

                <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>{m.title}</h4>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
                  {m.desc}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid var(--border)",
                  paddingTop: 12,
                  marginTop: 6,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--primary-dark)" }}>
                  {m.highlight}
                </span>
                <a
                  href={m.href}
                  className="btn sm"
                  style={{
                    textDecoration: "none",
                    padding: "6px 12px",
                    fontSize: 12,
                    background: "var(--bg-subtle)",
                    color: "var(--fg)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {m.actionText}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
