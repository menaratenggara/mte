import React, { useState, useEffect } from "react";
import StepItem from "./StepItem";
import "./FGItemCard.css";

function FGItemCard({ fg, onNavigate }) {
  const [isExpanded, setIsExpanded] = useState(fg.isExpanded || false);

  useEffect(() => {
    setIsExpanded(fg.isExpanded || false);
  }, [fg.isExpanded]);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const handleStepClick = (nodeName) => {
    if (!onNavigate) return;
    // pass FG number and node to parent (App.js)
    onNavigate(nodeName, fg.fgNumber);
  };

  return (
    <div className="fg-card">
      {/* Header */}
      <div className="fg-header" onClick={toggleExpand}>
        {/* Top row (FG number, time, % and arrow) */}
        <div className="fg-header-top">
          <span className="fg-number">{fg.fgNumber}</span>
          <span className="fg-time">{fg.time || "-"}</span>
          <span className="fg-percentage">{fg.percentage}%</span>

          {fg.stepsList.length > 0 && (
            <span
              className={`arrow ${isExpanded ? "expanded" : ""}`}
              style={{ transition: "transform 0.2s" }}
            >
              ▼
            </span>
          )}
        </div>

        {/* ✅ Part shown below FG number */}
        <div className="fg-part">{fg.part || "-"}</div>
      </div>

      {/* Steps */}
      {isExpanded && fg.stepsList.length > 0 && (
        <div className="fg-steps">
          {fg.stepsList.map((stepItem, idx) => {
            if (stepItem.type === "gap") {
              return <div key={idx} style={{ height: "16px" }} />;
            }

            const nodeName = stepItem.step.split(" - ")[0];
            const hasRemark = !!fg.nodeRemarks[nodeName];

            return (
              <StepItem
                key={idx}
                stepText={stepItem.step}
                hasRemark={hasRemark}
                onClick={() => handleStepClick(nodeName)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FGItemCard;
