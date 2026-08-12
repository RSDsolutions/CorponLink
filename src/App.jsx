import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabase';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AdminClientes from './pages/AdminClientes';
import AdminRutas from './pages/AdminRutas';
import SupervisorDashboard from './pages/SupervisorDashboard';
import SupervisorClientes from './pages/SupervisorClientes';
import SupervisorRutas from './pages/SupervisorRutas';
import SupervisorAsesores from './pages/SupervisorAsesores';
import AdminUsers from './pages/AdminUsers';
import Layout from './components/Layout';

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)',
      gap: '1.5rem'
    }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: '1rem',
        background: '#4f46e5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(79,70,229,0.3)',
        animation: 'pulse 1.5s ease-in-out infinite'
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#0f172a', marginBottom: '0.25rem' }}>CorponNet</div>
        <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Cargando tu sesión...</div>
      </div>
      <div style={{
        width: 180,
        height: 4,
        background: '#e0e7ff',
        borderRadius: 999,
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          background: '#4f46e5',
          borderRadius: 999,
          animation: 'loading-bar 1.5s ease-in-out infinite'
        }} />
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 8px 32px rgba(79,70,229,0.3); }
          50% { transform: scale(1.08); box-shadow: 0 12px 40px rgba(79,70,229,0.45); }
        }
        @keyframes loading-bar {
          0% { width: 0%; margin-left: 0; }
          50% { width: 70%; margin-left: 0; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initializing: get current session and load profile
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const isAdmin = userProfile?.role === 'admin';
  const isSupervisor = userProfile?.role === 'supervisor';

  const renderDashboard = () => {
    if (isAdmin) return <AdminDashboard />;
    if (isSupervisor) return <SupervisorDashboard />;
    return <Navigate to="/login" />;
  };

  const renderClientes = () => {
    if (isAdmin) return <AdminClientes />;
    if (isSupervisor) return <SupervisorClientes />;
    return <Navigate to="/" />;
  };

  const renderRutas = () => {
    if (isAdmin) return <AdminRutas />;
    if (isSupervisor) return <SupervisorRutas />;
    return <Navigate to="/" />;
  };

  const withLayout = (content) => (
    <Layout role={userProfile?.role} userProfile={userProfile}>
      {content}
    </Layout>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={!session ? <Login /> : <Navigate to="/" replace />}
        />
        <Route
          path="/"
          element={!session ? <Navigate to="/login" replace /> : withLayout(renderDashboard())}
        />
        <Route
          path="/clientes"
          element={!session ? <Navigate to="/login" replace /> : withLayout(renderClientes())}
        />
        <Route
          path="/rutas"
          element={!session ? <Navigate to="/login" replace /> : withLayout(renderRutas())}
        />
        <Route
          path="/users"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : isAdmin ? (
              withLayout(<AdminUsers />)
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/supervisor/asesores"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : isSupervisor ? (
              withLayout(<SupervisorAsesores />)
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
