// src/components/StaffItem.jsx
import React, { useState } from "react";
import "./AdminStaff.css";

export default function StaffItem({ staff, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="staff-item">
      <div
        className="staff-main"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="staff-info">
          <span className="staff-name">{staff.name}</span>
          <span className="staff-phone">{staff.phone}</span>
        </div>
        <span className={`expand-icon ${expanded ? "expanded" : ""}`}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {expanded && (
        <div className="staff-actions">
          <button className="btn-edit" onClick={() => onEdit(staff)}>
            Edit
          </button>
          <button className="btn-delete" onClick={() => onDelete(staff)}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}