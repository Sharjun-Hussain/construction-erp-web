"use client";
import { t } from "@/lib/i18n";

const ROUTE_KEY = {
  dashboard: "dashboard",
  projects: "projects",
  boqs: "boq",
  estimations: "estimation",
  tenders: "tenders",
  procurement: "procurement",
  subcontract: "subcontract",
  site: "site",
  ipc: "ipc",
  settings: "settings",
};

export default function Breadcrumb({ lang, path, projectCode }) {
  if (path === "/login") return null;
  const seg = path.split("/").filter(Boolean)[0] || "dashboard";
  const key = ROUTE_KEY[seg] || "dashboard";
  const isHome = seg === "dashboard";
  return (
    <nav className="crumbs" aria-label="breadcrumb">
      <a href="/dashboard">{t(lang, "dashboard")}</a>
      {!isHome && (
        <>
          <span className="crumb-sep">›</span>
          {projectCode && <span className="crumb-proj">{projectCode}</span>}
          {projectCode && <span className="crumb-sep">›</span>}
          <span className="crumb-now">{t(lang, key)}</span>
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
