import React, { useState, useMemo } from "react";
import "./FgListDialog.css";

export default function FgListDialog({ fgList, stage, onClose }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredList = useMemo(() => {
    if (!searchQuery) return fgList;
    return fgList.filter((fg) =>
      fg.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [fgList, searchQuery]);

  return (
    <div className="fg-dialog-backdrop">
      <div className="fg-dialog">
        <h2>FG Numbers in {stage}</h2>
        <input
          type="text"
          placeholder="Search FG..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="fg-search-input"
        />

        <div className="fg-list-container">
          {filteredList.length === 0 ? (
            <p className="no-results">No FG numbers found</p>
          ) : (
            <ul className="fg-list">
              {filteredList.map((fg, idx) => (
                <li key={idx}>{fg}</li>
              ))}
            </ul>
          )}
        </div>

        <button className="btn-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
