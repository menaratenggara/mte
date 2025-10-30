import React from "react";

function FGDateHeader({ date, count, isExpanded, onToggle }) {
  return (
    <div className="accordion-card">
      <div className="month-header" onClick={onToggle}>
        <span className="month-label">
          {date} ({count})
        </span>
        <span className="month-toggle">{isExpanded ? "▼" : "▶"}</span>
      </div>
    </div>
  );
}

export default FGDateHeader;