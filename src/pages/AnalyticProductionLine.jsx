import React, { useState, useEffect } from "react";
import { rtdb } from "../firebase";
import { ref, get } from "firebase/database";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import FgListDialog from "./FgListDialog";
import { saveAs } from "file-saver";
import "./AnalyticProductionLine.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function AnalyticProductionLine({ onBack }) {
  const stages = ["Receive", "Treat", "Paint", "Pack", "Deliver"];
  const stageColors = ["#FF5722", "#4CAF50", "#2196F3", "#FFC107", "#9C27B0"];

  const [stageData, setStageData] = useState({});
  const [stageFgNumbers, setStageFgNumbers] = useState({});
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [fgDialog, setFgDialog] = useState({ open: false, stage: "", fgList: [] });
  const [fgDetailsMap, setFgDetailsMap] = useState({});

  useEffect(() => {
    fetchStageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter]);

  const fetchStageData = async () => {
    setLoading(true);
    const newStageData = {};
    const newStageFgNumbers = {};
    const newFgDetailsMap = {};

    for (let stage of stages) {
      const snapshot = await get(ref(rtdb, stage));
      const stageMap = {};

      snapshot.forEach((child) => {
        const data = child.val();
        const fgNumber = data.fgNumber || "";

        // ✅ Get the first valid date field
        let dateString =
          data.receivingDate ||
          data.dateTreat ||
          data.datePaint ||
          data.datePack ||
          data.dateDeliver;

        if (!dateString) return;

        // ✅ Normalize and validate the date
        const parsedDate = parseDate(dateString);
        if (!parsedDate || isNaN(parsedDate.getTime())) return;

        if (!shouldInclude(parsedDate, selectedFilter)) return;

        const formattedDate = formatDateForFilter(parsedDate, selectedFilter);

        stageMap[formattedDate] = (stageMap[formattedDate] || 0) + 1;

        const key = `${stage}|${formattedDate}`;
        const fgSet = newStageFgNumbers[key] || [];
        if (!fgSet.includes(fgNumber)) fgSet.push(fgNumber);
        newStageFgNumbers[key] = fgSet;

        const fgMap = newFgDetailsMap[fgNumber] || {};
        fgMap[stage] = data;
        newFgDetailsMap[fgNumber] = fgMap;
      });

      newStageData[stage] = stageMap;
    }

    setStageData(newStageData);
    setStageFgNumbers(newStageFgNumbers);
    setFgDetailsMap(newFgDetailsMap);
    setLoading(false);
  };

// ✅ Parse date safely — force DD/MM/YYYY or ISO only
const parseDate = (dateString) => {
  if (!dateString) return null;

  // 🔹 If it's ISO-like (contains a "T" or is YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateString) || dateString.includes("T")) {
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? null : d;
  }

  // 🔹 Otherwise assume DD/MM/YYYY (or DD-MM-YYYY)
  const parts = dateString.split(/[\/\-]/);
  if (parts.length === 3) {
    const [day, month, year] = parts.map((x) => parseInt(x, 10));
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month - 1, day);
    }
  }

  return null;
};

const shouldInclude = (recordDate, filter) => {
  const now = new Date();

  switch (filter) {
    case "Day":
      return recordDate.toDateString() === now.toDateString();

    case "Week": {
      // 🗓 Get start (Monday) and end (Sunday) of this week
      const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // Make Sunday = 7
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - (dayOfWeek - 1));
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      return recordDate >= startOfWeek && recordDate <= endOfWeek;
    }

    case "Month":
      return (
        recordDate.getMonth() === now.getMonth() &&
        recordDate.getFullYear() === now.getFullYear()
      );

    case "Year":
      return recordDate.getFullYear() === now.getFullYear();

    default:
      return true;
  }
};

// ✅ Always format as DD/MM/YYYY string
const formatDateForFilter = (date) => {
  const pad = (n) => (n < 10 ? "0" + n : n);
  if (!(date instanceof Date) || isNaN(date)) return "Invalid Date";
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const exportCsv = () => {
  if (!fgDetailsMap || Object.keys(fgDetailsMap).length === 0) {
    alert("No data to export");
    return;
  }

  const rows = [
    [
      "FG Number",
      "Stage",
      "Include With FG",
      "Manufacturing Date",
      "Date",
      "Time",
      "User Name",
      "Quantity",
      "DO Number",
      "Note",
      "Label Type",
      "Image URL",
      "QR URL",
      "Verified Timestamp",
      "Release Note No",
      "NG Material",
      "NG Manufacturing",
      "Dented",
      "Rusted",
      "Other",
    ],
  ];

  Object.entries(fgDetailsMap).forEach(([fgNumber, stageMap]) => {
    Object.entries(stageMap).forEach(([stage, fgData]) => {
      const rawDate =
        fgData.dateDeliver ||
        fgData.datePack ||
        fgData.datePaint ||
        fgData.dateTreat ||
        fgData.receivingDate ||
        "";
      const parsedDate = parseDate(rawDate);
      if (!parsedDate) return;
      const date = formatDateForFilter(parsedDate, selectedFilter);

      // ✅ Prevent Excel auto-formatting by prefixing with tab
      const safeFgNumber = `\t${fgNumber}`;
      const safeReleaseNote = fgData.releaseNote ? `\t${fgData.releaseNote}` : "";
      const safeNgMaterial = fgData.ngMaterial ? `\t${fgData.ngMaterial}` : "";
      const safeNgManufacturing = fgData.ngManufacturing ? `\t${fgData.ngManufacturing}` : "";
      const safeDented = fgData.dented ? `\t${fgData.dented}` : "";
      const safeRusted = fgData.rusted ? `\t${fgData.rusted}` : "";
      const safeOther = fgData.other ? `\t${fgData.other}` : "";

      const formatTimestamp = (ts) => {
      if (!ts) return "";
      const date = new Date(ts);
      if (isNaN(date.getTime())) return "";
      const pad = (n) => (n < 10 ? "0" + n : n);
      return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

      rows.push([
        safeFgNumber,
        stage,
        fgData.includeWithFG || "",
        stage === "Receive" ? fgData.manufacturingDate || "" : "",
        date,
        fgData.timeDeliver ||
          fgData.timePack ||
          fgData.timePaint ||
          fgData.timeTreat ||
          fgData.receivingTime ||
          "",
        fgData.userName || "",
        fgData.quantity ? `\t${fgData.quantity}` : "",
        fgData.doNumber || "",
        fgData.note || "",
        fgData.labelType || "",
        fgData.imageUrl || fgData.checklistImageUrl || "",
        fgData.qrImageUrl || "",
        formatTimestamp(fgData.verifiedTimestamp),
        safeReleaseNote,
        safeNgMaterial,
        safeNgManufacturing,
        safeDented,
        safeRusted,
        safeOther,
      ]);
    });
  });

  const csvContent = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `production_export_${Date.now()}.csv`);
};

  return (
    <div className="analytic-production-root">
      <div className="common-header">Analytic Production Line</div>

      <div className="filter-export-row">
        <select value={selectedFilter} onChange={(e) => setSelectedFilter(e.target.value)}>
          <option value="All">All</option>
          <option value="Day">Day</option>
          <option value="Week">Week</option>
          <option value="Month">Month</option>
          <option value="Year">Year</option>
        </select>
        <button onClick={exportCsv}>Export CSV</button>
      </div>

      {/* Chart Display */}
<div className="chart-container single-chart">
{loading ? (
  <div className="spinner-container">
    <div className="loading-spinner"></div>
    <p>Loading chart data...</p>
  </div>
) : (
  <div className="chart-card">
      <h3>Production Progress by Stage</h3>
<Bar
  data={(() => {
    // ✅ Collect all unique dates across all stages
    const allDates = Array.from(
      new Set(Object.values(stageData).flatMap((m) => Object.keys(m)))
    )
      .filter((d) => d && d !== "Invalid Date")
      .sort((a, b) => {
        const [da, ma, ya] = a.split("/").map(Number);
        const [db, mb, yb] = b.split("/").map(Number);
        return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
      });

    // ✅ Build dataset per stage
    const datasets = stages.map((stage, index) => ({
      label: stage,
      data: allDates.map((date) => stageData[stage]?.[date] || 0),
      backgroundColor: stageColors[index],
    }));

    // ✅ Keep chart data reference for click handler
    window.currentChartData = { labels: allDates, datasets };

    return { labels: allDates, datasets };
  })()}
  options={{
    responsive: true,
    maintainAspectRatio: false,
    // 🚫 Remove parsing:false (it disables normal dataset parsing)
    // parsing: false,

    onClick: (event, elements) => {
      if (!elements.length) return;
      const chart = elements[0];
      const stage = window.currentChartData.datasets[chart.datasetIndex].label;
      const date = window.currentChartData.labels[chart.index];
      const key = `${stage}|${date}`;
      const fgList = stageFgNumbers[key] || [];

      if (fgList.length === 0) {
        alert(`No FG numbers for ${stage} on ${date}`);
        return;
      }

      setFgDialog({ open: true, stage: `${stage} — ${date}`, fgList });
    },

    plugins: {
      legend: {
        position: "top",
        labels: { boxWidth: 20, padding: 16 },
      },
      title: {
        display: true,
        text: "FG Count by Date and Stage",
        font: { size: 16, weight: "bold" },
      },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} items`,
        },
      },
    },

    scales: {
      x: {
        type: "category",
        title: { display: true, text: "Date (DD/MM/YYYY)" },
        ticks: { autoSkip: true, maxRotation: 45, minRotation: 0 },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: "FG Count" },
        ticks: { precision: 0 },
      },
    },
  }}
/>
    </div>
  )}
</div>

      {/* FG Dialog */}
      {fgDialog.open && (
        <FgListDialog
          fgList={fgDialog.fgList}
          stage={fgDialog.stage}
          onClose={() => setFgDialog({ open: false, stage: "", fgList: [] })}
        />
      )}

      <button className="back-btn" onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}
