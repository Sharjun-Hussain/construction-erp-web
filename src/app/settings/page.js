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

const TILES = [
  { key: "organization", icon: "🏢", bg: "#e8f3e8", kind: "panel", comp: "org" },
  { key: "department", icon: "👥", bg: "#eef3fb", kind: "lookup", lookup: "department" },
  { key: "designation", icon: "🪪", bg: "#e6f7f5", kind: "lookup", lookup: "designation" },
  { key: "roles", icon: "🔐", bg: "#f0f4ef", kind: "link", href: "/roles" },
  { key: "user", icon: "👤", bg: "#fdf6e3", kind: "link", href: "/users" },
  { key: "warehouse", icon: "🏭", bg: "#e3f0fc", kind: "lookup", lookup: "warehouse" },
  { key: "delivery_method", icon: "🚚", bg: "#fff4e6", kind: "lookup", lookup: "delivery_method" },
  { key: "payment_terms", icon: "📋", bg: "#e3f2fd", kind: "lookup", lookup: "payment_terms" },
  { key: "charge", icon: "🧾", bg: "#f3eefb", kind: "lookup", lookup: "charge" },
  { key: "currency_rate", icon: "💱", bg: "#e8f7ef", kind: "panel", comp: "fx" },
  { key: "cost_center", icon: "🎯", bg: "#fdf3e7", kind: "lookup", lookup: "cost_center" },
  { key: "bank", icon: "🏛️", bg: "#eceff4", kind: "panel", comp: "banks" },
  { key: "bank_account", icon: "💳", bg: "#eef3fb", kind: "panel", comp: "banks" },
  { key: "import_export", icon: "🔄", bg: "#eef2f7", kind: "panel", comp: "impex" },
  { key: "delivery_term", icon: "📄", bg: "#e3f6fb", kind: "lookup", lookup: "delivery_term" },
  { key: "terms_conditions", icon: "📝", bg: "#f3eefb", kind: "panel", comp: "terms" },
  { key: "approval_settings", icon: "🗂️", bg: "#eef3fb", kind: "panel", comp: "apprset" },
  { key: "enquiry_type", icon: "📞", bg: "#e0f7f5", kind: "lookup", lookup: "enquiry_type" },
  { key: "project_type", icon: "📑", bg: "#e3f2fd", kind: "lookup", lookup: "project_type" },
  { key: "job_category", icon: "📦", bg: "#fdf3e7", kind: "lookup", lookup: "job_category" },
  { key: "job_title", icon: "🔧", bg: "#eef3f1", kind: "lookup", lookup: "job_title" },
  { key: "labour_type", icon: "🛠️", bg: "#e3f6fb", kind: "lookup", lookup: "labour_type" },
  { key: "service_type", icon: "🤝", bg: "#fdf6e3", kind: "lookup", lookup: "service_type" },
  { key: "service_type_category", icon: "⚙️", bg: "#eef2f7", kind: "lookup", lookup: "service_type_category" },
  { key: "vat", icon: "🧮", bg: "#fff8e6", kind: "panel", comp: "vat" },
  { key: "fiscal_year", icon: "📅", bg: "#eef3fb", kind: "panel", comp: "fiscal" },
  { key: "entry_close", icon: "🔒", bg: "#fdeeee", kind: "panel", comp: "locks" },
  { key: "report_pdf", icon: "📕", bg: "#fdf3e7", kind: "panel", comp: "reportpdf" },
  { key: "business_type", icon: "💼", bg: "#e3f0fc", kind: "lookup", lookup: "business_type" },
  { key: "employee_rate", icon: "👷", bg: "#eef3fb", kind: "panel", comp: "emprate" },
  { key: "site", icon: "🏗️", bg: "#fff8e6", kind: "lookup", lookup: "site" },
  { key: "expense_category", icon: "💰", bg: "#fff4e6", kind: "lookup", lookup: "expense_category" },
  { key: "reminder", icon: "🔔", bg: "#fff8e6", kind: "panel", comp: "reminders" },
  { key: "email_template", icon: "✉️", bg: "#fdf3e7", kind: "panel", comp: "email" },
  { key: "approvals", icon: "✅", bg: "#e8f7ef", kind: "panel", comp: "inbox" },
  { key: "custom_field", icon: "✏️", bg: "#e3f6fb", kind: "panel", comp: "customfields" },
  { key: "item_category", icon: "🗃️", bg: "#eef3fb", kind: "lookup", lookup: "item_category" },
  { key: "uom", icon: "📏", bg: "#fff8e6", kind: "lookup", lookup: "uom" },
  { key: "manufacturer", icon: "🏭", bg: "#e3f0fc", kind: "lookup", lookup: "manufacturer" },
  { key: "bank_guarantee_category", icon: "🏦", bg: "#eceff4", kind: "lookup", lookup: "bank_guarantee_category" },
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

  const open = (tile) => {
    if (tile.kind === "link") { window.location.href = tile.href; return; }
    setActive(tile);
  };
  const Panel = active?.kind === "panel" ? PANELS[active.comp] : null;

  return (
    <div>
      <div className="page-head">
        <div><h2>{t(lang, "settings")}</h2></div>
      </div>
      <div className="set-tiles">
        {TILES.map((tile) => (
          <button key={tile.key} type="button" className="set-tile" onClick={() => open(tile)}>
            <span className="set-tile-icon" style={{ background: tile.bg }}>{tile.icon}</span>
            <span className="set-tile-label">{t(lang, "set_tile_" + tile.key)}</span>
          </button>
        ))}
      </div>

      {active && active.kind !== "link" && (
        <div className="drawer-ov" onClick={() => setActive(null)}>
          <div className="drawer wide" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-h">
              <h3><span style={{ marginInlineEnd: 8 }}>{active.icon}</span>{t(lang, "set_tile_" + active.key)}</h3>
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
