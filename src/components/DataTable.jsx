"use client";
import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/useAppStore";

// Bigin Custom Checkbox Component (squircle with smooth checkmark and indeterminate state)
export function BiginCheckbox({ checked, indeterminate, onChange, title, disabled }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);

  return (
    <label className="bigin-cb-wrap" title={title} onClick={(e) => e.stopPropagation()}>
      <input
        ref={ref}
        type="checkbox"
        className="bigin-cb-input"
        checked={Boolean(checked)}
        onChange={onChange}
        disabled={disabled}
      />
      <span className={"bigin-cb-custom" + (checked ? " checked" : "") + (indeterminate ? " indeterminate" : "")}>
        {checked && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {indeterminate && !checked && (
          <span className="bigin-cb-minus" />
        )}
      </span>
    </label>
  );
}

// Bigin Avatar Circle Component (matches Bigin's circular monogram badge e.g. "II Ilyas Ilyas")
export function BiginAvatar({ name = "", color = "#0ba360", size = 28, showName = true, subline = "" }) {
  const parts = String(name).trim().split(/\s+/);
  const initials = parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (parts[0] ? parts[0].slice(0, 2).toUpperCase() : "Q");

  return (
    <div className="bigin-avatar-cell" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span
        className="bigin-avatar-circle"
        style={{
          background: color,
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          color: "#fff",
          fontWeight: 700,
          fontSize: size <= 28 ? 11 : 12,
        }}
      >
        {initials}
      </span>
      {showName && (
        <div style={{ display: "inline-flex", flexDirection: "column", minWidth: 0, textAlign: "left" }}>
          <span className="bigin-avatar-name" style={{ fontWeight: 600, color: "var(--fg)" }}>
            {name || "—"}
          </span>
          {subline ? (
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, lineHeight: 1.2 }}>
              {subline}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function DataTable({
  columns,
  rows = [],
  total = 0,
  page = 1,
  limit = 10,
  onPage,
  onLimit,
  sortBy,
  sortDir,
  onSort,
  selected = [],
  onSelect,
  keyOf = (r) => r.id,
  stats = [],
  bulkActions = [],
  loading = false,
  // Bigin specific toolbar options
  title = "",
  filterOptions = [],
  activeFilter = "",
  onFilterChange,
  onFilterSelect,
  search = "",
  searchValue,
  searchPlaceholder,
  onSearchChange,
  onAdd,
  addLabel = "+ Add",
  primaryAction,
  counts,
  viewMode = "list",
  onViewModeChange,
  onExport,
  rightActions,
}) {
  const { lang } = useAppStore();
  const [filterOpen, setFilterOpen] = useState(false);
  const [kebabOpen, setKebabOpen] = useState(false);
  const [bulkMoreOpen, setBulkMoreOpen] = useState(false);
  const filterRef = useRef(null);
  const kebabRef = useRef(null);
  const bulkMoreRef = useRef(null);

  // Close dropdowns when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterOpen(false);
      }
      if (kebabRef.current && !kebabRef.current.contains(event.target)) {
        setKebabOpen(false);
      }
      if (bulkMoreRef.current && !bulkMoreRef.current.contains(event.target)) {
        setBulkMoreOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setFilterOpen(false);
        setKebabOpen(false);
        setBulkMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("touchstart", handleClickOutside, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("touchstart", handleClickOutside, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const ids = rows.map((r) => keyOf(r));
  const allChecked = ids.length > 0 && ids.every((id) => selected.includes(id));
  const someChecked = ids.some((id) => selected.includes(id));

  const toggleAll = () => {
    if (allChecked) onSelect?.(selected.filter((id) => !ids.includes(id)));
    else onSelect?.([...new Set([...selected, ...ids])]);
  };

  const toggleOne = (id) => {
    if (!onSelect) return;
    onSelect(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const pages = Math.max(1, Math.ceil((total || 0) / (limit || 10)));
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(total, page * limit);
  const handleAdd = primaryAction?.onClick || onAdd;
  const rawAddLabel = primaryAction?.label || addLabel || "Add";
  const cleanAddLabel = String(rawAddLabel).replace(/^(\s*\+\s*)+/, "").trim();
  const isClosing = cleanAddLabel.toLowerCase().includes("close");
  const actualSearch = searchValue !== undefined ? searchValue : search;
  const actualPlaceholder = searchPlaceholder || (t(lang, "search") + "...");
  const handleFilterSelect = (val) => {
    if (onFilterSelect) onFilterSelect(val);
    if (onFilterChange) onFilterChange(val);
  };

  return (
    <div className="bigin-dt-container">
      {/* 1. TOP BIGIN TOOLBAR (Replaced in-place when checkboxes are selected, matching Zoho Bigin) */}
      <div className={"bigin-toolbar" + (selected.length > 0 ? " bulk-active" : "")}>
        {selected.length > 0 ? (
          <div className="bigin-bulk-toolbar-inner">
            <div className="bigin-bulk-left">
              {/* Primary Bulk Action Button (Matching Bigin [ ✉ Send Mail ] or [ ✕ Delete Selected ]) */}
              {bulkActions[0] && (
                <button
                  type="button"
                  className={"bigin-bulk-primary-btn" + (bulkActions[0].danger ? " danger" : "")}
                  onClick={() => bulkActions[0].onClick(selected)}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    {bulkActions[0].danger ? (
                      <>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </>
                    ) : (
                      <>
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </>
                    )}
                  </svg>
                  <span>{bulkActions[0].label}</span>
                </button>
              )}

              {/* More Actions Pill Dropdown */}
              {(bulkActions.length > 1 || onExport) && (
                <div className="bigin-filter-wrap" ref={bulkMoreRef}>
                  <button
                    type="button"
                    className="bigin-bulk-more-btn"
                    onClick={() => setBulkMoreOpen(!bulkMoreOpen)}
                  >
                    <span>More</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {bulkMoreOpen && (
                    <div className="bigin-dropdown-menu">
                      {bulkActions.slice(1).map((a) => (
                        <button
                          key={a.key}
                          type="button"
                          className={"bigin-dropdown-item" + (a.danger ? " danger-item" : "")}
                          onClick={() => {
                            a.onClick(selected);
                            setBulkMoreOpen(false);
                          }}
                        >
                          {a.label}
                        </button>
                      ))}
                      {onExport && (
                        <button
                          type="button"
                          className="bigin-dropdown-item"
                          onClick={() => {
                            onExport(selected);
                            setBulkMoreOpen(false);
                          }}
                        >
                          Export Selected
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Selection Counter & Select All in View Link & Deselect Cross (Directly matching Image 3) */}
              <div className="bigin-bulk-info-group">
                <span className="bigin-bulk-count-text">
                  {selected.length} {t(lang, "selectedLbl") || "Selected"}
                </span>
                <span className="bigin-bulk-dot">·</span>
                {!allChecked ? (
                  <button
                    type="button"
                    className="bigin-bulk-select-all-btn"
                    onClick={toggleAll}
                  >
                    Select all {ids.length} in this view
                  </button>
                ) : (
                  <span className="bigin-bulk-all-selected">
                    All {ids.length} in this view selected
                  </span>
                )}
                <button
                  type="button"
                  className="bigin-bulk-clear-icon"
                  onClick={() => onSelect?.([])}
                  title="Clear selection"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bigin-toolbar-left">
              {/* Filter Dropdown Pill */}
              <div className="bigin-filter-wrap" ref={filterRef}>
                <button
                  type="button"
                  className="bigin-filter-pill"
                  onClick={() => setFilterOpen(!filterOpen)}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  <span>{activeFilter || title || "All Records"}</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {filterOpen && filterOptions.length > 0 && (
                  <div className="bigin-dropdown-menu">
                    <div className="bigin-dropdown-header">Views & Filters</div>
                    {filterOptions.map((opt) => {
                      const val = typeof opt === "string" ? opt : opt.value;
                      const label = typeof opt === "string" ? opt : opt.label;
                      return (
                        <button
                          key={val}
                          type="button"
                          className={"bigin-dropdown-item" + (activeFilter === val ? " active" : "")}
                          onClick={() => {
                            handleFilterSelect(val);
                            setFilterOpen(false);
                          }}
                        >
                          <span>{label}</span>
                          {activeFilter === val && <span className="bigin-drop-check">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Search */}
              {onSearchChange && (
                <div className="bigin-search-pill">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder={actualPlaceholder}
                    value={actualSearch}
                    onChange={(e) => onSearchChange(e.target.value)}
                  />
                  {actualSearch && (
                    <button type="button" onClick={() => onSearchChange("")} className="bigin-search-clear">
                      ×
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="bigin-toolbar-right">
              {rightActions}

              {/* View Mode Toggle: List vs Kanban */}
              {onViewModeChange && (
                <div className="bigin-view-toggle">
                  <button
                    type="button"
                    className={"bigin-view-btn" + (viewMode === "list" ? " active" : "")}
                    onClick={() => onViewModeChange("list")}
                    title="List View"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={"bigin-view-btn" + (viewMode === "kanban" ? " active" : "")}
                    onClick={() => onViewModeChange("kanban")}
                    title="Kanban View"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="18" rx="1.5" />
                      <rect x="14" y="3" width="7" height="11" rx="1.5" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Primary Action Button (Bigin Green Pill Button) */}
              {handleAdd && (
                <button
                  type="button"
                  className={"bigin-add-btn" + (isClosing ? " close-state" : "")}
                  onClick={handleAdd}
                  title={primaryAction?.title || `New ${cleanAddLabel}`}
                >
                  {isClosing ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )}
                  <span>{cleanAddLabel}</span>
                </button>
              )}

              {/* Kebab More Options Button */}
              <div className="bigin-kebab-wrap" ref={kebabRef}>
                <button
                  type="button"
                  className="bigin-icon-btn"
                  onClick={() => setKebabOpen(!kebabOpen)}
                  title="More Actions"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>
                {kebabOpen && (
                  <div className="bigin-dropdown-menu right">
                    {onExport && (
                      <button
                        type="button"
                        className="bigin-dropdown-item"
                        onClick={() => {
                          onExport();
                          setKebabOpen(false);
                        }}
                      >
                        Export to Excel / CSV
                      </button>
                    )}
                    <button
                      type="button"
                      className="bigin-dropdown-item"
                      onClick={() => {
                        onPage?.(1);
                        setKebabOpen(false);
                      }}
                    >
                      Refresh Table
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. BIGIN DATA TABLE */}
      <div className="bigin-table-scroll">
        <table className="bigin-table">
          <thead>
            <tr>
              <th className="bigin-th-check">
                <BiginCheckbox
                  checked={allChecked}
                  indeterminate={!allChecked && someChecked}
                  onChange={toggleAll}
                  title="Select all"
                />
              </th>
              {columns.map((c) => {
                const isSorted = sortBy === c.key;
                return (
                  <th key={c.key} style={c.width ? { minWidth: c.width } : {}}>
                    {c.sortable ? (
                      <button
                        type="button"
                        className={"bigin-th-sort" + (isSorted ? " sorted" : "")}
                        onClick={() => onSort?.(c.key)}
                      >
                        <span>{c.label}</span>
                        <span className="bigin-sort-arrow">
                          {isSorted ? (sortDir === "ASC" ? " ↑" : " ↓") : ""}
                        </span>
                      </button>
                    ) : (
                      <span className="bigin-th-text">{c.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const id = keyOf(r);
              const isSelected = selected.includes(id);
              return (
                <tr
                  key={id}
                  className={"bigin-tr" + (isSelected ? " selected" : "")}
                  onClick={() => toggleOne(id)}
                >
                  <td className="bigin-td-check" onClick={(e) => e.stopPropagation()}>
                    <BiginCheckbox
                      checked={isSelected}
                      onChange={() => toggleOne(id)}
                    />
                  </td>
                  {columns.map((c) => (
                    <td key={c.key} className="bigin-td">
                      {c.render ? c.render(r) : r[c.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
            {!loading && !rows.length && (
              <tr>
                <td colSpan={columns.length + 1} className="bigin-empty-row">
                  <div className="bigin-empty-box">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                    </svg>
                    <span>{t(lang, "noResults")}</span>
                    {handleAdd && (
                      <button
                        type="button"
                        className="bigin-add-btn"
                        style={{ marginTop: 8 }}
                        onClick={handleAdd}
                      >
                        + {cleanAddLabel}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={columns.length + 1} className="bigin-empty-row">
                  <div className="bigin-loader-row">
                    <span className="bigin-spinner" />
                    <span>Loading data...</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. BIGIN STATUS BAR & PAGINATION FOOTER (Directly matching screenshot) */}
      <div className="bigin-footer">
        {/* Left Side: Summary Stats */}
        <div className="bigin-footer-stats">
          {(stats || []).map((s, i) => (
            <div key={i} className="bigin-stat-pill">
              <span className="bigin-stat-label">{s.label}</span>
              <span className="bigin-stat-dot">·</span>
              <span className="bigin-stat-val">{s.value ?? 0}</span>
            </div>
          ))}
        </div>

        {/* Right Side: Records per page & Range Navigation */}
        <div className="bigin-footer-pager">
          <div className="bigin-per-page">
            <span>{t(lang, "perPage") || "Records per page"}</span>
            <select
              className="bigin-select-limit"
              value={limit}
              onChange={(e) => onLimit?.(Number(e.target.value))}
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="bigin-pager-nav">
            <button
              type="button"
              className="bigin-nav-btn"
              disabled={page <= 1}
              onClick={() => onPage?.(page - 1)}
              title="Previous page"
            >
              ‹
            </button>
            <span className="bigin-range-text">
              {from} to {to} {total ? `of ${total}` : ""}
            </span>
            <button
              type="button"
              className="bigin-nav-btn"
              disabled={page >= pages}
              onClick={() => onPage?.(page + 1)}
              title="Next page"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
