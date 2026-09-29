"use client";
import Link from "next/link";
import { t } from "@/lib/i18n";

const ROUTE_KEY = {
  dashboard: "dashboard",
  projects: "projects",
  boqs: "boq",
  estimations: "estimation",
  tenders: "tenders",
  procurement: "procurement",
  inventory: "inventorySection",
  product: "product",
  pricelist: "priceLists",
  pos: "purchaseOrders",
  grns: "grn",
  suppliers: "suppliers",
  indents: "materialIndents",
  subcontract: "subcontract",
  site: "site",
  ipc: "ipc",
  settings: "settings",
  users: "users",
  roles: "roles",
  organizations: "organization",
  sales: "sales",
  quotation: "quotation",
  quotations: "quotation",
  order: "Sales Order",
  orders: "Sales Order",
  department: "Department",
  departments: "Department",
  warehouse: "Warehouses",
  warehouses: "Warehouses",
};

// Routes where project context doesn't belong
const GLOBAL_ROUTES = new Set(["settings", "users", "roles", "organizations", "login", "sales"]);

const isIdSeg = (s) => /^[0-9a-f]{8,}(-[0-9a-f]{4,}){0,4}$/i.test(s) || /^\d+$/.test(s);
const humanize = (s) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const HomeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const FolderIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const Chevron = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="crumb-chevron">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export default function Breadcrumb({ lang, path, projectCode }) {
  if (!path || path === "/login") return null;

  const allSeg = path.split("/").filter(Boolean);
  const isHome = allSeg.length === 0 || allSeg[0] === "dashboard";
  const primaryRoute = allSeg[0] || "";
  const isGlobalRoute = GLOBAL_ROUTES.has(primaryRoute);

  const labelOf = (s) => (ROUTE_KEY[s] ? t(lang, ROUTE_KEY[s]) || humanize(s) : humanize(s));

  const acc = [];
  const crumbs = [];
  allSeg.forEach((s) => {
    acc.push(s);
    if (!isIdSeg(s)) {
      crumbs.push({ label: labelOf(s), href: "/" + acc.join("/") });
    }
  });

  // Only show active project badge if route is not explicitly global
  const showProjectBadge = Boolean(projectCode && !isGlobalRoute);

  return (
    <nav className="crumbs" aria-label="breadcrumb">
      {/* Home / Dashboard link */}
      <Link href="/dashboard" className="crumb-item" title={t(lang, "dashboard") || "Dashboard"}>
        <HomeIcon />
        <span>{t(lang, "dashboard") || "Dashboard"}</span>
      </Link>

      {!isHome && (
        <>
          <Chevron />

          {/* Project Badge if in project-scoped context */}
          {showProjectBadge && (
            <>
              <span className="crumb-proj-pill" title={`Active Project: ${projectCode}`}>
                <FolderIcon />
                <span>{projectCode}</span>
              </span>
              <Chevron />
            </>
          )}

          {/* Path segments */}
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={c.href || i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                {isLast ? (
                  <span className="crumb-now" aria-current="page">
                    {c.label}
                  </span>
                ) : (
                  <>
                    <Link href={c.href} className="crumb-item">
                      {c.label}
                    </Link>
                    <Chevron />
                  </>
                )}
              </span>
            );
          })}
        </>
      )}

      {isHome && projectCode && (
        <>
          <Chevron />
          <span className="crumb-proj-pill" title={`Active Project: ${projectCode}`}>
            <FolderIcon />
            <span>{projectCode}</span>
          </span>
        </>
      )}
    </nav>
  );
}
