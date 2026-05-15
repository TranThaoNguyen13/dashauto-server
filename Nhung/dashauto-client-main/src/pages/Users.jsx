import { useEffect, useState } from "react";
import {
  listUsers,
  getUserSummary,
  createUser,
  updateUser,
  resetUserPassword,
} from "../services/user.service";
import { getUser } from "../services/auth.service";
import "./Reports.css";
import "./Users.css";

const formatDate = (iso) => (iso ? new Date(iso).toLocaleString("vi-VN") : "-");

function Users() {
  const currentUser = getUser();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "viewer",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const params = {};
    if (roleFilter) params.role = roleFilter;
    if (search.trim()) params.search = search.trim();

    Promise.all([listUsers(params), getUserSummary()])
      .then(([list, sum]) => {
        setItems(list.items || []);
        setTotal(list.total || 0);
        setSummary(sum);
      })
      .catch((err) => setError(err.response?.data?.message || "Loi tai du lieu"))
      .finally(() => setLoading(false));
  }, [roleFilter, reloadKey]);

  const handleSearch = (e) => {
    e.preventDefault();
    setReloadKey((k) => k + 1);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await createUser(form);
      setShowForm(false);
      setForm({ username: "", password: "", role: "viewer" });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Loi tao tai khoan");
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await updateUser(id, { role });
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err.response?.data?.message || "Loi cap nhat vai tro");
    }
  };

  const handleToggleActive = async (id, is_active) => {
    try {
      await updateUser(id, { is_active });
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err.response?.data?.message || "Loi cap nhat trang thai");
    }
  };

  const handleResetPassword = async (id, username) => {
    const password = window.prompt(`Mat khau moi cho ${username}:`);
    if (!password) return;
    try {
      await resetUserPassword(id, password);
      alert("Dat lai mat khau thanh cong");
    } catch (err) {
      alert(err.response?.data?.message || "Loi dat lai mat khau");
    }
  };

  const summaryCards = summary
    ? [
        { label: "Tong tai khoan", value: summary.total, color: "#4a90e2" },
        { label: "Dang hoat dong", value: summary.active, color: "#50c878" },
        { label: "Admin", value: summary.admins, color: "#9b59b6" },
        { label: "Manager", value: summary.managers, color: "#f5a623" },
        { label: "Viewer", value: summary.viewers, color: "#6b7280" },
      ]
    : [];

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1>Quan ly tai khoan</h1>
          <p className="page-desc">
            Admin tao tai khoan, phan quyen va khoa/mo tai khoan nhan vien.
          </p>
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Dong" : "+ Them tai khoan"}
        </button>
      </div>

      {summary && (
        <section className="user-stat-grid">
          {summaryCards.map((c) => (
            <div
              key={c.label}
              className="user-stat-card"
              style={{ borderLeftColor: c.color }}
            >
              <div className="user-stat-value">{c.value}</div>
              <div className="user-stat-label">{c.label}</div>
            </div>
          ))}
        </section>
      )}

      {showForm && (
        <form className="user-form" onSubmit={handleCreate}>
          <label>
            Username
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </label>
          <label>
            Mat khau
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
          <label>
            Vai tro
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="viewer">Viewer</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button type="submit" className="primary-btn">
            Tao tai khoan
          </button>
        </form>
      )}

      <div className="filters">
        <form onSubmit={handleSearch} className="search-form">
          <label>
            Tim username
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nhap username..."
            />
          </label>
          <button type="submit" className="primary-btn">
            Tim
          </button>
        </form>
        <label>
          Vai tro
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">Tat ca</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="viewer">Viewer</option>
          </select>
        </label>
        <span className="total">Tong: {total}</span>
      </div>

      {error && <p className="dashboard-error">{error}</p>}

      {loading ? (
        <p>Dang tai...</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Vai tro</th>
              <th>Trang thai</th>
              <th>Ngay tao</th>
              <th>Thao tac</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty">
                  Khong co tai khoan
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>
                    {u.username}
                    {u.id === currentUser?.id && (
                      <span className="badge badge-pending"> Ban</span>
                    )}
                  </td>
                  <td>
                    <select
                      value={u.role}
                      disabled={u.id === currentUser?.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </td>
                  <td>
                    <span
                      className={`badge badge-${u.is_active ? "success" : "failed"}`}
                    >
                      {u.is_active ? "Hoat dong" : "Vo hieu"}
                    </span>
                  </td>
                  <td>{formatDate(u.created_at)}</td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="resolve-btn"
                      onClick={() => handleResetPassword(u.id, u.username)}
                    >
                      Dat lai MK
                    </button>
                    {u.id !== currentUser?.id && (
                      <button
                        type="button"
                        className={u.is_active ? "danger-btn" : "resolve-btn"}
                        onClick={() => handleToggleActive(u.id, !u.is_active)}
                      >
                        {u.is_active ? "Khoa" : "Mo khoa"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Users;
