import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { getUser, logout } from "../services/auth.service";
import "./Layout.css";

function Layout() {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">DashAuto</div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/reports">Bao cao</NavLink>
          <NavLink to="/alerts">Canh bao</NavLink>
          <NavLink to="/workflows">Automation</NavLink>
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-user">
            <span>
              {user?.username} ({user?.role})
            </span>
            <button onClick={handleLogout}>Dang xuat</button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
