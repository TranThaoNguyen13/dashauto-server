import { useState } from "react";
import { changeMyPassword } from "../services/user.service";
import { getUser } from "../services/auth.service";
import "./Reports.css";
import "./Users.css";

function Profile() {
  const user = getUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Mat khau moi khong khop");
      return;
    }

    setLoading(true);
    try {
      await changeMyPassword(currentPassword, newPassword);
      setMessage("Doi mat khau thanh cong");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "Loi doi mat khau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1>Ho so ca nhan</h1>
      <p className="page-desc">Thong tin tai khoan va doi mat khau.</p>

      <div className="profile-card">
        <p>
          <strong>Username:</strong> {user?.username}
        </p>
        <p>
          <strong>Vai tro:</strong> {user?.role}
        </p>
      </div>

      <h2>Doi mat khau</h2>
      <form className="user-form profile-form" onSubmit={handleSubmit}>
        <label>
          Mat khau hien tai
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </label>
        <label>
          Mat khau moi
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </label>
        <label>
          Xac nhan mat khau moi
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? "Dang xu ly..." : "Cap nhat"}
        </button>
      </form>

      {message && <p className="profile-success">{message}</p>}
      {error && <p className="dashboard-error">{error}</p>}
    </div>
  );
}

export default Profile;
