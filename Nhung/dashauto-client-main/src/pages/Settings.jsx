import { useState } from "react";
import "./Reports.css";

function Settings() {
  const [systemName, setSystemName] = useState("DashAuto");
  const [email, setEmail] = useState("admin@gmail.com");
  const [timezone, setTimezone] = useState("Asia/Ho_Chi_Minh");
  const [message, setMessage] = useState("");

  const handleSave = () => {
    localStorage.setItem("systemName", systemName);
    localStorage.setItem("adminEmail", email);
    localStorage.setItem("timezone", timezone);
    setMessage("Da luu cai dat thanh cong");
  };

  return (
    <div className="page">
      <h1>Cai dat</h1>
      <p>Quan ly thong tin he thong va cau hinh van hanh.</p>

      <div className="filters" style={{ display: "block", padding: "24px" }}>
        <label>
          Ten he thong
          <input
            value={systemName}
            onChange={(e) => setSystemName(e.target.value)}
            style={{ display: "block", marginTop: 8, padding: 10, width: 320 }}
          />
        </label>

        <br />

        <label>
          Email quan tri
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: "block", marginTop: 8, padding: 10, width: 320 }}
          />
        </label>

        <br />

        <label>
          Mui gio
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            style={{ display: "block", marginTop: 8, padding: 10, width: 340 }}
          >
            <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option>
            <option value="UTC">UTC</option>
            <option value="Asia/Tokyo">Asia/Tokyo</option>
          </select>
        </label>

        <br />

        <button onClick={handleSave} className="btn-primary">
          Luu cai dat
        </button>

        {message && <p style={{ color: "green" }}>{message}</p>}
      </div>
    </div>
  );
}

export default Settings;