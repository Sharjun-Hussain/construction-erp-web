"use client";
import { useState } from "react";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import LookupManager from "@/components/settings/LookupManager";
import {
  FxPanel, BanksPanel, FiscalPanel, LocksPanel, TermsPanel, ApprovalSettingsPanel,
  ApprovalsInbox, VatPanel, EmailPanel, RemindersPanel, CustomFieldsPanel,
  EmployeeRatesPanel, ImportExportPanel, ReportPdfPanel, OrgPanel,
} from "@/components/settings/MasterPanels";

const P = (d) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
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
  blue: { color: "#1d5bd8", bg: "#e9f0fd" }, green: { color: "#178a54", bg: "#e2f5ea" },
  amber: { color: "#a86a12", bg: "#fdf1dc" }, violet: { color: "#6d5bd0", bg: "#efedfb" },
  cyan: { color: "#0891b2", bg: "#e0f5fa" }, rose: { color: "#cf3d3d", bg: "#fdecec" },
  slate: { color: "#475569", bg: "#eef2f7" }, orange: { color: "#c2570b", bg: "#fdf1e3" },
};

const TILES = {
  organization: { icon: "building", tint: "blue", kind: "panel", comp: "org" },
  department: { icon: "users", tint: "violet", kind: "lookup", lookup: "department" },
  designation: { icon: "id", tint: "cyan", kind: "lookup", lookup: "designation" },
  roles: { icon: "shield", tint: "green", kind: "link", href: "/roles" },
  user: { icon: "user", tint: "amber", kind: "link", href: "/users" },
  warehouse: { icon: "warehouse", tint: "orange", kind: "lookup", lookup: "warehouse" },
  delivery_method: { icon: "truck", tint: "orange", kind: "lookup", lookup: "delivery_method" },
  payment_terms: { icon: "clipboard", tint: "blue", kind: "lookup", lookup: "payment_terms" },
  charge: { icon: "receipt", tint: "rose", kind: "lookup", lookup: "charge" },
  currency_rate: { icon: "dollar", tint: "green", kind: "panel", comp: "fx" },
  cost_center: { icon: "target", tint: "violet", kind: "lookup", lookup: "cost_center" },
  bank: { icon: "bank", tint: "slate", kind: "panel", comp: "banks" },
  bank_account: { icon: "card", tint: "blue", kind: "panel", comp: "banks" },
  import_export: { icon: "arrows", tint: "blue", kind: "panel", comp: "impex" },
  delivery_term: { icon: "file", tint: "cyan", kind: "lookup", lookup: "delivery_term" },
  terms_conditions: { icon: "book", tint: "violet", kind: "panel", comp: "terms" },
  approval_settings: { icon: "sliders", tint: "amber", kind: "panel", comp: "apprset" },
  enquiry_type: { icon: "phone", tint: "cyan", kind: "lookup", lookup: "enquiry_type" },
  project_type: { icon: "layers", tint: "blue", kind: "lookup", lookup: "project_type" },
  job_category: { icon: "box", tint: "amber", kind: "lookup", lookup: "job_category" },
  job_title: { icon: "tag", tint: "slate", kind: "lookup", lookup: "job_title" },
  labour_type: { icon: "usercheck", tint: "cyan", kind: "lookup", lookup: "labour_type" },
  service_type: { icon: "wrench", tint: "green", kind: "lookup", lookup: "service_type" },
  service_type_category: { icon: "grid", tint: "violet", kind: "lookup", lookup: "service_type_category" },
  vat: { icon: "percent", tint: "amber", kind: "panel", comp: "vat" },
  fiscal_year: { icon: "calendar", tint: "blue", kind: "panel", comp: "fiscal" },
  entry_close: { icon: "lock", tint: "rose", kind: "panel", comp: "locks" },
  report_pdf: { icon: "file", tint: "rose", kind: "panel", comp: "reportpdf" },
  business_type: { icon: "briefcase", tint: "slate", kind: "lookup", lookup: "business_type" },
  employee_rate: { icon: "trend", tint: "green", kind: "panel", comp: "emprate" },
  site: { icon: "pin", tint: "orange", kind: "lookup", lookup: "site" },
  expense_category: { icon: "coins", tint: "amber", kind: "lookup", lookup: "expense_category" },
  reminder: { icon: "bell", tint: "amber", kind: "panel", comp: "reminders" },
  email_template: { icon: "mail", tint: "cyan", kind: "panel", comp: "email" },
  approvals: { icon: "inbox", tint: "green", kind: "panel", comp: "inbox" },
  custom_field: { icon: "edit", tint: "violet", kind: "panel", comp: "customfields" },
  item_category: { icon: "archive", tint: "blue", kind: "lookup", lookup: "item_category" },
  uom: { icon: "ruler", tint: "cyan", kind: "lookup", lookup: "uom" },
  manufacturer: { icon: "factory", tint: "slate", kind: "lookup", lookup: "manufacturer" },
  bank_guarantee_category: { icon: "shield", tint: "green", kind: "lookup", lookup: "bank_guarantee_category" },
};

const SECTIONS = [
  { key: "org", tiles: ["organization", "department", "designation", "roles", "user"] },
  { key: "project", tiles: ["site", "project_type", "job_category", "job_title", "labour_type", "service_type", "service_type_category", "enquiry_type"] },
  { key: "finance", tiles: ["bank", "bank_account", "bank_guarantee_category", "vat", "fiscal_year", "currency_rate", "cost_center", "charge", "expense_category", "payment_terms", "business_type"] },
  { key: "docs", tiles: ["delivery_method", "delivery_term", "terms_conditions", "approval_settings", "approvals", "report_pdf"] },
  { key: "inventory", tiles: ["warehouse", "item_category", "uom", "manufacturer"] },
  { key: "productivity", tiles: ["reminder", "email_template", "custom_field", "import_export", "entry_close", "employee_rate"] },
];

const PANELS = {
  org: OrgPanel, fx: FxPanel, banks: BanksPanel, fiscal: FiscalPanel, locks: LocksPanel,
  terms: TermsPanel, apprset: ApprovalSettingsPanel, inbox: ApprovalsInbox, vat: VatPanel,
  email: EmailPanel, reminders: RemindersPanel, customfields: CustomFieldsPanel,
  emprate: EmployeeRatesPanel, impex: ImportExportPanel, reportpdf: ReportPdfPanel,
};

export default function SettingsHub() {
  const { lang } = useAppStore();
  const [active, setActive] = useState(null);

  const open = (key) => {
    const tile = { key, ...TILES[key] };
    if (tile.kind === "link") { window.location.href = tile.href; return; }
    setActive(tile);
  };
  const Panel = active?.kind === "panel" ? PANELS[active.comp] : null;
  const tint = active ? T[active.tint] : null;

  return (
    <div>
      <div className="page-head">
        <div><h2>{t(lang, "settings")}</h2><p className="sub">{t(lang, "set_hub_sub")}</p></div>
      </div>

      {SECTIONS.map((sec) => (
        <div key={sec.key} className="set-sec">
          <div className="set-sec-head">
            <span className="set-sec-title">{t(lang, "set_sec_" + sec.key)}</span>
            <span className="set-sec-count">{sec.tiles.length}</span>
          </div>
          <div className="set-tiles">
            {sec.tiles.map((key) => {
              const tile = TILES[key];
              const tc = T[tile.tint];
              return (
                <button key={key} type="button" className="set-tile" onClick={() => open(key)}>
                  <span className="set-tile-icon" style={{ background: tc.bg, color: tc.color }}>{P(ICONS[tile.icon])}</span>
                  <span className="set-tile-label">{t(lang, "set_tile_" + key)}</span>
                  <span className="set-tile-go">→</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {active && active.kind !== "link" && (
        <div className="drawer-ov" onClick={() => setActive(null)}>
          <div className="drawer wide" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-h">
              <h3 style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="set-drawer-icon" style={{ background: tint.bg, color: tint.color }}>{P(ICONS[active.icon])}</span>
                {t(lang, "set_tile_" + active.key)}
              </h3>
              <button className="btn ghost sm" onClick={() => setActive(null)}>×</button>
            </div>
            {active.kind === "lookup" && <LookupManager type={active.lookup} />}
            {Panel && <Panel />}
          </div>
        </div>
      )}
    </div>
  );
}
