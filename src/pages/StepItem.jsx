import React from "react";
import "./StepItem.css";

function StepItem({ stepText, hasRemark, onClick }) {
  const nodeName = stepText.split(" - ")[0];

  return (
    <div
      className="step-item"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "8px 16px",
        cursor: "pointer",
        userSelect: "none",
        transition: "background 0.15s",
      }}
    >
      {/* Red dot if remark exists */}
      {hasRemark && (
        <span
          className="red-dot"
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "red",
            marginRight: "8px",
          }}
        />
      )}

      {/* Step text */}
      <span
        className="step-text"
        style={{ flex: 1, color: hasRemark ? "red" : "#1976d2" }}
      >
        {stepText}
      </span>

      {/* Arrow */}
      <span className="arrow" style={{ marginLeft: "8px" }}>
        ▶
      </span>
    </div>
  );
}

export default StepItem;
