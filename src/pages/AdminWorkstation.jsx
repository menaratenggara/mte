import React, { useEffect, useState } from "react";
import { rtdb } from "../firebase";
import { ref, onValue, off } from "firebase/database";
import "./AdminWorkstation.css";

function AdminWorkstation({ onBack }) {
  const [workstations, setWorkstations] = useState({
    Receive: [],
    Treat: [],
    Paint: [],
    Pack: [],
    Deliver: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // 🔹 trigger refresh

  useEffect(() => {
    const wsRef = ref(rtdb, "Workstation");
    setLoading(true);

    const listener = onValue(wsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const newWS = { Receive: [], Treat: [], Paint: [], Pack: [], Deliver: [] };

      // Get current date in dd/mm/yyyy format
      const today = new Date();
      const currentDate = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${today.getFullYear()}`;

      Object.values(data).forEach((item) => {
        if (item.name && item.place && item.timestamp) {
          const itemDate = item.timestamp.split(" ")[0]; // Extract "dd/mm/yyyy"
          if (itemDate === currentDate) {
            if (newWS[item.place]) newWS[item.place].push(item.name);
          }
        }
      });

      setWorkstations(newWS);
      setLoading(false);
    });

    return () => off(wsRef, "value", listener);
  }, [refreshKey]); // 🔹 re-run useEffect when refreshKey changes

  // 🔹 Refresh button handler
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setRefreshKey((prev) => prev + 1), 300); // re-trigger listener
  };

  const handleWSClick = (place) => {
    const names = workstations[place];
    if (names.length > 0) {
      alert(`Workstation: ${place}\nName:\n${names.join("\n")}`);
    } else {
      alert(`Workstation: ${place}\nNo staff available today.`);
    }
  };

  const renderWS = (place, title, className, span2 = false) => (
    <div
      className={`ws-card ${className} ${span2 ? "span-2" : ""}`}
      onClick={() => handleWSClick(place)}
    >
      <h3 className="ws-title">{title}</h3>
      <p className="ws-names">
        {loading
          ? "Loading..."
          : workstations[place].length > 0
          ? workstations[place].join("\n")
          : "Not available today"}
      </p>
    </div>
  );

  return (
    <div className="workstation-page">
      <div className="workstation-container">
        <h2 className="workstation-header">Workstation Layout</h2>

        {/* 🔹 Refresh Button */}
        <button className="refresh-btn" onClick={handleRefresh} disabled={loading}>
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>

        <div className="ws-grid">
          {renderWS("Receive", "Workstation = Receive", "receive")}
          {renderWS("Treat", "Workstation = Treat", "treat")}
          {renderWS("Paint", "Workstation = Painted", "paint")}
          {renderWS("Pack", "Workstation = Pack", "pack", true)}
          {renderWS("Deliver", "Workstation = Deliver", "deliver")}
        </div>

        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
      </div>
    </div>
  );
}

export default AdminWorkstation;
