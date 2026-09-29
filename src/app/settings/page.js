"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

export default function Settings() {
  const router = useRouter();
  const { lang, setLang } = useAppStore();
  const [user, setUser] = useState(null);
  useEffect(() => { api.get("/auth/me").then((r) => setUser(r.data.data)).catch(() => {}); }, []);

  const logout = () => {
    localStorage.removeItem("qulf_access");
    document.cookie = "qulf_access=; path=/; max-age=0; SameSite=Lax";
    router.replace("/login");
    router.refresh();
  };

  return (
    <div>
      <div className="page-head"><h2>{t(lang, "settings")}</h2></div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <div className="card">
          <h3>{t(lang, "account")}</h3>
          <p style={{ margin: "4px 0", color: "var(--muted)", fontSize: 13 }}>{user?.organization?.name || "-"}</p>
          <p style={{ margin: "4px 0" }}><b>{user?.name || "-"}</b></p>
          <p style={{ margin: "4px 0", color: "var(--muted)", fontSize: 13 }}>{user?.email || "-"}</p>
        </div>
        <div className="card">
          <h3>{t(lang, "preferences")}</h3>
          <label className="label">{t(lang, "language")}</label>
          <div className="tabs">
            <button type="button" className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>English</button>
            <button type="button" className={lang === "ar" ? "on" : ""} onClick={() => setLang("ar")}>العربية</button>
          </div>
          <button className="btn ghost" onClick={logout}>{t(lang, "logout")}</button>
        </div>
        <div className="card">
          <h3>Qulf ERP</h3>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>v0.4 · {t(lang, "appVersion")}</p>
        </div>
      </div>
    </div>
  );
}
