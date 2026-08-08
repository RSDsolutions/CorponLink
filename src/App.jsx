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
import AdminUsers from './pages/AdminUsers';
import Layout from './components/Layout';

function App() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
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
      console.error('Error fetching role:', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Cargando...</div>;
  }

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
