"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

const Icons = {
  sales: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  project: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  purchase: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
  document: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  inventory: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  warehouse: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4M3 10l9-7 9 7" />
    </svg>
  ),
  accounts: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  reports: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  overview: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  hr: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  settings: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  logout: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  ),
};

const TRANQUIL_GROUPS = [
  // Column 1: SALES
  {
    col: 1,
    sections: [
      {
        title: "SALES",
        iconKey: "sales",
        color: "#0284c7",
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Enquiry", href: "/enquiries" },
          { label: "Quotation", href: "/sales/quotation" },
          { label: "Sales Order", href: "/sales/order" },
          { label: "Goods Delivery", href: null },
          { label: "Sales Invoice", href: null },
          { label: "Sales Return", href: null },
          { divider: true },
          { label: "Customer", href: "/customers" },
          { label: "Receipts", href: null },
          { label: "Contra", href: null },
        ],
      },
    ],
  },

  // Column 2: PROJECT
  {
    col: 2,
    sections: [
      {
        title: "PROJECT",
        iconKey: "project",
        color: "#0ba360",
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Enquiry", href: "/enquiries" },
          { label: "Site Inspection", href: "/inspections" },
          { label: "Estimation", href: "/estimations" },
          { label: "Proposal", href: "/sales/quotation" },
          { label: "Tender", href: "/tenders" },
          { label: "BOQ", href: "/boqs" },
          { label: "Project", href: "/projects" },
          { label: "Job", href: "/jobs" },
          { label: "Subcontract", href: "/subcontract" },
          { label: "Activity", href: "/site" },
          { label: "Labour Request", href: "/labour" },
          { label: "Equipment Request", href: "/equipment" },
          { label: "Equipment Transfer", href: "/equipment" },
          { label: "Change Request", href: "/changes" },
          { label: "Change Order", href: "/changes" },
        ],
      },
    ],
  },

  // Column 3: PURCHASE & DOCUMENT MANAGEMENT
  {
    col: 3,
    sections: [
      {
        title: "PURCHASE",
        iconKey: "purchase",
        color: "#6366f1",
        items: [
          { label: "Dashboard", href: null },
          { label: "Purchase Request", href: "/procurement/indents" },
          { label: "Request For Quote", href: null },
          { label: "Purchase Order", href: "/procurement/pos" },
          { label: "Goods Receipt", href: "/procurement/grns" },
          { label: "Purchase Invoice", href: null },
          { label: "Purchase Return", href: null },
          { label: "Auto Purchase Order", href: null },
          { divider: true },
          { label: "Supplier", href: "/procurement/suppliers" },
          { label: "Payments", href: null },
        ],
      },
      {
        title: "DOCUMENT MANAGEMENT",
        iconKey: "document",
        color: "#0891b2",
        items: [
          { label: "Documents", href: null },
        ],
      },
    ],
  },

  // Column 4: INVENTORY & WAREHOUSE
  {
    col: 4,
    sections: [
      {
        title: "INVENTORY",
        iconKey: "inventory",
        color: "#0284c7",
        items: [
          { label: "Item", href: "/inventory/product" },
          { label: "Bundle", href: null },
          { label: "Price List", href: null },
        ],
      },
      {
        title: "WAREHOUSE",
        iconKey: "warehouse",
        color: "#d97706",
        items: [
          { label: "Material Request", href: "/procurement/indents" },
          { label: "Material Issue", href: null },
          { label: "Material Return", href: null },
          { label: "Stock Transfer Request", href: null },
          { label: "Stock Transfer", href: null },
          { label: "Stock Transfer Receive", href: null },
          { label: "Stock Adjustment", href: null },
          { label: "Stock Taking Management", href: null },
        ],
      },
    ],
  },

  // Column 5: ACCOUNTS
  {
    col: 5,
    sections: [
      {
        title: "ACCOUNTS",
        iconKey: "accounts",
        color: "#0ba360",
        items: [
          { label: "Dashboard", href: null },
          { label: "Manual Journal", href: null },
          { label: "Receipt", href: null },
          { label: "Expense", href: null },
          { label: "Employee Expenses", href: null },
          { label: "Credit Note", href: null },
          { label: "Debit Note", href: null },
          { label: "Bank Reconcile", href: null },
          { label: "Bank Guarantee", href: "/guarantees" },
          { label: "Prepayment", href: null },
          { divider: true },
          { label: "Account Group", href: null },
          { label: "Chart Of Accounts", href: null },
          { label: "VAT Return", href: null },
        ],
      },
    ],
  },

  // Column 6: REPORTS
  {
    col: 6,
    sections: [
      {
        title: "REPORTS",
        iconKey: "reports",
        color: "#475569",
        items: [
          { label: "Inventory", href: null },
          { label: "Accounts", href: null },
          { label: "Project", href: null },
          { label: "Tender Analytics", href: "/tenders/analytics" },
          { label: "BOQ Margins", href: null },
        ],
      },
    ],
  },
];

export default function MegaMenu({ open, onClose, onLogout, path, projects = [] }) {
  const router = useRouter();
  const { lang, projectId } = useAppStore();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    setQ("");
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Real-time keyword filter
  const filteredColumns = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return TRANQUIL_GROUPS;

    return TRANQUIL_GROUPS.map((colGroup) => {
      const filteredSections = colGroup.sections
        .map((sec) => {
          const secMatch = sec.title.toLowerCase().includes(needle);
          const matchedItems = sec.items.filter((it) => {
            if (it.divider) return false;
            return it.label?.toLowerCase().includes(needle);
          });
          return {
            ...sec,
            items: secMatch ? sec.items : matchedItems,
          };
        })
        .filter((sec) => sec.items.length > 0);

      return {
        ...colGroup,
        sections: filteredSections,
      };
    }).filter((colGroup) => colGroup.sections.length > 0);
  }, [q]);

  const activeProject = useMemo(() => {
    if (!projectId || !projects || !projects.length) return null;
    return projects.find((p) => p.id === projectId);
  }, [projectId, projects]);

  if (!open) return null;

  const isCurrentRoute = (href) => {
    if (!path || !href) return false;
    if (href === "/dashboard") return path === "/dashboard";
    if (href === "/procurement") return path === "/procurement";
    return path === href || path.startsWith(href + "/");
  };

  const handleNavigate = (href) => {
    onClose();
    router.push(href);
  };

  return (
    <div className="mega-ov" onClick={onClose}>
      <div className="mega-panel" onClick={(e) => e.stopPropagation()}>
        {/* TOP WORKSPACE BAR (OUR DESIGN PATTERN) */}
        <div className="mega-top">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="badge InProgress" style={{ fontSize: 11, padding: "2px 8px" }}>
              Tranquil QS Pro
            </span>
            {activeProject && (
              <span
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  padding: "2px 8px",
                  borderRadius: 5,
                  fontSize: 11.5,
                  fontWeight: 650,
                  color: "#0f172a",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
                title={activeProject.name}
              >
                <span style={{ color: "#0ba360" }}>●</span>
                {activeProject.code}
              </span>
            )}
          </div>

          <a
            href="/dashboard"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate("/dashboard");
            }}
            className="mega-quick-item"
          >
            {Icons.overview}
            <span>OVERVIEW</span>
          </a>

          <a
            href="/labour"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate("/labour");
            }}
            className="mega-quick-item"
          >
            {Icons.hr}
            <span>HR & PAYROLL</span>
          </a>

          <a
            href="/settings"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate("/settings");
            }}
            className="mega-quick-item"
          >
            {Icons.settings}
            <span>SYSTEM SETTINGS</span>
          </a>

          <button
            type="button"
            className="mega-quick-item"
            onClick={onLogout}
          >
            {Icons.logout}
            <span>LOGOUT</span>
          </button>

          <span className="mega-top-spacer" />

          {/* Quick Search */}
          <div className="mega-search-wrap">
            <span className="mega-search-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              className="mega-search"
              placeholder="Quick search (Esc to close)..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>

          <button
            type="button"
            className="mega-close-btn"
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* 6-COLUMN TRANQUIL LAYOUT (ONE VIEW - ZERO SCROLL) */}
        <div className="mega-columns-wrap">
          {filteredColumns.map((colGroup) => (
            <div key={colGroup.col} className="mega-col-group">
              {colGroup.sections.map((sec) => (
                <div key={sec.title} className="mega-section">
                  <div
                    className="mega-sec-title"
                    style={{
                      color: sec.color || "#0ba360",
                      borderBottomColor: sec.color || "#0ba360",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center" }}>
                      {Icons[sec.iconKey]}
                    </span>
                    <span>{sec.title}</span>
                  </div>

                  <div className="mega-sec-links">
                    {sec.items.map((item, idx) => {
                      if (item.divider) {
                        return <div key={`div-${idx}`} className="mega-link-divider" />;
                      }

                      const active = isCurrentRoute(item.href);

                      return (
                        <a
                          key={`${item.label}-${idx}`}
                          href={item.href || "#"}
                          onClick={(e) => {
                            e.preventDefault();
                            if (item.href) handleNavigate(item.href);
                          }}
                          className={"mega-link" + (active ? " active" : "") + (!item.href ? " soon" : "")}
                          title={item.href ? item.label : `${item.label} — ${t(lang, "mm_soon")}`}
                        >
                          <span>{item.label}</span>
                          {active && <span className="mega-link-here" />}
                          {!item.href && <span className="mega-soon-tag">{t(lang, "mm_soon")}</span>}
                        </a>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {!filteredColumns.length && (
            <div className="mega-empty-notice">
              No matching modules found for "{q}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
