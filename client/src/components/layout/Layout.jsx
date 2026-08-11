import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Briefcase, 
  Kanban, 
  CheckSquare, 
  History, 
  BarChart3, 
  Bell, 
  LogOut, 
  Building2,
  Menu,
  X
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await API.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const roleClassMap = {
    'Admin': 'role-admin',
    'Sales Manager': 'role-manager',
    'Sales Executive': 'role-executive'
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="app-container">
      {/* Mobile Overlay */}
      <div 
        className={`mobile-overlay ${isSidebarOpen ? 'open' : ''}`} 
        onClick={closeSidebar}
      ></div>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Building2 className="text-neon-cyan" size={28} />
          <div>
            <div style={{ color: '#fff', fontSize: '1.4rem' }}>ApexCRM</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--neon-purple)', letterSpacing: '1px' }}>ENTERPRISE SUITE</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/leads" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <UserCheck size={18} />
            <span>Leads</span>
          </NavLink>

          <NavLink to="/customers" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Building2 size={18} />
            <span>Customers</span>
          </NavLink>

          <NavLink to="/pipeline" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Kanban size={18} />
            <span>Sales Pipeline</span>
          </NavLink>

          <NavLink to="/tasks" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <CheckSquare size={18} />
            <span>Tasks</span>
          </NavLink>

          <NavLink to="/activities" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <History size={18} />
            <span>Follow-ups</span>
          </NavLink>

          <NavLink to="/reports" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <BarChart3 size={18} />
            <span>Reports</span>
          </NavLink>

          {(user?.role === 'Admin' || user?.role === 'Sales Manager') && (
            <NavLink to="/users" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span>User Management</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-profile">
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--neon-purple)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.first_name} {user?.last_name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)' }}>{user?.role}</div>
          </div>
          <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Layout Section */}
      <div className="main-content">
        {/* Sticky Header Bar */}
        <header className="top-navbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <button style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="search-container" style={{ maxWidth: '400px' }}>
              <span className="search-icon" style={{ left: '16px' }}>🔍</span>
              <input type="text" className="form-input" placeholder="Search anything..." style={{ borderRadius: '2rem', background: 'rgba(255,255,255,0.05)', paddingLeft: '2.5rem' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--neon-cyan)', position: 'relative', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-5px', right: '-5px',
                    background: 'var(--neon-pink)', color: 'white',
                    fontSize: '0.65rem', fontWeight: 700,
                    width: '18px', height: '18px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: 'var(--shadow-glow-pink)', animation: 'pulseGlow 2s infinite'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Menu Dropdown */}
              {showNotifMenu && (
                <div style={{
                  position: 'absolute', right: 0, top: '40px',
                  width: '320px', background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)', borderRadius: '0.5rem',
                  boxShadow: 'var(--shadow-lg)', zIndex: 100, padding: '1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} style={{ background: 'none', color: 'var(--primary)', fontSize: '0.75rem' }}>
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {notifications.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} style={{
                          padding: '0.6rem', borderRadius: '0.375rem',
                          background: n.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.1)',
                          borderLeft: n.is_read ? 'none' : '3px solid var(--primary)'
                        }}>
                          <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{n.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <NavLink to="/notifications" onClick={() => setShowNotifMenu(false)} style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                      View all notifications
                    </NavLink>
                  </div>
                </div>
              )}
            </div>

            {/* Date Range Selector Mock */}
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              May 01 - May 31, 2026 ▼
            </div>
          </div>
        </header>

        {/* Page Body View */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
