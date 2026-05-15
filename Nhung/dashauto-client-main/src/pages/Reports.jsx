import { useEffect, useState } from "react";
import { listReports } from "../services/report.service";
import "./Reports.css";

const formatDate = (iso) => new Date(iso).toLocaleString("vi-VN");

function Reports() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [emailStatus, setEmailStatus] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (type) params.type = type;
    if (emailStatus) params.emailStatus = emailStatus;
    listReports(params)
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [type, emailStatus]);

  return (
    <div className="page">
      <h1>Lich su bao cao</h1>

      <div className="filters">
        <label>
          Loai bao cao
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Tat ca</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>

        <label>
          Trang thai email
          <select value={emailStatus} onChange={(e) => setEmailStatus(e.target.value)}>
            <option value="">Tat ca</option>
            <option value="success">Thanh cong</option>
            <option value="failed">That bai</option>
            <option value="pending">Cho xu ly</option>
          </select>
        </label>

        <span className="total">Tong: {total}</span>
      </div>

      {loading ? (
        <p>Dang tai...</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tieu de</th>
              <th>Loai</th>
              <th>Noi dung</th>
              <th>Email</th>
              <th>Nguoi tao</th>
              <th>Thoi gian</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty">Khong co du lieu</td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.title}</td>
                  <td>{r.type}</td>
                  <td className="content-cell">{r.content}</td>
                  <td>
                    <span className={`badge badge-${r.email_status}`}>
                      {r.email_status}
                    </span>
                  </td>
                  <td>{r.created_by_username || "-"}</td>
                  <td>{formatDate(r.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Reports;
