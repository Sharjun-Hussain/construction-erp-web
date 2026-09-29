"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";
import Sidebar from "@/components/Sidebar";
import Breadcrumb from "@/components/Breadcrumb";
import MegaMenu from "@/components/MegaMenu";

export default function AppShell({ children }) {
  const SHOW_SIDEBAR = false; // sidebar hidden for now — mega menu is the navigation
  const path = usePathname();
  const router = useRouter();
  const { lang, setLang, projectId, setProjectId } = useAppStore();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  useEffect(() => {
    if (path === "/login") return;
    const token = typeof window !== "undefined" ? localStorage.getItem("qulf_access") : null;
    if (!token) {
      document.cookie = "qulf_access=; path=/; max-age=0; SameSite=Lax";
      router.replace("/login");
      return;
    }
    // Ensure cookie matches localStorage for server middleware consistency
    document.cookie = `qulf_access=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;

    api.get("/auth/me").then((r) => setUser(r.data.data)).catch(() => {
      localStorage.removeItem("qulf_access");
      document.cookie = "qulf_access=; path=/; max-age=0; SameSite=Lax";
      router.replace("/login");
    });
    api.get("/projects").then((r) => {
      const list = r.data.data || [];
      setProjects(list);
      if (!projectId && list[0]) setProjectId(list[0].id);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  if (path === "/login") return <>{children}</>;

  const logout = () => {
    localStorage.removeItem("qulf_access");
    document.cookie = "qulf_access=; path=/; max-age=0; SameSite=Lax";
    router.replace("/login");
    router.refresh();
  };

  const selectProject = (id) => {
    setProjectId(id);
    localStorage.setItem("qulf_project", id);
    router.push("/projects/" + id);
  };

  return (
    <div className={"shell" + (SHOW_SIDEBAR ? "" : " no-sidebar")}>
      {SHOW_SIDEBAR && (
        <Sidebar
          lang={lang} path={path} user={user}
          orgName={user?.organization?.name || ""}
          projects={projects} projectId={projectId}
          onSelectProject={selectProject} onLogout={logout}
          mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)}
        />
      )}
      <div className="main">
        <div className="topbar">
          {SHOW_SIDEBAR && (
            <button className="hamburger" onClick={() => setMobileOpen(true)} aria-label="menu">
              <span /><span /><span />
            </button>
          )}
          <Breadcrumb lang={lang} path={path} projectCode={(projects.find((p) => p.id === projectId) || {}).code || ""} />
          <span className="spacer" />
          <button className="langbtn megabtn" onClick={() => setMegaOpen(true)} aria-label="menu">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
            {t(lang, "mm_menu")}
          </button>
          <button className="langbtn" onClick={() => setLang(lang === "en" ? "ar" : "en")}>{lang === "en" ? "العربية" : "English"}</button>
        </div>
        <div className="page">
          {children}
        </div>
      </div>
      <MegaMenu open={megaOpen} onClose={() => setMegaOpen(false)} onLogout={logout} path={path} projects={projects} />
    </div>
  );
}
