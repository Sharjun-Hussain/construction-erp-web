"use client";
import { useState, useEffect } from "react";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

const Svg = ({ children }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const ICONS = {
  dashboard: (
    <Svg>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Svg>
  ),
  projects: (
    <Svg>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M12 12v3" />
      <path d="M10 13.5h4" />
    </Svg>
  ),
  boq: (
    <Svg>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h8" />
      <path d="M10 9H8" />
    </Svg>
  ),
  estimation: (
    <Svg>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="16" y1="14" x2="16" y2="18" />
      <path d="M16 10h.01" />
      <path d="M12 10h.01" />
      <path d="M8 10h.01" />
      <path d="M12 14h.01" />
      <path d="M8 14h.01" />
      <path d="M12 18h.01" />
      <path d="M8 18h.01" />
    </Svg>
  ),
  tenders: (
    <Svg>
      <path d="m14 13-7.5 7.5a2.12 2.12 0 1 1-3-3L11 10" />
      <path d="m16 16 6-6" />
      <path d="m8 8 6-6" />
      <path d="m9 7 8 8" />
      <path d="m21 11-8-8" />
    </Svg>
  ),
  procurement: (
    <Svg>
      <circle cx="8" cy="21" r="1.5" />
      <circle cx="19" cy="21" r="1.5" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </Svg>
  ),
  subcontract: (
    <Svg>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  ),
  site: (
    <Svg>
      <path d="M2 20h20" />
      <path d="M5 20V8.5L12 3l7 5.5V20" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </Svg>
  ),
  ipc: (
    <Svg>
      <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </Svg>
  ),
  users: (
    <Svg>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Svg>
  ),
  roles: (
    <Svg>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  ),
  settings: (
    <Svg>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  ),
  logout: (
    <Svg>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </Svg>
  ),
};

const NAV_GROUPS = [
  {
    key: "commercial",
    titleKey: "commercial",
    items: [
      { href: "/dashboard", key: "dashboard", icon: "dashboard" },
      { href: "/projects", key: "projects", icon: "projects" },
      { href: "/boqs", key: "boq", icon: "boq", badge: "BOQ" },
      { href: "/estimations", key: "estimation", icon: "estimation", badge: "QS" },
      { href: "/tenders", key: "tenders", icon: "tenders" },
    ],
  },
  {
    key: "operations",
    titleKey: "operations",
    items: [
      { href: "/procurement", key: "procurement", icon: "procurement", badge: "3-Way" },
      { href: "/subcontract", key: "subcontract", icon: "subcontract" },
      { href: "/site", key: "site", icon: "site", badge: "DPR" },
      { href: "/ipc", key: "ipc", icon: "ipc", badge: "ZATCA" },
    ],
  },
  {
    key: "admin",
    titleKey: "administration",
    items: [
      { href: "/users", key: "users", icon: "users" },
      { href: "/roles", key: "roles", icon: "roles" },
    ],
  },
];

const DOTS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4", "#f97316"];
const dotColor = (id) => {
  let h = 0;
  const s = String(id || "0");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return DOTS[h % DOTS.length];
};

const load = (k, fb) => {
  try {
    return localStorage.getItem(k) ?? fb;
  } catch {
    return fb;
  }
};
const save = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

export default function Sidebar({
  lang: langProp,
  path,
  user,
  orgName,
  projects = [],
  projectId,
  onSelectProject,
  onLogout,
  mobileOpen,
  onNavigate,
}) {
  const { lang: storeLang, setLang } = useAppStore();
  const lang = langProp || storeLang || "en";

  const [menuOpen, setMenuOpen] = useState(false);
  const [projectSelectorOpen, setProjectSelectorOpen] = useState(false);
  const [q, setQ] = useState("");
  const [mini, setMini] = useState(() => load("qulf_mini", "0") === "1");

  const initial = (user?.name || "Admin")[0].toUpperCase();
  const currentProject = projects.find((p) => p.id === projectId) || projects[0];

  const toggleMini = () => {
    const next = !mini;
    setMini(next);
    save("qulf_mini", next ? "1" : "0");
  };

  const needle = q.trim().toLowerCase();

  // Filter groups
  const filteredGroups = NAV_GROUPS.map((group) => {
    const items = group.items.filter((item) => {
      if (!needle) return true;
      const title = t(lang, item.key).toLowerCase();
      return title.includes(needle);
    });
    return { ...group, items };
  }).filter((g) => g.items.length > 0);

  const filteredProjects = projects.filter((p) => {
    if (!needle) return true;
    return (
      (p.name || "").toLowerCase().includes(needle) ||
      (p.code || "").toLowerCase().includes(needle)
    );
  });

  const isRtl = lang === "ar";

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={"sb-scrim" + (mobileOpen ? " show" : "")}
        onClick={onNavigate}
        aria-hidden="true"
      />

      <aside className={"sb-root" + (mobileOpen ? " open" : "") + (mini ? " mini" : "")}>
        {/* TOP BRAND & WORKSPACE HEADER */}
        <div className="sb-brand-area">
          <div className="sb-brand-left">
            <div
              className={"sb-brand-mark" + (mini ? " clickable" : "")}
              onClick={mini ? toggleMini : undefined}
              title={mini ? `${t(lang, "expand")} · Qulf ERP` : "Qulf Construction QS ERP"}
              style={mini ? { cursor: "pointer" } : undefined}
            >
              <span>Q</span>
            </div>
            {!mini && (
              <div className="sb-brand-text">
                <div className="sb-brand-name">
                  <span>Qulf</span>
                  <span className="sb-badge-tag">QS ERP</span>
                </div>
                <div className="sb-org-name" title={orgName || "Qulf Contracting"}>
                  {orgName || "Qulf Contracting"}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            className="sb-mini-btn"
            onClick={toggleMini}
            title={mini ? t(lang, "expand") : t(lang, "collapse")}
            aria-label={mini ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: mini
                  ? isRtl
                    ? "none"
                    : "rotate(180deg)"
                  : isRtl
                  ? "rotate(180deg)"
                  : "none",
                transition: "transform 0.2s ease",
              }}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        {/* ACTIVE PROJECT SWITCHER CARD (Expanded only) */}
        {!mini && (
          <div className="sb-project-card-wrap">
            <button
              type="button"
              className="sb-project-card"
              onClick={() => setProjectSelectorOpen(!projectSelectorOpen)}
            >
              <span
                className="sb-project-dot"
                style={{ background: dotColor(currentProject?.id) }}
              />
              <div className="sb-project-meta">
                <span className="sb-project-label">{t(lang, "activeProject")}</span>
                <span className="sb-project-title">
                  {currentProject ? `${currentProject.code} · ${currentProject.name}` : t(lang, "projects")}
                </span>
              </div>
              <svg
                className={"sb-chevron" + (projectSelectorOpen ? " open" : "")}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {projectSelectorOpen && (
              <div className="sb-project-dropdown">
                <div className="sb-project-dropdown-head">
                  <span>{t(lang, "myProjects")}</span>
                  <a
                    href="/projects"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate?.();
                    }}
                    className="sb-add-link"
                  >
                    + {t(lang, "add")}
                  </a>
                </div>
                <div className="sb-project-dropdown-list">
                  {filteredProjects.map((p) => {
                    const isSelected = p.id === (currentProject?.id || projectId);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={"sb-project-option" + (isSelected ? " selected" : "")}
                        onClick={() => {
                          onSelectProject?.(p.id);
                          setProjectSelectorOpen(false);
                          onNavigate?.();
                        }}
                      >
                        <span className="sb-project-dot" style={{ background: dotColor(p.id) }} />
                        <div className="sb-project-opt-text">
                          <b>{p.name}</b>
                          <span>{p.code} · {p.status || "Active"}</span>
                        </div>
                        {isSelected && <span className="sb-check-icon">✓</span>}
                      </button>
                    );
                  })}
                  {!filteredProjects.length && (
                    <div className="sb-no-projects">{t(lang, "noProjects")}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEARCH BAR (Expanded only) */}
        {!mini && (
          <div className="sb-search-box">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder={t(lang, "search") + "..."}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q ? (
              <button type="button" onClick={() => setQ("")} className="sb-search-clear">
                ×
              </button>
            ) : (
              <span className="sb-kbd-hint">⌘K</span>
            )}
          </div>
        )}

        {/* SCROLLABLE NAVIGATION LINKS */}
        <div className="sb-nav-scroll">
          {filteredGroups.map((group) => (
            <div key={group.key} className="sb-nav-group">
              {!mini && (
                <div className="sb-group-title">
                  {t(lang, group.titleKey)}
                </div>
              )}
              {group.items.map((item) => {
                const isActive =
                  path === item.href ||
                  (item.href !== "/dashboard" && path?.startsWith(item.href));
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={t(lang, item.key)}
                    className={"sb-nav-item" + (isActive ? " active" : "")}
                  >
                    <span className="sb-nav-icon">{ICONS[item.icon]}</span>
                    {!mini && (
                      <>
                        <span className="sb-nav-label">{t(lang, item.key)}</span>
                        {item.badge && <span className="sb-nav-pill">{item.badge}</span>}
                      </>
                    )}
                  </a>
                );
              })}
            </div>
          ))}

          {/* Settings Link */}
          <div className="sb-nav-group" style={{ marginTop: "auto" }}>
            <a
              href="/settings"
              onClick={onNavigate}
              title={t(lang, "settings")}
              className={"sb-nav-item" + (path?.startsWith("/settings") ? " active" : "")}
            >
              <span className="sb-nav-icon">{ICONS.settings}</span>
              {!mini && <span className="sb-nav-label">{t(lang, "settings")}</span>}
            </a>
          </div>
        </div>

        {/* BOTTOM USER PROFILE & QUICK ACTIONS */}
        <div className="sb-footer">
          <div className="sb-user-card-wrap">
            <button
              type="button"
              className="sb-user-card"
              onClick={() => setMenuOpen(!menuOpen)}
              title={user?.name || "Admin"}
            >
              <div className="sb-avatar-wrap">
                <span className="sb-avatar">{initial}</span>
                <span className="sb-status-dot" />
              </div>
              {!mini && (
                <>
                  <div className="sb-user-meta">
                    <b>{user?.name || "Admin User"}</b>
                    <span>{user?.roles?.[0]?.name || t(lang, "adminRole")}</span>
                  </div>
                  <svg
                    className={"sb-user-chev" + (menuOpen ? " open" : "")}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </>
              )}
            </button>

            {/* Profile Popover Menu */}
            {menuOpen && (
              <div className="sb-profile-popover">
                <div className="sb-popover-header">
                  <b>{user?.name || "Admin"}</b>
                  <span>{user?.email || "admin@qulf.sa"}</span>
                </div>
                <div className="sb-popover-links">
                  <a href="/settings" onClick={() => { setMenuOpen(false); onNavigate?.(); }}>
                    <span className="sb-pop-icon">{ICONS.settings}</span>
                    <span>{t(lang, "settings")}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setLang(lang === "en" ? "ar" : "en");
                      setMenuOpen(false);
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                    </svg>
                    <span>{lang === "en" ? "العربية" : "English"}</span>
                  </button>
                  <button
                    type="button"
                    className="sb-pop-logout"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout?.();
                    }}
                  >
                    <span className="sb-pop-icon">{ICONS.logout}</span>
                    <span>{t(lang, "logout")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Language Switcher pill in expanded mode */}
          {!mini && (
            <div className="sb-lang-row">
              <button
                type="button"
                className="sb-lang-pill"
                onClick={() => setLang(lang === "en" ? "ar" : "en")}
                title="Switch Language"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
                <span>{lang === "en" ? "العربية" : "English"}</span>
              </button>
              <button
                type="button"
                className="sb-logout-icon-btn"
                onClick={onLogout}
                title={t(lang, "logout")}
              >
                {ICONS.logout}
              </button>
            </div>
          )}

          {/* Expand button in mini mode footer */}
          {mini && (
            <div className="sb-mini-footer-row">
              <button
                type="button"
                className="sb-mini-footer-expand-btn"
                onClick={toggleMini}
                title={t(lang, "expand")}
                aria-label="Expand sidebar"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: isRtl ? "rotate(180deg)" : "none",
                  }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
