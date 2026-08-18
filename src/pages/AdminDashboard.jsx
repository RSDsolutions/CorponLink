import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Globe, CheckCircle, Users, MapPin, AlertTriangle, BarChart3, TrendingUp } from 'lucide-react';

const getPersonName = (person, fallback = 'Sin asignación') => {
  if (!person) return fallback;

  const composedName = [
    person.first_name,
    person.second_name,
    person.first_surname,
    person.second_surname
  ].filter(Boolean).join(' ');

  if (composedName) return composedName;
  if (person.full_name) return person.full_name;
  if (person.name) return person.name;

  return fallback;
};

const getPlanLabel = (client) => {
  if (client.plan_family && client.plan) return `${client.plan_family} · ${client.plan}`;
  if (client.plan_family) return client.plan_family;
  if (client.plan) return client.plan;
  if (client.plan_name) return client.plan_name;
  return 'Sin plan';
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, activos: 0, pendientes: 0, totalRoutes: 0 });
  const [supervisorRanking, setSupervisorRanking] = useState([]);
  const [advisorRanking, setAdvisorRanking] = useState([]);
  const [planRanking, setPlanRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          { data: clients },
          { data: routes },
          { data: supervisors },
          { data: advisors }
        ] = await Promise.all([
          supabase
            .from('clients')
            .select('id, status, supervisor_id, advisor_id, plan_family, plan, plan_name'),
          supabase.from('routes').select('id'),
          supabase
            .from('profiles')
            .select('id, full_name, first_name, second_name, first_surname, second_surname, role')
            .eq('role', 'supervisor'),
          supabase
            .from('advisors')
            .select('id, full_name, first_name, second_name, first_surname, second_surname, code')
        ]);

        const safeClients = clients || [];
        const safeSupervisors = supervisors || [];
        const safeAdvisors = advisors || [];

        setStats({
          total: safeClients.length,
          activos: safeClients.filter(c => c.status === 'Activo').length,
          pendientes: safeClients.filter(c => ['Ingresado'].includes(c.status)).length,
          totalRoutes: routes?.length || 0
        });

        const supervisorMap = new Map(
          safeSupervisors.map(supervisor => [supervisor.id, supervisor])
        );

        const advisorMap = new Map(
          safeAdvisors.map(advisor => [advisor.id, advisor])
        );

        const supervisorStats = new Map();
        const advisorStats = new Map();
        const planStats = new Map();

        safeClients.forEach(client => {
          if (client.status === 'Eliminado') return;

          if (client.supervisor_id) {
            const current = supervisorStats.get(client.supervisor_id) || {
              id: client.supervisor_id,
              activos: 0,
              rechazados: 0,
              total: 0
            };

            current.total += 1;
            if (client.status === 'Activo') current.activos += 1;
            if (client.status === 'Rechazado') current.rechazados += 1;
            supervisorStats.set(client.supervisor_id, current);
          }

          if (client.advisor_id) {
            const current = advisorStats.get(client.advisor_id) || {
              id: client.advisor_id,
              activos: 0,
              rechazados: 0,
              total: 0
            };

            current.total += 1;
            if (client.status === 'Activo') current.activos += 1;
            if (client.status === 'Rechazado') current.rechazados += 1;
            advisorStats.set(client.advisor_id, current);
          }

          const planName = getPlanLabel(client);
          if (planName && planName !== 'Sin plan') {
            const current = planStats.get(planName) || { total: 0, activos: 0 };
            current.total += 1;
            if (client.status === 'Activo') current.activos += 1;
            planStats.set(planName, current);
          }
        });

        const buildSupervisorRanking = () => {
          const ids = [...new Set([...supervisorMap.keys(), ...supervisorStats.keys()])];

          return ids
            .map(id => {
              const profile = supervisorMap.get(id) || {};
              const current = supervisorStats.get(id) || { activos: 0, rechazados: 0, total: 0 };

              return {
                id,
                name: getPersonName(profile, 'Supervisor sin perfil'),
                activos: current.activos || 0,
                rechazados: current.rechazados || 0,
                total: current.total || 0
              };
            })
            .sort((a, b) => b.activos - a.activos || b.rechazados - a.rechazados || b.total - a.total || a.name.localeCompare(b.name));
        };

        const buildAdvisorRanking = () => {
          const ids = [...new Set([...advisorMap.keys(), ...advisorStats.keys()])];

          return ids
            .map(id => {
              const advisor = advisorMap.get(id) || {};
              const current = advisorStats.get(id) || { activos: 0, rechazados: 0, total: 0 };

              return {
                id,
                name: getPersonName(advisor, 'Asesor sin perfil'),
                activos: current.activos || 0,
                rechazados: current.rechazados || 0,
                total: current.total || 0
              };
            })
            .sort((a, b) => b.activos - a.activos || b.rechazados - a.rechazados || b.total - a.total || a.name.localeCompare(b.name));
        };

        const buildPlanRanking = () => {
          return Array.from(planStats.entries())
            .map(([name, value]) => ({
              name,
              total: value.total || 0,
              activos: value.activos || 0
            }))
            .sort((a, b) => b.total - a.total || b.activos - a.activos || a.name.localeCompare(b.name));
        };

        setSupervisorRanking(buildSupervisorRanking().slice(0, 5));
        setAdvisorRanking(buildAdvisorRanking().slice(0, 5));
        setPlanRanking(buildPlanRanking().slice(0, 6));
      } catch (error) {
        console.error('Error fetching dashboard data:', error.message);
        setSupervisorRanking([]);
        setAdvisorRanking([]);
        setPlanRanking([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const supervisorMaxActivos = Math.max(...supervisorRanking.map(item => item.activos), 1);
  const advisorMaxActivos = Math.max(...advisorRanking.map(item => item.activos), 1);
  const planMaxTotal = Math.max(...planRanking.map(item => item.total), 1);

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

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div className="card-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0 }}>Ranking de desempeño</h3>
            <p className="text-muted" style={{ marginTop: '0.35rem' }}>Top por activos, rechazos y volumen de contratación.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <TrendingUp size={16} />
            <span>Actualizado en tiempo real</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.25rem', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="kpi-icon blue" style={{ width: '38px', height: '38px', marginBottom: 0 }}><Users size={18} /></div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Supervisores</h3>
                <p className="text-muted" style={{ margin: 0 }}>Más clientes activos</p>
              </div>
            </div>

            {loading ? (
              <p className="text-muted">Cargando ranking...</p>
            ) : supervisorRanking.length === 0 ? (
              <p className="text-muted">No hay datos de supervisores.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {supervisorRanking.map((item, index) => (
                  <div key={item.id || index} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '0.85rem 0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{ minWidth: '28px', height: '28px', borderRadius: '50%', background: index === 0 ? 'var(--primary)' : index === 1 ? '#0ea5e9' : '#8b5cf6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                          {index + 1}
                        </span>
                        <strong style={{ fontSize: '0.95rem' }}>{item.name}</strong>
                      </div>
                      <span className="badge badge-activo">{item.activos} activos</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--border-light)', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.4rem' }}>
                      <div style={{ width: `${(item.activos / supervisorMaxActivos) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #4f46e5, #22c55e)', borderRadius: '999px' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>Rechazados: {item.rechazados}</span>
                      <span>Total: {item.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: '1.25rem', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="kpi-icon yellow" style={{ width: '38px', height: '38px', marginBottom: 0 }}><BarChart3 size={18} /></div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Asesores</h3>
                <p className="text-muted" style={{ margin: 0 }}>Más clientes activos y rechazados</p>
              </div>
            </div>

            {loading ? (
              <p className="text-muted">Cargando ranking...</p>
            ) : advisorRanking.length === 0 ? (
              <p className="text-muted">No hay datos de asesores.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {advisorRanking.map((item, index) => (
                  <div key={item.id || index} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '0.85rem 0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{ minWidth: '28px', height: '28px', borderRadius: '50%', background: index === 0 ? '#22c55e' : index === 1 ? '#f59e0b' : '#ef4444', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                          {index + 1}
                        </span>
                        <strong style={{ fontSize: '0.95rem' }}>{item.name}</strong>
                      </div>
                      <span className="badge badge-activo">{item.activos} activos</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--border-light)', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.4rem' }}>
                      <div style={{ width: `${(item.activos / advisorMaxActivos) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e, #f59e0b)', borderRadius: '999px' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>Rechazados: {item.rechazados}</span>
                      <span>Total: {item.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: '1.25rem', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="kpi-icon red" style={{ width: '38px', height: '38px', marginBottom: 0 }}><AlertTriangle size={18} /></div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Planes contratados</h3>
                <p className="text-muted" style={{ margin: 0 }}>Volumen de venta por plan</p>
              </div>
            </div>

            {loading ? (
              <p className="text-muted">Cargando ranking...</p>
            ) : planRanking.length === 0 ? (
              <p className="text-muted">No hay planes contratados.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {planRanking.map((item, index) => (
                  <div key={`${item.name}-${index}`} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '0.85rem 0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{ minWidth: '28px', height: '28px', borderRadius: '50%', background: index === 0 ? '#ef4444' : index === 1 ? '#f59e0b' : '#4f46e5', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                          {index + 1}
                        </span>
                        <strong style={{ fontSize: '0.92rem', lineHeight: 1.3 }}>{item.name}</strong>
                      </div>
                      <span className="badge badge-registrado">{item.total}</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--border-light)', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.4rem' }}>
                      <div style={{ width: `${(item.total / planMaxTotal) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #f97316, #ef4444)', borderRadius: '999px' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>Activos: {item.activos}</span>
                      <span>Total: {item.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
