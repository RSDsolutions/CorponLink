import { supabase } from '../services/supabase';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut,
  Signal
} from 'lucide-react';

export default function Layout({ children, role, userProfile }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="kpi-icon blue" style={{ width: 32, height: 32, marginBottom: 0, borderRadius: 8 }}>
            <Signal size={20} />
          </div>
          <div className="sidebar-logo">CorponNet</div>
        </div>
        
        <div className="sidebar-menu">
          <NavLink to="/" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`} end>
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>
          
          {role === 'admin' && (
            <NavLink to="/users" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
              <Users size={20} /> Gestión de Usuarios
            </NavLink>
          )}

          <button onClick={handleLogout} className="menu-item danger">
            <LogOut size={20} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="main-wrapper">
        <header className="top-header">
          <div>
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
