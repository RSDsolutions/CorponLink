import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Globe, CheckCircle, Users, MapPin } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, activos: 0, pendientes: 0, totalRoutes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [{ data: clients }, { data: routes }] = await Promise.all([
          supabase.from('clients').select('status'),
          supabase.from('routes').select('id')
        ]);

        setStats({
          total: clients?.length || 0,
          activos: clients?.filter(c => c.status === 'Activo').length || 0,
          pendientes: clients?.filter(c => ['Ingresado'].includes(c.status)).length || 0,
          totalRoutes: routes?.length || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Visión Global</h2>
          <p className="text-muted">Resumen ejecutivo de toda la operación CorponNet.</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue"><Globe size={24} /></div>
          <div className="kpi-value">{stats.total}</div>
          <div className="kpi-label">Total Histórico (Ventas)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green"><CheckCircle size={24} /></div>
          <div className="kpi-value">{stats.activos}</div>
          <div className="kpi-label">Instalaciones Activas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon yellow"><Users size={24} /></div>
          <div className="kpi-value">{stats.pendientes}</div>
          <div className="kpi-label">En Proceso / Por Instalar</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon blue" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
            <MapPin size={24} />
          </div>
          <div className="kpi-value">{stats.totalRoutes}</div>
          <div className="kpi-label">Rutas Registradas</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem', padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          Usa las secciones del menú lateral para ver el detalle de <strong>Clientes</strong>, <strong>Rutas</strong> o gestionar <strong>Usuarios</strong>.
        </p>
      </div>
    </div>
  );
}
