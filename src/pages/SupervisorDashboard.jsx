import { useState, useEffect } from 'react';
import { supabase, getCurrentAuthUser } from '../services/supabase';
import { Users, BarChart, CheckCircle, MapPin } from 'lucide-react';

export default function SupervisorDashboard() {
  const [stats, setStats] = useState({ totalClients: 0, pendientes: 0, activos: 0, totalRoutes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const user = await getCurrentAuthUser({ allowDemo: false });
        if (!user?.id) {
          setStats({ totalClients: 0, pendientes: 0, activos: 0, totalRoutes: 0 });
          return;
        }

        const [{ data: clients }, { data: routes }] = await Promise.all([
          supabase.from('clients').select('status'),
          supabase.from('routes').select('id').eq('supervisor_id', user.id)
        ]);

        setStats({
          totalClients: clients?.length || 0,
          pendientes: clients?.filter(c => ['Registrado', 'Contactado', 'Programado'].includes(c.status)).length || 0,
          activos: clients?.filter(c => c.status === 'Activo').length || 0,
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
          <h2>Panel de Supervisor</h2>
          <p className="text-muted">Resumen general de clientes, rutas y actividad del equipo.</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue"><Users size={24} /></div>
          <div className="kpi-value">{stats.totalClients}</div>
          <div className="kpi-label">Clientes Totales</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon yellow"><BarChart size={24} /></div>
          <div className="kpi-value">{stats.pendientes}</div>
          <div className="kpi-label">En Proceso / Programados</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green"><CheckCircle size={24} /></div>
          <div className="kpi-value">{stats.activos}</div>
          <div className="kpi-label">Instalaciones Activas</div>
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
          Usa las secciones del menú lateral para gestionar tus <strong>Clientes</strong> o registrar <strong>Rutas</strong> del día.
        </p>
      </div>
    </div>
  );
}
