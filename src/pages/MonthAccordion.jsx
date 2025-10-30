// src/components/MonthAccordion.jsx
import React, { useEffect, useState } from "react";
import "./AdminData.css";

/** DayAccordion: shows FG list for a day */
function DayAccordion({ dayKey, fgList, formatTimestamp, expandAll }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(Boolean(expandAll === true)), [expandAll]);

  const items = Array.isArray(fgList) ? fgList : Object.values(fgList || []);
  return (
    <div className="day-section">
      <div className="day-header" onClick={() => setOpen((v) => !v)}>
        <span>📅 {dayKey} (Total: {items.length})</span>
        <span>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div className="day-children">
          {items.map((it, idx) => (
            <div key={it.id || idx} className="month-item">
              <div className="fg">{it.fgNumber}</div>
              <div className="date">({formatTimestamp ? formatTimestamp(it.timestamp) : ""})</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** WeekAccordion: shows days for a week */
function WeekAccordion({ weekKey, dayMap, formatTimestamp, expandAll }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(Boolean(expandAll === true)), [expandAll]);

  const weekTotal = Object.values(dayMap || {}).reduce((acc, arr) => {
    const list = Array.isArray(arr) ? arr : Object.values(arr || []);
    return acc + list.length;
  }, 0);

  return (
    <div className="week-section">
      <div className="week-header" onClick={() => setOpen((v) => !v)}>
        <span>├─ {weekKey} (Total: {weekTotal})</span>
        <span>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div className="week-children">
          {Object.entries(dayMap || {}).map(([dayKey, fgList]) => (
            <DayAccordion
              key={dayKey}
              dayKey={dayKey}
              fgList={fgList}
              formatTimestamp={formatTimestamp}
              expandAll={expandAll}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** MonthAccordion: shows weeks for a month (or Unknown items if Unknown) */
export default function MonthAccordion({
  monthKey,
  items = {},
  total = 0,
  formatTimestamp,
  expandAll = false,
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(Boolean(expandAll === true)), [expandAll]);

  // If monthKey === "Unknown", items is an array of flat items
  const isUnknown = monthKey === "Unknown";
  let computedTotal = total;
  if (!computedTotal) {
    if (isUnknown) computedTotal = Array.isArray(items) ? items.length : 0;
    else {
      computedTotal = Object.values(items || {}).reduce((sum, weekMap) => {
        return (
          sum +
          Object.values(weekMap || {}).reduce((s, arr) => {
            const list = Array.isArray(arr) ? arr : Object.values(arr || []);
            return s + list.length;
          }, 0)
        );
      }, 0);
    }
  }

  return (
    <div className="month-accordion">
      <div className="month-header" onClick={() => setOpen((v) => !v)}>
        <span>📅 {monthKey} (Total: {computedTotal})</span>
        <span>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div className="month-children">
          {isUnknown ? (
            // Unknown: flat list
            (Array.isArray(items) ? items : []).map((it) => (
              <div key={it.id} className="month-item">
                <div className="fg">{it.fgNumber}</div>
                <div className="date">{formatTimestamp(it.timestamp)}</div>
              </div>
            ))
          ) : (
            // Normal months: weeks -> days
            Object.entries(items || {}).map(([weekKey, dayMap]) => (
              <WeekAccordion
                key={weekKey}
                weekKey={weekKey}
                dayMap={dayMap}
                formatTimestamp={formatTimestamp}
                expandAll={expandAll}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
