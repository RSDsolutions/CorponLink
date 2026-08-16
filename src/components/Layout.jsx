import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  MapPin,
  LogOut,
  Signal,
  Menu,
  X
} from 'lucide-react';

export default function Layout({ children, role, userProfile }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  const navLinks = (
    <>
      <NavLink to="/" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`} end onClick={closeSidebar}>
        <LayoutDashboard size={20} /> Dashboard
      </NavLink>
      <NavLink to="/clientes" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
        <Users size={20} /> Clientes
      </NavLink>
      <NavLink to="/rutas" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
        <MapPin size={20} /> Rutas
      </NavLink>
      {role === 'supervisor' && (
        <NavLink to="/supervisor/asesores" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
          <Users size={20} /> Mis Asesores
        </NavLink>
      )}
      {role === 'admin' && (
        <>
          <NavLink to="/admin/asesores" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <Users size={20} /> Gestión de Asesores
          </NavLink>
          <NavLink to="/users" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <Users size={20} /> Gestión de Usuarios
          </NavLink>
        </>
      )}
      <button onClick={handleLogout} className="menu-item danger">
        <LogOut size={20} /> Cerrar Sesión
      </button>
    </>
  );

  return (
    <div className="app-container">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="kpi-icon blue" style={{ width: 32, height: 32, marginBottom: 0, borderRadius: 8, flexShrink: 0 }}>
            <Signal size={20} />
          </div>
          <div className="sidebar-logo">CorponNet</div>
          <button
            className="sidebar-close-btn"
            onClick={closeSidebar}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>
        <div className="sidebar-menu">
          {navLinks}
        </div>
      </aside>

      {/* Main Area */}
      <div className="main-wrapper">
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Hamburger button — only visible on mobile */}
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>
            <h3 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>
              Panel de Control
            </h3>
          </div>
          <div className="user-profile">
            <div className="user-info" style={{ textAlign: 'right' }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{userProfile?.full_name || 'Cargando...'}</span>
              <span className="user-role">{role}</span>
            </div>
            <div className="user-avatar">
              {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : <Users size={20} />}
            </div>
          </div>
        </header>

        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
}
