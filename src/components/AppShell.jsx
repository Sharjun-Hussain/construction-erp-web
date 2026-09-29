"use client";
import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [userMenuOpen]);

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

  const userInitial = (user?.name || "Admin")[0].toUpperCase();
  const companyName = user?.organization?.name || "Qulf Contracting LLC";

  return (
    <div className={"shell" + (SHOW_SIDEBAR ? "" : " no-sidebar")}>
      {SHOW_SIDEBAR && (
        <Sidebar
          lang={lang} path={path} user={user}
          orgName={companyName}
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

          {/* 1. APP BRAND & LOGO */}
          <Link href="/dashboard" className="topbar-brand-link" title="Qulf QS ERP Dashboard">
            <div className="topbar-brand-badge">
              <span>Q</span>
            </div>
            <div className="topbar-brand-text">
              <span className="topbar-app-title">Qulf</span>
              <span className="topbar-app-tag">QS ERP</span>
            </div>
          </Link>

          <div className="topbar-v-divider" />

          {/* 2. COMPANY / ORGANIZATION NAME */}
          <div className="topbar-company-badge" title={companyName}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ba360" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18" /><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
              <path d="M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1" />
            </svg>
            <span className="topbar-company-name">{companyName}</span>
          </div>

          <div className="topbar-v-divider" />

          {/* 3. BREADCRUMBS */}
          <Breadcrumb lang={lang} path={path} projectCode={(projects.find((p) => p.id === projectId) || {}).code || ""} />

          <span className="spacer" />

          {/* 4. ACTIONS: MEGA MENU & LANGUAGE */}
          <button className="langbtn megabtn" onClick={() => setMegaOpen(true)} aria-label="menu">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
            {t(lang, "mm_menu")}
          </button>

          <button className="langbtn" onClick={() => setLang(lang === "en" ? "ar" : "en")}>
            {lang === "en" ? "العربية" : "English"}
          </button>

          <div className="topbar-v-divider" />

          {/* 5. USER PROFILE BUTTON & POPOVER */}
          <div className="topbar-user-wrap" ref={profileRef}>
            <button
              type="button"
              className="topbar-user-btn"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-label="User Profile"
            >
              <div className="topbar-avatar-badge">
                <span>{userInitial}</span>
                <span className="topbar-online-dot" />
              </div>
              <div className="topbar-user-info">
                <span className="topbar-user-name">{user?.name || "Admin"}</span>
                <span className="topbar-user-role">{user?.roles?.[0]?.name || "Super Admin"}</span>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "#94a3b8", marginInlineStart: 2 }}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {userMenuOpen && (
              <div className="topbar-user-popover">
                <div className="topbar-pop-head">
                  <div className="topbar-pop-avatar">
                    {userInitial}
                  </div>
                  <div className="topbar-pop-details">
                    <div className="topbar-pop-name">{user?.name || "Admin User"}</div>
                    <div className="topbar-pop-email">{user?.email || "admin@qulf.sa"}</div>
                    <span className="topbar-pop-role-tag">{user?.roles?.[0]?.name || "Super Admin"}</span>
                  </div>
                </div>

                <div className="topbar-pop-divider" />

                <div className="topbar-pop-company">
                  <span className="topbar-pop-lbl">Organization</span>
                  <div className="topbar-pop-val">{companyName}</div>
                  {user?.branches?.[0]?.name && (
                    <div className="topbar-pop-sub">Branch: {user.branches[0].name}</div>
                  )}
                </div>

                <div className="topbar-pop-divider" />

                <div className="topbar-pop-actions">
                  <Link
                    href="/settings"
                    className="topbar-pop-link"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <span>System Settings</span>
                  </Link>

                  <button
                    type="button"
                    className="topbar-pop-link logout"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="page">
          {children}
        </div>
      </div>
      <MegaMenu open={megaOpen} onClose={() => setMegaOpen(false)} onLogout={logout} path={path} projects={projects} />
    </div>
  );
}
