import React from "react";
import "./AdminReport.css";

function AdminReport({ onBack, onStaffReport, onProductionReport }) {
  const handleStaffClick = () => {
    console.log("Navigate to AnalyticStaff");
    if (onStaffReport) onStaffReport(); // ✅ Trigger navigation
  };

  const handleProductionClick = () => {
    console.log("Navigate to AnalyticProductionLine");
    if (onProductionReport) onProductionReport(); // ✅ Trigger navigation
  };

  return (
    <div className="admin-report-root">
      {/* Content */}
      <div className="content">
        <button className="btn" onClick={handleStaffClick}>
          Staff
        </button>
        <button className="btn" onClick={handleProductionClick}>
          Production Line
        </button>
      </div>

      {/* Back button */}
      <button className="btn-back" onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}

export default AdminReport;
