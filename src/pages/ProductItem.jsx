// src/components/ProductItem.jsx
import React, { useState } from "react";
import "./AdminProduct.css";

// ProductItem: shows a single product row. Click to expand to show Edit/Delete actions.
export default function ProductItem({ product, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`product-item ${expanded ? "expanded" : ""}`}>
      <div className="product-main" onClick={() => setExpanded((v) => !v)}>
        <div className="col code">{product.code}</div>
        <div className="col qty">{product.quantity}</div>
        <div className="col desc">{product.description}</div>
        <div className="col cust">{product.customer}</div>
        <div className="col supplier">{product.supplier}</div>

        <div className="expand-indicator">{expanded ? "▲" : "▼"}</div>
      </div>

      {expanded && (
        <div className="product-actions">
          <button
            className="edit-btn"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(product);
            }}
          >
            Edit
          </button>

          <button
            className="delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(product);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}