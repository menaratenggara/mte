import React, { useEffect, useState } from "react";
import { rtdb } from "../firebase";
import { ref, get } from "firebase/database";
import "./AdminProgress.css";
import FGItemCard from "./FGItemCard";
import FGDateHeader from "../FgDateHeader";

function AdminProgress({ onBack, email, onNavigate }) {
  const [fgItems, setFgItems] = useState([]);
  const [dateGroups, setDateGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortLatest, setSortLatest] = useState(true);
  const [listening, setListening] = useState(false);

  const nodes = ["Receive", "Treat", "Paint", "Pack", "Deliver"];

  // ------------------ Fetch all FG numbers ------------------
  const fetchFgNumbers = async () => {
    setLoading(true);
    setListening(true);
    setFgItems([]);
    setDateGroups([]);

    const fgMap = {};
    const fgList = [];

    try {
      const receiveSnap = await get(ref(rtdb, "Receive"));
      receiveSnap.forEach((child) => {
        const data = child.val();
        const fgItem = {
          fgNumber: data.fgNumber,
          date: data.receivingDate || null,
          time: data.receivingTime || null,
          part: data.labelType || null,
          steps: [],
          stepsList: [],
          percentage: 0,
          nodeRemarks: {},
          isExpanded: false,
        };
        fgList.push(fgItem);
        fgMap[data.fgNumber] = fgItem;
      });

      await preloadAllSteps(fgMap, fgList);
      sortFgItems(fgList);
    } catch (err) {
      console.error("Error fetching FG numbers:", err);
      alert("Failed to fetch data. Check console.");
    } finally {
      setLoading(false);
      setListening(false);
    }
  };

  // ------------------ Preload Steps ------------------
  const preloadAllSteps = async (fgMap, fgList) => {
    let nodesLoaded = 0;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const snap = await get(ref(rtdb, node));
      snap.forEach((child) => {
        const data = child.val();
        const fgItem = fgMap[data.fgNumber];
        if (!fgItem) return;

        const stepPercentage = ((i + 1) * 100) / nodes.length;
        const stepStr = `${node} - ${stepPercentage}%`;
        if (!fgItem.steps.includes(stepStr)) fgItem.steps.push(stepStr);

        fgItem.percentage = Math.round(
          (fgItem.steps.length * 100) / nodes.length
        );

        if (data.remark && data.remark.trim() !== "")
          fgItem.nodeRemarks[node] = data.remark;
        else delete fgItem.nodeRemarks[node];
      });

      nodesLoaded++;
      if (nodesLoaded === nodes.length) {
        buildStepsList(fgList);
        sortFgItems(fgList);
      }
    }
  };

  // ------------------ Build Steps List ------------------
  const buildStepsList = (items) => {
    items.forEach((item) => {
      const stepsList = [];
      item.steps.forEach((step, index) => {
        if (index > 0) stepsList.push({ type: "gap" });
        stepsList.push({ type: "step", step });
      });
      item.stepsList = stepsList;
    });
  };

  // ------------------ Search (contains, case-insensitive) ------------------
  const searchFgNumber = async () => {
    const fgNumber = searchQuery.trim();
    if (!fgNumber) return alert("Please enter FG Number");

    setLoading(true);
    setListening(true);
    setFgItems([]);
    setDateGroups([]);

    const fgMap = {};
    const fgList = [];

    try {
      const receiveSnap = await get(ref(rtdb, "Receive"));
      receiveSnap.forEach((child) => {
        const data = child.val();
        const foundFg = data.fgNumber || "";
        if (foundFg.toLowerCase().includes(fgNumber.toLowerCase())) {
          const fgItem = {
            fgNumber: data.fgNumber,
            date: data.receivingDate || null,
            time: data.receivingTime || null,
            part: data.labelType || null,
            steps: [],
            stepsList: [],
            percentage: 0,
            nodeRemarks: {},
            isExpanded: false,
          };

          console.log("FG:", data.fgNumber, "Label Type:", data.labelType);

          fgList.push(fgItem);
          fgMap[data.fgNumber] = fgItem;
        }
      });

      if (fgList.length === 0) {
        alert("No matching FG Numbers found");
        setLoading(false);
        setListening(false);
        return;
      }

      await preloadAllSteps(fgMap, fgList);
    } catch (err) {
      console.error("Search error:", err);
      alert("Error searching FG number");
    } finally {
      setLoading(false);
      setListening(false);
    }
  };

// ------------------ Sort & Group ------------------
const sortFgItems = (items) => {
  if (!items || items.length === 0) return;

  const parseDateTime = (d, t) => {
    if (!d) return 0;
    try {
      const [day, month, year] = d.split("/").map(Number);

      let hour = 0, minute = 0;
      if (t && t.trim() !== "") {
        const time = t.toLowerCase().trim();
        const isPM = time.includes("pm");
        const [h, m] = time.replace(/[^\d:]/g, "").split(":").map(Number);
        hour = isPM && h !== 12 ? h + 12 : (!isPM && h === 12 ? 0 : h);
        minute = m || 0;
      }

      return new Date(year, month - 1, day, hour, minute).getTime();
    } catch {
      return 0;
    }
  };

  const sorted = [...items].sort((a, b) => {
    const timeA = parseDateTime(a.date, a.time);
    const timeB = parseDateTime(b.date, b.time);
    return sortLatest ? timeB - timeA : timeA - timeB;
  });

  // ✅ Update state with sorted list
  setFgItems(sorted);
  groupByDate(sorted);
};

const groupByDate = (items) => {
  if (!items || items.length === 0) {
    setDateGroups([]);
    return;
  }

  const grouped = {};
  items.forEach((item) => {
    const key = item.date || "Unknown";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === "Unknown") return 1;
    if (b === "Unknown") return -1;
    const dateA = new Date(a.split("/").reverse().join("-")).getTime();
    const dateB = new Date(b.split("/").reverse().join("-")).getTime();
    return sortLatest ? dateB - dateA : dateA - dateB;
  });

  const finalGroups = sortedKeys.map((key) => ({
    date: key,
    isExpanded: false,
    // ✅ Also sort inside each date by time
    fgItems: grouped[key].sort((a, b) => {
      const timeA = new Date(`2000-01-01T${convertTo24(a.time)}`).getTime();
      const timeB = new Date(`2000-01-01T${convertTo24(b.time)}`).getTime();
      return sortLatest ? timeB - timeA : timeA - timeB;
    }),
  }));

  setDateGroups(finalGroups);
};

// 🔹 Helper to convert "03:48 pm" → "15:48"
function convertTo24(timeStr) {
  if (!timeStr) return "00:00";
  const t = timeStr.trim().toLowerCase();
  const [hourPart, minPart] = t.replace(/[^\d:]/g, "").split(":");
  let hour = parseInt(hourPart, 10);
  const minute = parseInt(minPart || "0", 10);
  const isPM = t.includes("pm");
  if (isPM && hour !== 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

  // ------------------ Toggle Functions ------------------
  const toggleHeader = (index) => {
    const groups = [...dateGroups];
    groups[index].isExpanded = !groups[index].isExpanded;
    setDateGroups(groups);
  };

  const toggleFg = (fgNumber) => {
    setFgItems((prev) =>
      prev.map((item) =>
        item.fgNumber === fgNumber
          ? { ...item, isExpanded: !item.isExpanded }
          : item
      )
    );
  };

  // ------------------ Sort Toggle ------------------
  const toggleSort = () => {
    setSortLatest(!sortLatest);
    sortFgItems(fgItems);
  };

  useEffect(() => {
    fetchFgNumbers();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="admin-progress-root">
      {/* ✅ Back Button */}
      <div className="back-row">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
      </div>

      <h2>Progress</h2>

      {/* Search */}
      <div className="search-row">
        <input
          type="text"
          placeholder="Enter FG Number"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchFgNumber()}
        />
        <button onClick={searchFgNumber}>Search</button>
        <button onClick={() => { setSearchQuery(""); fetchFgNumbers(); }}>Clear</button>
      </div>

      {/* Actions */}
      <div className="actions-row">
        <button onClick={fetchFgNumbers}>Refresh</button>
        <button onClick={toggleSort}>
          {sortLatest ? "Sort: Latest" : "Sort: Oldest"}
        </button>
      </div>

      {/* 🔄 Blinking Listening Indicator */}
      {listening && (
        <div className="listening-indicator blink">
          Updating changes...
        </div>
      )}

      {/* Loader */}
      {loading && <div className="loader">Loading...</div>}

      {/* FG List */}
      {dateGroups.map((group, idx) => (
        <div key={group.date}>
          <FGDateHeader
            date={group.date}
            count={group.fgItems.length}
            isExpanded={group.isExpanded}
            onToggle={() => toggleHeader(idx)}
          />

          {group.isExpanded && (
            <div className="month-children">
              {group.fgItems.map((fg) => (
                <FGItemCard
                  key={fg.fgNumber}
                  fg={fg}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default AdminProgress;
