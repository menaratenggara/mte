// src/components/AdminData.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { rtdb, storage } from "../firebase";
import {
  ref as dbRef,
  onValue,
  remove as dbRemove,
  query,
  orderByChild,
  equalTo,
  get,
} from "firebase/database";
import { ref as storageRef, deleteObject, listAll } from "firebase/storage";
import MonthAccordion from "./MonthAccordion";
import "./AdminData.css";

export default function AdminData({ onBack }) {
  const possibleImageKeys = [
    "imageUrl",
    "qrImageUrl",
    "checklistImageUrl",
    "quantityImageUrl",
  ];
  const orphanFolders = [
    "qr_codes",
    "qr_codes_delivers",
    "qr_codes_packs",
    "qr_codes_paints",
    "qr_codes_treats",
    "receives",
  ];

  const firstLoad = useRef(true);
  const [grouped, setGrouped] = useState({}); // monthKey -> weekMap OR "Unknown" -> array
  const [monthTotals, setMonthTotals] = useState({});
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonthsCount, setSelectedMonthsCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [expandAll, setExpandAll] = useState(false);
  const [viewMode, setViewMode] = useState("all");

  const parseDateToTimestamp = (dateStr) => {
    if (!dateStr) return 0;
    const parts = dateStr.split("/");
    if (parts.length !== 3) return 0;
    const [d, m, y] = parts.map((p) => parseInt(p, 10));
    if (Number.isNaN(d) || Number.isNaN(m) || Number.isNaN(y)) return 0;
    const dt = new Date(y, m - 1, d);
    if (isNaN(dt.getTime())) return 0;
    return dt.getTime();
  };

  const formatTimestamp = (ts) =>
    ts && ts > 0 ? new Date(ts).toLocaleDateString("en-GB") : "Unknown Date";

  useEffect(() => {
    setLoading(true);
    const refReceive = dbRef(rtdb, "Receive");

    const unsubscribe = onValue(refReceive, (snapshot) => {
      const groupedMap = {}; // { "MM-yyyy": { "Week-1": { "dd/MM/yyyy": [items] } } }
      const totals = {}; // month totals
      groupedMap["Unknown"] = [];

      snapshot.forEach((child) => {
        const id = child.key;
        const fgNumber = child.child("fgNumber").val() || id || "UNKNOWN";
        const dateStr = child.child("receivingDate").val();
        const ts = parseDateToTimestamp(dateStr);

        if (ts <= 0) {
          groupedMap["Unknown"].push({ fgNumber, timestamp: 0, id });
          totals["Unknown"] = (totals["Unknown"] || 0) + 1;
          return;
        }

        const date = new Date(ts);
        const monthKey = `${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;

        // Determine Monday-based week number within the month
        const dayOfMonth = date.getDate();
        const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const firstDayWeekday = (firstDayOfMonth.getDay() + 6) % 7;
        const firstMonday = firstDayWeekday === 0 ? 1 : 8 - firstDayWeekday;
        const weekNumberInMonth = Math.floor((dayOfMonth - firstMonday + 7) / 7) + 1;
        const weekKey = `Week-${weekNumberInMonth}`;

        const dayKey = date.toLocaleDateString("en-GB"); // dd/MM/yyyy

        if (!groupedMap[monthKey]) groupedMap[monthKey] = {};
        if (!groupedMap[monthKey][weekKey]) groupedMap[monthKey][weekKey] = {};
        if (!groupedMap[monthKey][weekKey][dayKey])
          groupedMap[monthKey][weekKey][dayKey] = [];

        groupedMap[monthKey][weekKey][dayKey].push({ fgNumber, timestamp: ts, id });
        totals[monthKey] = (totals[monthKey] || 0) + 1;
      });

      // Remove Unknown if empty
      if (groupedMap["Unknown"].length === 0) delete groupedMap["Unknown"];

      // Sort weeks and days inside each month newest-first
      for (const monthKey of Object.keys(groupedMap)) {
        const month = groupedMap[monthKey];
        if (Array.isArray(month)) continue; // skip Unknown

        const sortedWeeks = {};
        Object.keys(month)
          .sort((a, b) => parseInt(b.replace("Week-", "")) - parseInt(a.replace("Week-", "")))
          .forEach((weekKey) => {
            const week = month[weekKey];
            const sortedDays = {};
            Object.keys(week)
              .sort((a, b) => parseDateToTimestamp(b) - parseDateToTimestamp(a))
              .forEach((dayKey) => {
                sortedDays[dayKey] = week[dayKey];
              });
            sortedWeeks[weekKey] = sortedDays;
          });
        groupedMap[monthKey] = sortedWeeks;
      }

      // Sort months newest-first
      const monthKeys = Object.keys(groupedMap)
        .filter((k) => k !== "Unknown")
        .sort((a, b) => {
          const [am, ay] = a.split("-").map(Number);
          const [bm, by] = b.split("-").map(Number);
          return new Date(by, bm - 1, 1) - new Date(ay, am - 1, 1);
        });
      if (groupedMap["Unknown"]) monthKeys.push("Unknown");

      setGrouped(groupedMap);
      setMonthTotals(totals);
      setAvailableMonths(monthKeys);

      if (firstLoad.current) {
        setSelectedMonthsCount(1);
        firstLoad.current = false;
      }

      setLoading(false);

    });

    return () => unsubscribe();
  }, []);

  const monthsToShow = useMemo(() => {
    if (!availableMonths || availableMonths.length === 0) return [];

    if (viewMode === "all") {
      return availableMonths;    // always show all months
    }

    // filtered mode (after deletion)
    return availableMonths.slice(0, selectedMonthsCount);
  }, [availableMonths, selectedMonthsCount, viewMode]);

  // -- deletion helpers (unchanged) --
  const deleteFromNode = async (nodeName, fgNumber) => {
    try {
      const q = query(dbRef(rtdb, nodeName), orderByChild("fgNumber"), equalTo(fgNumber));
      const snap = await get(q);
      const deletes = [];
      snap.forEach((child) => {
        deletes.push(...deleteImagesFromSnapshot(child));
        deletes.push(dbRemove(child.ref));
      });
      await Promise.all(deletes);
    } catch (e) {
      console.error("deleteFromNode error", nodeName, fgNumber, e);
    }
  };

  const deleteImagesFromSnapshot = (dataSnapshot) => {
    const promises = [];
    possibleImageKeys.forEach((key) => {
      const url = dataSnapshot.child(key).val();
      if (url) {
        try {
          const sRef = storageRef(storage, url);
          promises.push(
            deleteObject(sRef).catch((err) => {
              console.warn("Failed delete storage reference from URL:", url, err.message);
            })
          );
        } catch (err) {
          console.warn("Invalid storage URL:", url);
        }
      }
    });
    return promises;
  };

  const deleteOrphanFilesByFg = async (fgNumber) => {
    const allPromises = [];
    for (const folder of orphanFolders) {
      const folderRef = storageRef(storage, folder);
      try {
        const list = await listAll(folderRef);
        const matched = list.items.filter((itemRef) => itemRef.name.startsWith(fgNumber));
        allPromises.push(...matched.map((it) => deleteObject(it).catch(() => {})));
      } catch (e) {
        console.warn("listAll failed for", folder, e);
      }
    }
    await Promise.all(allPromises);
  };

  const flattenMonthItems = (month) => {
    const items = [];
    const m = grouped[month];
    if (!m) return items;
    if (Array.isArray(m)) return m;
    for (const weekKey of Object.keys(m)) {
      const week = m[weekKey] || {};
      for (const dayKey of Object.keys(week)) {
        const arr = week[dayKey] || [];
        items.push(...arr);
      }
    }
    return items;
  };

  const deleteOldestMonths = async (monthCount) => {
  if (!availableMonths || availableMonths.length === 0) return;

  const targetMonths = availableMonths.slice(0, monthCount);

  if (!window.confirm(`Delete records from months:\n${targetMonths.join(", ")} ?`))
    return;

  setWorking(true);
  setMessage("Deleting data...");

  try {
    const allTasks = [];

    for (const month of targetMonths) {
      const items = flattenMonthItems(month);

      for (const item of items) {
        const { fgNumber, id } = item;

        // Delete Receive
        allTasks.push(
          dbRemove(dbRef(rtdb, `Receive/${id}`)).catch(() => {})
        );

        // Delete child nodes
        for (const node of ["Treat", "Paint", "Pack", "Deliver"]) {
          allTasks.push(deleteFromNode(node, fgNumber));
        }

        // Delete orphan storage files
        allTasks.push(deleteOrphanFilesByFg(fgNumber));
      }
    }

    await Promise.all(allTasks);

    // ❗ DO NOT FORCE reload or modify month selection
    // Firebase `onValue()` will auto refresh by itself

    setMessage("Deletion complete.");
    setWorking(false);

  } catch (e) {
    console.error("deleteOldestMonths error", e);
    setMessage("Deletion failed.");
    setWorking(false);
  }
};


const deleteUnknownRecords = async () => {
  const items = grouped["Unknown"] || [];
  if (items.length === 0) {
    alert("No Unknown records to delete.");
    return;
  }

  if (!window.confirm("Are you sure you want to delete all Unknown records?"))
    return;

  setWorking(true);
  setMessage("Deleting Unknown records...");

  try {
    const allTasks = [];

    for (const { fgNumber, id } of items) {
      // Delete Receive
      allTasks.push(
        dbRemove(dbRef(rtdb, `Receive/${id}`)).catch(() => {})
      );

      // Delete child nodes
      for (const node of ["Treat", "Paint", "Pack", "Deliver"]) {
        allTasks.push(deleteFromNode(node, fgNumber));
      }

      // Delete orphan storage files
      allTasks.push(deleteOrphanFilesByFg(fgNumber));
    }

    await Promise.all(allTasks);

    // ❗ Keep UI state untouched — allow user to choose again
    setMessage("Unknown records deleted.");
    setWorking(false);

  } catch (e) {
    console.error(e);
    setMessage("Failed deleting Unknown records.");
    setWorking(false);
  }
};

  const handleDeleteChoice = () => {
    const choice = window.prompt(
      "Delete options:\n1 = Delete by months\n2 = Delete Unknown only\n\nEnter 1 or 2"
    );
    if (choice === "1") {
      if (selectedMonthsCount <= 0) {
        alert("No months selected.");
        return;
      }
      deleteOldestMonths(selectedMonthsCount);
    } else if (choice === "2") {
      deleteUnknownRecords();
    }
  };

  const handleExpandAll = () => setExpandAll(true);
  const handleCollapseAll = () => setExpandAll(false);

  return (
    <div className="admin-data-root">
      <h2>Data Management</h2>
      <p className="subtitle">FG Number sorted by month</p>

      <div className="accordion-card">
        <div className="accordion-toolbar">
          <button className="icon-btn expand" onClick={handleExpandAll}>
            🟢
          </button>
          <button className="icon-btn collapse" onClick={handleCollapseAll}>
            🔴
          </button>
          <div style={{ flex: 1 }} />
        </div>

        {loading ? (
          <div className="loader">Loading...</div>
        ) : availableMonths.length === 0 ? (
          <div className="empty">No data available</div>
        ) : (
          monthsToShow.map((monthKey) => (
            <MonthAccordion
              key={monthKey}
              monthKey={monthKey}
              items={grouped[monthKey] || []}
              total={monthTotals[monthKey] || 0}
              formatTimestamp={formatTimestamp}
              expandAll={expandAll}
            />
          ))
        )}
      </div>

      <div className="filter-card">
        <label className="slider-label">Select oldest months to delete:</label>
        <input
          type="range"
          min={availableMonths.length > 0 ? 1 : 0}
          max={availableMonths.length > 0 ? availableMonths.length : 0}
          value={selectedMonthsCount}
          onChange={(e) => setSelectedMonthsCount(Number(e.target.value))}
        />
        <div className="selected-months">
          {selectedMonthsCount > 0
            ? `Oldest ${selectedMonthsCount} month(s): ${availableMonths
                .slice(0, selectedMonthsCount)
                .join(", ")}`
            : "No months available"}
        </div>
      </div>

      <div className="actions-row">
        <button className="delete-btn" onClick={handleDeleteChoice} disabled={working}>
          🗑️ Delete
        </button>
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
      </div>

      {working && <div className="working-overlay">Working... {message}</div>}
    </div>
  );
}
