// src/components/AdminProduct.jsx
import React, { useState, useEffect, useMemo } from "react";
import { rtdb } from "../firebase";
import { ref, onValue, push, set, remove } from "firebase/database";
import ProductItem from "./ProductItem";
import "./AdminProduct.css";

export default function AdminProduct({ onBack, email }) {
  const [products, setProducts] = useState([]); // master list from RTDB
  const [loading, setLoading] = useState(true);

  // form fields
  const [id, setId] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [customer, setCustomer] = useState("");
  const [quantity, setQuantity] = useState("");
  const [supplier, setSupplier] = useState("");

  // UI controls
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState(null); // null | 'az' | 'za'

  const productsRef = ref(rtdb, "Products");

  // load products from firebase realtime DB
  useEffect(() => {
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const list = data
        ? Object.keys(data).map((key) => ({ productId: key, ...data[key] }))
        : [];
      setProducts(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // add or update product
  const handleSave = () => {
    if (!code.trim()) {
      alert("Please enter a product code");
      return;
    }
    if (!quantity.toString().trim()) {
      alert("Please enter product quantity");
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty)) {
      alert("Quantity must be a valid number");
      return;
    }

    const productId = id || push(productsRef).key;
    const product = {
      code: code.trim(),
      description: description.trim(),
      customer: customer.trim(),
      quantity: qty,
      supplier: supplier.trim(),
    };

    set(ref(rtdb, `Products/${productId}`), product)
      .then(() => {
        alert(id ? "Product updated" : "Product added");
        clearForm();
      })
      .catch(() => alert("Failed to save product"));
  };

  const handleEdit = (product) => {
    setId(product.productId || "");
    setCode(product.code || "");
    setDescription(product.description || "");
    setCustomer(product.customer || "");
    setQuantity(product.quantity != null ? String(product.quantity) : "");
    setSupplier(product.supplier || "");
  };

  const handleDelete = (product) => {
    if (!window.confirm(`Are you sure you want to delete ${product.code}?`)) return;
    remove(ref(rtdb, `Products/${product.productId}`)).catch(() =>
      alert("Failed to delete product")
    );
  };

  const clearForm = () => {
    setId("");
    setCode("");
    setDescription("");
    setCustomer("");
    setQuantity("");
    setSupplier("");
  };

  // Search + sort derived list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products.filter((p) => {
      if (!q) return true;
      return (
        (p.code || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
      );
    });

    if (sortMode === "az") {
      list = list.slice().sort((a, b) => (a.code || "").localeCompare(b.code || ""));
    } else if (sortMode === "za") {
      list = list.slice().sort((a, b) => (b.code || "").localeCompare(a.code || ""));
    }

    return list;
  }, [products, search, sortMode]);

  return (
    <div className="admin-product-root">
      <h2 className="page-title">Product Management</h2>

      {/* Search & Sort */}
      <div className="top-controls product-top">
        <input
          className="search-input"
          type="text"
          placeholder="Search by code or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="sort-buttons">
          <button
            className={`sort-btn ${sortMode === "az" ? "active" : ""}`}
            onClick={() => setSortMode("az")}
          >
            Sort A → Z
          </button>
          <button
            className={`sort-btn ${sortMode === "za" ? "active" : ""}`}
            onClick={() => setSortMode("za")}
          >
            Sort Z → A
          </button>
          <button
            className="sort-btn"
            onClick={() => {
              setSortMode(null);
              setProducts((p) => p); // no-op to re-render if needed
            }}
            title="Clear sort"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Header row (like your XML) */}
      <div className="list-header">
        <div className="col code">Code</div>
        <div className="col qty">Qty</div>
        <div className="col desc">Description</div>
        <div className="col cust">Car</div>
        <div className="col supplier">Supplier</div>
      </div>

      {/* Product List + Progress */}
      <div className="product-list-wrapper">
        {loading ? (
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "200px", // or any suitable height for loader area
            width: "100%"
          }}>
            <div className="loader">Loading products...</div>
          </div>
        ) : (
          <div className="product-list">
            {filtered.length === 0 ? (
              <div className="empty">No products found.</div>
            ) : (
              filtered.map((p) => (
                <ProductItem
                  key={p.productId}
                  product={p}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Form */}
      <div className="product-form card">
        <h3>{id ? "Edit product" : "Add a new product"}</h3>

        <div className="form-row">
          <label>Code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. P-001"
            className="form-input"
          />
        </div>

        <div className="form-row">
          <label>Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            className="form-input"
          />
        </div>

        <div className="form-row">
          <label>Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
            className="form-input"
          />
        </div>

        <div className="form-row">
          <label>Customer</label>
          <input
            type="text"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Customer name"
            className="form-input"
          />
        </div>

        <div className="form-row">
        <label>Supplier</label>
        <input
          type="text"
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          placeholder="Supplier name"
          className="form-input"
        />
      </div>

        <div className="form-actions">
          <button className="save-btn" onClick={handleSave}>
            {id ? "💾 Update Product" : "💾 Add Product"}
          </button>
          {id && (
            <button
              className="cancel-btn"
              onClick={() => {
                clearForm();
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Back button pinned near bottom (use onBack to navigate) */}
      <button className="back-btn" onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}