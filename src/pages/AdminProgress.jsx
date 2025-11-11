import React, { useEffect, useState } from "react";
import { rtdb } from "../firebase";
import { ref, get, query, orderByChild, equalTo } from "firebase/database";
import "./AdminProgress.css";
import FGItemCard from "./FGItemCard";
import FGDateHeader from "../FgDateHeader";

function AdminProgress({ onBack, email, onNavigate }) { // ✅ now accepts onNavigate prop
  const [fgItems, setFgItems] = useState([]);
  const [dateGroups, setDateGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortLatest, setSortLatest] = useState(true);

  // ------------------ Fetch all FG numbers ------------------
  const fetchFgNumbers = async () => {
    setLoading(true);
    setFgItems([]);
    setDateGroups([]);

    const nodes = ["Receive", "Treat", "Paint", "Pack", "Deliver"];
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
          steps: [],
          stepsList: [],
          percentage: 0,
          nodeRemarks: {},
          isExpanded: false,
        };
        fgList.push(fgItem);
        fgMap[data.fgNumber] = fgItem;
      });

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

          fgItem.percentage = Math.round((fgItem.steps.length * 100) / nodes.length);

          if (data.remark) fgItem.nodeRemarks[node] = data.remark;
          else delete fgItem.nodeRemarks[node];
        });
      }

      fgList.forEach((item) => {
        const stepsList = [];
        item.steps.forEach((step, index) => {
          if (index > 0) stepsList.push({ type: "gap" });
          stepsList.push({ type: "step", step });
        });
        item.stepsList = stepsList;
      });

      setFgItems(fgList);
      groupByDate(fgList);
    } catch (err) {
      console.error("Error fetching FG numbers:", err);
      alert("Failed to fetch data. Check console.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------ Group by Date ------------------
  const groupByDate = (items) => {
    const grouped = {};
    items.forEach((item) => {
      const key = item.date || "Unknown";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      const dateA = a === "Unknown" ? 0 : new Date(a.split("/").reverse().join("-")).getTime();
      const dateB = b === "Unknown" ? 0 : new Date(b.split("/").reverse().join("-")).getTime();
      return sortLatest ? dateB - dateA : dateA - dateB;
    });

    const finalGroups = sortedKeys.map((key) => ({
      date: key,
      isExpanded: false,
      fgItems: grouped[key],
    }));

    setDateGroups(finalGroups);
  };

  // ------------------ Toggle Header ------------------
  const toggleHeader = (index) => {
    const groups = [...dateGroups];
    groups[index].isExpanded = !groups[index].isExpanded;
    setDateGroups(groups);
  };

  // ------------------ Toggle FG Item ------------------
  const toggleFg = (fgNumber) => {
    const items = fgItems.map((item) =>
      item.fgNumber === fgNumber ? { ...item, isExpanded: !item.isExpanded } : item
    );
    setFgItems(items);
    groupByDate(items);
  };

    // ------------------ Dynamic mapping of date/time per node ------------------
const nodeDateField = {
  Receive: "receivingDate",
  Treat: "dateTreat",
  Paint: "datePaint",
  Pack: "datePack",
  Deliver: "dateDeliver"
};

const nodeTimeField = {
  Receive: "receivingTime",
  Treat: "timeTreat",
  Paint: "timePaint",
  Pack: "timePack",
  Deliver: "timeDeliver"
};

// ------------------ Search ------------------
const searchFgNumber = async () => {
  const fgNumber = searchQuery.trim();
  if (!fgNumber) return alert("Please enter FG Number");

  setLoading(true);

  try {
    const nodes = ["Receive", "Treat", "Paint", "Pack", "Deliver"];
    const fgMap = {};
    const fgList = [];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const snap = await get(ref(rtdb, node));
      snap.forEach((child) => {
        const data = child.val();
        if (data.fgNumber && data.fgNumber.trim() === fgNumber) {
          if (!fgMap[data.fgNumber]) {
            const fgItem = {
              fgNumber: data.fgNumber,
              date: data[nodeDateField[node]] || null,
              time: data[nodeTimeField[node]] || null,
              steps: [],
              stepsList: [],
              percentage: 0,
              nodeRemarks: {},
              isExpanded: false,
            };
            fgMap[data.fgNumber] = fgItem;
            fgList.push(fgItem);
          }

          const fgItem = fgMap[data.fgNumber];
          const stepPercentage = ((i + 1) * 100) / nodes.length;
          const stepStr = `${node} - ${stepPercentage}%`;
          if (!fgItem.steps.includes(stepStr)) fgItem.steps.push(stepStr);
          fgItem.percentage = Math.round(
            (fgItem.steps.length * 100) / nodes.length
          );

          if (data.note) fgItem.nodeRemarks[node] = data.note;
        }
      });
    }

    if (fgList.length === 0) {
      alert("FG Number not found");
      setFgItems([]);
      setDateGroups([]);
      return;
    }

    // Build stepsList
    fgList.forEach((item) => {
      const stepsList = [];
      item.steps.forEach((step, index) => {
        if (index > 0) stepsList.push({ type: "gap" });
        stepsList.push({ type: "step", step });
      });
      item.stepsList = stepsList;
    });

    setFgItems(fgList);
    groupByDate(fgList);
  } catch (err) {
    console.error("Search error:", err);
    alert("Error searching FG number");
  } finally {
    setLoading(false);
  }
};

  // ------------------ Sort Toggle ------------------
  const toggleSort = () => {
    setSortLatest(!sortLatest);
    groupByDate(fgItems);
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
        <button onClick={() => { setSearchQuery(""); fetchFgNumbers(); }}>Clear</button> {/* ✅ Clear */}
      </div>

      {/* Refresh + Sort */}
      <div className="actions-row">
        <button onClick={fetchFgNumbers}>Refresh</button>
        <button onClick={toggleSort}>{sortLatest ? "Sort: Latest" : "Sort: Oldest"}</button>
      </div>

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
                  onNavigate={onNavigate} // ✅ pass navigation handler
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
