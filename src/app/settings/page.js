"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import LookupManager from "@/components/settings/LookupManager";
import {
  FxPanel, BanksPanel, FiscalPanel, LocksPanel, TermsPanel, ApprovalSettingsPanel,
  ApprovalsInbox, VatPanel, EmailPanel, RemindersPanel, CustomFieldsPanel,
  EmployeeRatesPanel, ImportExportPanel, ReportPdfPanel, OrgPanel,
} from "@/components/settings/MasterPanels";

const P = (d) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

const ICONS = {
  building: (<><path d="M3 21h18" /><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" /><path d="M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1" /></>),
  users: (<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  user: (<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  usercheck: (<><circle cx="9" cy="7" r="3.5" /><path d="M2 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 3 1.3" /><path d="M16 19l2 2 4-4" /></>),
  id: (<><rect x="2" y="4" width="20" height="16" rx="2" /><circle cx="8" cy="11" r="2" /><path d="M5 17c.6-1.5 1.7-2 3-2s2.4.5 3 2" /><path d="M14 9h5M14 13h5" /></>),
  shield: (<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>),
  warehouse: (<><path d="M3 21h18" /><path d="M5 21V10" /><path d="M19 21V10" /><path d="M3 10l9-6 9 6" /><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" /></>),
  pin: (<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>),
  factory: (<><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 9h.01M9 13h.01M15 9h.01M15 13h.01M9 17h6" /></>),
  truck: (<><path d="M1 4h14v12H1z" /><path d="M15 9h4l4 4v3h-8V9z" /><circle cx="5.5" cy="18.5" r="2" /><circle cx="17.5" cy="18.5" r="2" /></>),
  clipboard: (<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M9 12h6M9 16h4" /></>),
  receipt: (<><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z" /><path d="M8 8h8M8 12h8M8 16h5" /></>),
  dollar: (<><circle cx="12" cy="12" r="9" /><path d="M15 9.5c-.5-1-1.7-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 2.8 6 1.6 6 4.3 0 1.3-1.3 2.2-3 2.2-1.3 0-2.4-.5-2.9-1.3" /><path d="M12 6.5v11" /></>),
  target: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>),
  bank: (<><path d="M3 21h18M3 10h18M5 6l7-3 7 3" /><path d="M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4" /></>),
  card: (<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>),
  arrows: (<><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>),
  file: (<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></>),
  book: (<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>),
  check: (<><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>),
  inbox: (<><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>),
  phone: (<><path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></>),
  layers: (<><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" /></>),
  box: (<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M3.3 7 12 12l8.7-5M12 22V12" /></>),
  wrench: (<><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></>),
  tag: (<><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><circle cx="7" cy="7" r="1.2" /></>),
  grid: (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  sliders: (<><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></>),
  calendar: (<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>),
  bell: (<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>),
  mail: (<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" /></>),
  edit: (<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>),
  lock: (<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>),
  percent: (<><path d="M19 5 5 19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></>),
  briefcase: (<><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>),
  coins: (<><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4M16.71 13.34l.7.7" /></>),
  archive: (<><rect x="1" y="3" width="22" height="5" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></>),
  ruler: (<><path d="M21.3 8.7 15.3 2.7a1 1 0 0 0-1.4 0L2.7 13.9a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4 0L21.3 10a1 1 0 0 0 0-1.3z" /><path d="M7.5 10.5l2 2M10.5 7.5l2 2M13.5 4.5l2 2" /></>),
  trend: (<><path d="M23 6l-9.5 9.5-5-5L1 18" /><path d="M17 6h6v6" /></>),
};

const T = {
  blue: { color: "#1d5bd8", bg: "#e9f0fd" },
  green: { color: "#0ba360", bg: "#f0fdf4" },
  amber: { color: "#d97706", bg: "#fffbeb" },
  violet: { color: "#7c3aed", bg: "#f5f3ff" },
  cyan: { color: "#0284c7", bg: "#f0f9ff" },
  rose: { color: "#e11d48", bg: "#fff1f2" },
  slate: { color: "#475569", bg: "#f1f5f9" },
  orange: { color: "#ea580c", bg: "#fff7ed" },
};

const TILES = {
  organization: { title: "Organization Profile", desc: "Company CR, VAT ID, branding, branches & address", icon: "building", tint: "blue", kind: "panel", comp: "org", tag: "System Panel" },
  department: { title: "Departments", desc: "Organizational departments & corporate divisions", icon: "users", tint: "violet", kind: "link", href: "/settings/department", tag: "Department Directory" },
  designation: { title: "Designations", desc: "Job designations, hierarchy levels & staff titles", icon: "id", tint: "cyan", kind: "lookup", lookup: "designation", tag: "Lookup" },
  roles: { title: "Roles & Permissions", desc: "Role-based security matrix, scopes & privileges", icon: "shield", tint: "green", kind: "link", href: "/roles", tag: "Security Matrix" },
  user: { title: "User Directory", desc: "System operators, engineers & account credentials", icon: "user", tint: "amber", kind: "link", href: "/users", tag: "User Accounts" },

  site: { title: "Project Sites & Regions", desc: "Regional operational zones & physical site locations", icon: "pin", tint: "orange", kind: "lookup", lookup: "site", tag: "Lookup" },
  project_type: { title: "Project Types", desc: "Commercial classification (Tower, Villa, Infrastructure)", icon: "layers", tint: "blue", kind: "lookup", lookup: "project_type", tag: "Lookup" },
  job_category: { title: "Job Categories", desc: "Contracting work categories and package divisions", icon: "box", tint: "amber", kind: "lookup", lookup: "job_category", tag: "Lookup" },
  job_title: { title: "Job Titles", desc: "Trade and site work positions across packages", icon: "tag", tint: "slate", kind: "lookup", lookup: "job_title", tag: "Lookup" },
  labour_type: { title: "Labour Classifications", desc: "Workforce skill tiers, trades, and direct labor heads", icon: "usercheck", tint: "cyan", kind: "lookup", lookup: "labour_type", tag: "Lookup" },
  service_type: { title: "Service Offerings", desc: "Contracting service offerings & technical scope", icon: "wrench", tint: "green", kind: "lookup", lookup: "service_type", tag: "Lookup" },
  service_type_category: { title: "Service Categories", desc: "Parent grouping for technical and consulting services", icon: "grid", tint: "violet", kind: "lookup", lookup: "service_type_category", tag: "Lookup" },
  enquiry_type: { title: "Enquiry Types", desc: "Pre-bid lead channels, sources and enquiry categories", icon: "phone", tint: "cyan", kind: "lookup", lookup: "enquiry_type", tag: "Lookup" },

  bank: { title: "Banking Institutions", desc: "Registered commercial banks & financial houses", icon: "bank", tint: "slate", kind: "panel", comp: "banks", tag: "Finance Panel" },
  bank_account: { title: "Bank Accounts", desc: "Corporate IBANs, multi-currency accounts & ledgers", icon: "card", tint: "blue", kind: "panel", comp: "banks", tag: "Finance Panel" },
  bank_guarantee_category: { title: "Bank Guarantee Categories", desc: "Bid bonds, performance guarantees & retention bonds", icon: "shield", tint: "green", kind: "lookup", lookup: "bank_guarantee_category", tag: "Lookup" },
  vat: { title: "VAT & Tax Configurations", desc: "Saudi ZATCA compliant 15% standard rate & exemptions", icon: "percent", tint: "amber", kind: "panel", comp: "vat", tag: "Tax Configuration" },
  fiscal_year: { title: "Fiscal Years & Periods", desc: "Financial accounting years, quarter splits & periods", icon: "calendar", tint: "blue", kind: "panel", comp: "fiscal", tag: "Accounting" },
  currency_rate: { title: "Currency & FX Rates", desc: "Foreign exchange valuations, base SAR & multipliers", icon: "dollar", tint: "green", kind: "panel", comp: "fx", tag: "FX Rates" },
  cost_center: { title: "Financial Cost Centers", desc: "Internal accounting cost centers & project allocations", icon: "target", tint: "violet", kind: "lookup", lookup: "cost_center", tag: "Lookup" },
  charge: { title: "Additional Charges", desc: "Custom surcharges, fees, freight & mobilization heads", icon: "receipt", tint: "rose", kind: "lookup", lookup: "charge", tag: "Lookup" },
  expense_category: { title: "Expense Categories", desc: "General site overheads, petty cash & travel heads", icon: "coins", tint: "amber", kind: "lookup", lookup: "expense_category", tag: "Lookup" },
  payment_terms: { title: "Payment Terms", desc: "Net 30, milestone advance, certification & retention terms", icon: "clipboard", tint: "blue", kind: "lookup", lookup: "payment_terms", tag: "Lookup" },
  business_type: { title: "Business Types", desc: "Client corporate classifications (LLC, Joint Venture, Semi-Gov)", icon: "briefcase", tint: "slate", kind: "lookup", lookup: "business_type", tag: "Lookup" },

  delivery_method: { title: "Delivery Methods", desc: "Procurement delivery modes, site dispatch & transport", icon: "truck", tint: "orange", kind: "lookup", lookup: "delivery_method", tag: "Lookup" },
  delivery_term: { title: "Commercial Delivery Terms", desc: "Incoterms (FOB, CIF, Ex-Works, DDP site delivery)", icon: "file", tint: "cyan", kind: "lookup", lookup: "delivery_term", tag: "Lookup" },
  terms_conditions: { title: "Standard Terms & Clauses", desc: "Tender and proposal contractual legal terms templates", icon: "book", tint: "violet", kind: "panel", comp: "terms", tag: "Legal & Contracts" },
  approval_settings: { title: "Workflow Approval Rules", desc: "Financial approval hierarchy, limits & delegations", icon: "sliders", tint: "amber", kind: "panel", comp: "apprset", tag: "Workflow Setup" },
  approvals: { title: "Approvals Inbox", desc: "Pending document approvals, review queue & logs", icon: "inbox", tint: "green", kind: "panel", comp: "inbox", tag: "Approval Inbox" },
  report_pdf: { title: "Report & PDF Layouts", desc: "Official print branding, header logos & document templates", icon: "file", tint: "rose", kind: "panel", comp: "reportpdf", tag: "Branding & Print" },

  warehouse: { title: "Stores & Warehouses", desc: "Central storage yards, site laydown areas & logistics", icon: "warehouse", tint: "orange", kind: "link", href: "/inventory/warehouse", tag: "Warehouse Management" },
  item_category: { title: "Material & Item Categories", desc: "BOQ resources, steel, concrete, finishing & equipment", icon: "archive", tint: "blue", kind: "lookup", lookup: "item_category", tag: "Lookup" },
  uom: { title: "Units of Measurement (UOM)", desc: "Metric & imperial engineering units (m2, m3, Ton, LM, LS)", icon: "ruler", tint: "cyan", kind: "lookup", lookup: "uom", tag: "Lookup" },
  manufacturer: { title: "Approved Manufacturers", desc: "Pre-qualified suppliers, fabricators & plant vendors", icon: "factory", tint: "slate", kind: "lookup", lookup: "manufacturer", tag: "Lookup" },

  reminder: { title: "Automated Reminders", desc: "Tender bond expiry, milestone alerts & schedule triggers", icon: "bell", tint: "amber", kind: "panel", comp: "reminders", tag: "Alerts & Triggers" },
  email_template: { title: "Email Dispatch Templates", desc: "Quotation notifications, PO transmissions & formal letters", icon: "mail", tint: "cyan", kind: "panel", comp: "email", tag: "Notifications" },
  custom_field: { title: "Custom User Fields", desc: "Entity metadata extensions for projects, contracts & bills", icon: "edit", tint: "violet", kind: "panel", comp: "customfields", tag: "Metadata" },
  import_export: { title: "Data Import & Export", desc: "Bulk Excel/CSV data migration & database synchronization", icon: "arrows", tint: "blue", kind: "panel", comp: "impex", tag: "Data Exchange" },
  entry_close: { title: "Period Closing & Locks", desc: "Financial period lockdown, fiscal closures & freeze audit", icon: "lock", tint: "rose", kind: "panel", comp: "locks", tag: "Audit Lock" },
  employee_rate: { title: "Workforce Hourly Rates", desc: "Standard billable cost rates for engineers, surveyors & trades", icon: "trend", tint: "green", kind: "panel", comp: "emprate", tag: "Costing Rates" },
};

const SECTIONS = [
  { key: "org", label: "Organization & Access Control", tiles: ["organization", "department", "designation", "roles", "user"] },
  { key: "project", label: "Project & Contracting Classification", tiles: ["site", "project_type", "job_category", "job_title", "labour_type", "service_type", "service_type_category", "enquiry_type"] },
  { key: "finance", label: "Financial Masters, Banking & Taxation", tiles: ["bank", "bank_account", "bank_guarantee_category", "vat", "fiscal_year", "currency_rate", "cost_center", "charge", "expense_category", "payment_terms", "business_type"] },
  { key: "docs", label: "Contracts, Approvals & Reporting", tiles: ["delivery_method", "delivery_term", "terms_conditions", "approval_settings", "approvals", "report_pdf"] },
  { key: "inventory", label: "Materials, Inventory & Resources", tiles: ["warehouse", "item_category", "uom", "manufacturer"] },
  { key: "productivity", label: "Automation, Custom Fields & Utilities", tiles: ["reminder", "email_template", "custom_field", "import_export", "entry_close", "employee_rate"] },
];

const PANELS = {
  org: OrgPanel, fx: FxPanel, banks: BanksPanel, fiscal: FiscalPanel, locks: LocksPanel,
  terms: TermsPanel, apprset: ApprovalSettingsPanel, inbox: ApprovalsInbox, vat: VatPanel,
  email: EmailPanel, reminders: RemindersPanel, customfields: CustomFieldsPanel,
  emprate: EmployeeRatesPanel, impex: ImportExportPanel, reportpdf: ReportPdfPanel,
};

export default function SettingsHub() {
  const router = useRouter();
  const { lang } = useAppStore();
  const [active, setActive] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (active) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [active]);

  const open = (key) => {
    const tile = { key, ...TILES[key] };
    if (tile.kind === "link") {
      router.push(tile.href);
      return;
    }
    setActive(tile);
  };

  const Panel = active?.kind === "panel" ? PANELS[active.comp] : null;
  const tint = active ? T[active.tint] : null;

  // Filter sections and tiles based on active category and search
  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SECTIONS.map((sec) => {
      // Category filter check
      if (activeCategory !== "all" && sec.key !== activeCategory) {
        return null;
      }

      // Tile filter check
      const matchedTiles = sec.tiles.filter((tileKey) => {
        const tile = TILES[tileKey];
        if (!tile) return false;
        if (!q) return true;
        const haystack = `${tile.title} ${tile.desc} ${tile.tag} ${tileKey}`.toLowerCase();
        return haystack.includes(q);
      });

      if (matchedTiles.length === 0) return null;

      return {
        ...sec,
        tiles: matchedTiles,
      };
    }).filter(Boolean);
  }, [activeCategory, search]);

  const totalTilesCount = Object.keys(TILES).length;

  return (
    <div className="projects-page">
      {/* 1. TOP COMMERCIAL KPI RIBBON */}
      <div style={{ padding: "16px 24px 0" }}>
        <div className="bigin-kpi-banner">
          <div className="bigin-kpi-item primary">
            <span className="bigin-kpi-label">Configured System Masters</span>
            <span className="bigin-kpi-val">{totalTilesCount} Master Dictionaries</span>
            <span className="bigin-kpi-sub">Across 6 core ERP categories</span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Tax & Financial Rules</span>
            <span className="bigin-kpi-val" style={{ color: "#0ba360" }}>
              15% ZATCA VAT Active
            </span>
            <span className="bigin-kpi-sub">SAR base currency • Multi-currency ready</span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Governance & Security</span>
            <span className="bigin-kpi-val" style={{ color: "#0284c7" }}>
              Role-Based Matrix Active
            </span>
            <span className="bigin-kpi-sub">Granular access scopes & workflow gates</span>
          </div>

          <div className="bigin-kpi-item">
            <span className="bigin-kpi-label">Architecture Mode</span>
            <span className="bigin-kpi-val" style={{ fontSize: 16 }}>
              Multi-Branch Corporate
            </span>
            <span className="bigin-kpi-sub">Real-time audit log synchronization</span>
          </div>
        </div>
      </div>

      {/* 2. CATEGORY TABS & LIVE SEARCH TOOLBAR */}
      <div style={{ padding: "16px 24px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 14,
            background: "#ffffff",
            padding: "10px 16px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
          }}
        >
          {/* Category Tabs */}
          <div className="bigin-sheet-tabs" style={{ padding: 0, border: "none" }}>
            <button
              type="button"
              className={`bigin-tab-pill ${activeCategory === "all" ? "active" : ""}`}
              onClick={() => setActiveCategory("all")}
            >
              All Masters ({totalTilesCount})
            </button>
            {SECTIONS.map((sec) => (
              <button
                key={sec.key}
                type="button"
                className={`bigin-tab-pill ${activeCategory === sec.key ? "active" : ""}`}
                onClick={() => setActiveCategory(sec.key)}
              >
                {sec.label.split(" ")[0]} ({sec.tiles.length})
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: "relative", minWidth: 260, flex: "0 1 320px" }}>
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className="tranquil-input"
              style={{ paddingLeft: 34, height: 35, width: "100%", fontSize: 13 }}
              placeholder="Search settings, VAT, banks, lookups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. SETTINGS SECTIONS & TILES GRID */}
      <div style={{ padding: "20px 24px 40px" }}>
        {filteredSections.length === 0 ? (
          <div
            className="card"
            style={{
              padding: 48,
              textAlign: "center",
              background: "#ffffff",
              border: "1px dashed #cbd5e1",
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: "#334155" }}>
              No master settings found matching "{search}"
            </div>
            <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 4 }}>
              Try searching with alternative keywords like "vat", "bank", "roles", "tax", "uom", or reset the filter.
            </div>
            <button
              type="button"
              className="btn sm"
              style={{ marginTop: 16 }}
              onClick={() => {
                setSearch("");
                setActiveCategory("all");
              }}
            >
              Reset Search & Filters
            </button>
          </div>
        ) : (
          filteredSections.map((sec) => (
            <div key={sec.key} className="set-sec">
              <div className="set-sec-head">
                <div className="set-sec-title-wrap">
                  <span className="dot" />
                  <span className="set-sec-title">{sec.label}</span>
                </div>
                <span className="set-sec-count">{sec.tiles.length} Settings</span>
              </div>

              <div className="set-tiles">
                {sec.tiles.map((key) => {
                  const tile = TILES[key];
                  if (!tile) return null;
                  const tc = T[tile.tint] || T.blue;

                  return (
                    <button
                      key={key}
                      type="button"
                      className="set-tile"
                      onClick={() => open(key)}
                      title={`Configure ${tile.title}`}
                    >
                      <span className="set-tile-icon" style={{ background: tc.bg, color: tc.color }}>
                        {P(ICONS[tile.icon])}
                      </span>
                      <div className="set-tile-content">
                        <div className="set-tile-label">{tile.title}</div>
                        <div className="set-tile-desc">{tile.desc}</div>
                      </div>
                      <div className="set-tile-meta">
                        <span className="set-tile-tag">{tile.tag}</span>
                        <span className="set-tile-go">→</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. MODERN SLIDE-OUT PANORAMIC DRAWER */}
      {active && active.kind !== "link" && (
        <div className="bigin-drawer-overlay" onClick={() => setActive(null)}>
          <div className="bigin-drawer sheet-wide" onClick={(e) => e.stopPropagation()}>
            {/* Pinned Drawer Header */}
            <div className="bigin-drawer-head">
              <div className="bigin-drawer-title-wrap">
                <span
                  className="set-drawer-icon"
                  style={{
                    background: tint?.bg || "#f1f5f9",
                    color: tint?.color || "#0ba360",
                  }}
                >
                  {P(ICONS[active.icon])}
                </span>
                <div>
                  <h3 className="bigin-drawer-title">{active.title}</h3>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>
                    {active.desc}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="bigin-drawer-close"
                onClick={() => setActive(null)}
                aria-label="Close drawer"
              >
                ×
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="bigin-drawer-body" style={{ padding: "20px 24px" }}>
              {active.kind === "lookup" && (
                <div>
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "10px 14px",
                      marginBottom: 16,
                      fontSize: 12,
                      color: "#475569",
                    }}
                  >
                    💡 <b>Enterprise Dictionary:</b> Configure unique codes, English & Arabic descriptions, and active status for <b>{active.title}</b>. Changes immediately apply across all estimation and commercial modules.
                  </div>
                  <LookupManager type={active.lookup} />
                </div>
              )}

              {Panel && <Panel />}
            </div>

            {/* Pinned Bottom Drawer Footer */}
            <div className="bigin-drawer-foot">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setActive(null)}
              >
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
