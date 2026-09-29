"use client";
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
  pos: "purchaseOrders",
  grns: "grn",
  suppliers: "suppliers",
  indents: "materialIndents",
  subcontract: "subcontract",
  site: "site",
  ipc: "ipc",
  settings: "settings",
};

const isIdSeg = (s) => /^[0-9a-f]{8,}(-[0-9a-f]{4,}){0,4}$/i.test(s) || /^\d+$/.test(s);
const humanize = (s) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function Breadcrumb({ lang, path, projectCode }) {
  if (path === "/login") return null;
  const allSeg = path.split("/").filter(Boolean);
  const seg = allSeg.filter((s) => !isIdSeg(s));
  const isHome = seg.length === 0 || seg[0] === "dashboard";
  const labelOf = (s) => (ROUTE_KEY[s] ? t(lang, ROUTE_KEY[s]) : humanize(s));
  const acc = [];
  const crumbs = [];
  allSeg.forEach((s) => {
    acc.push(s);
    if (!isIdSeg(s)) crumbs.push({ label: labelOf(s), href: "/" + acc.join("/") });
  });

  return (
    <nav className="crumbs" aria-label="breadcrumb">
      <a href="/dashboard">{t(lang, "dashboard")}</a>
      {!isHome && (
        <>
          <span className="crumb-sep">›</span>
          {projectCode && <span className="crumb-proj">{projectCode}</span>}
          {projectCode && <span className="crumb-sep">›</span>}
          {crumbs.map((c, i) =>
            i < crumbs.length - 1 ? (
              <span key={i}>
                <a href={c.href}>{c.label}</a>
                <span className="crumb-sep"> › </span>
              </span>
            ) : (
              <span key={i} className="crumb-now">{c.label}</span>
            )
          )}
        </>
      )}
      {isHome && projectCode && (
        <>
          <span className="crumb-sep">›</span>
          <span className="crumb-now">{projectCode}</span>
        </>
      )}
    </nav>
  );
}
