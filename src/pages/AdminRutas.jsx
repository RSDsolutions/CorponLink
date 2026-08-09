import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { MapPin, Star, Calendar, Download, Search, TrendingUp, ChevronDown, ChevronRight, Users, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';

const RATING_LABELS = {
  1: 'Muy Malo', 2: 'Malo', 3: 'Regular', 4: 'Bueno', 5: 'Bueno+',
  6: 'Muy Bueno', 7: 'Excelente', 8: 'Excelente+', 9: 'Sobresaliente', 10: 'Perfecto'
};

const getRatingColor = (rating) => {
  if (rating <= 3) return 'var(--status-danger-text)';
  if (rating <= 5) return '#f59e0b';
  if (rating <= 7) return '#3b82f6';
  return 'var(--status-success-text)';
};

const formatTime = (t) => {
  if (!t) return null;
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
};

export default function AdminRutas() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [supervisorFilter, setSupervisorFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [supervisors, setSupervisors] = useState([]);
  const [expandedRoutes, setExpandedRoutes] = useState({});

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      // Query 1: all routes with supervisor profile
      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select('*, profiles:supervisor_id(full_name)')
        .order('fecha', { ascending: false });

      if (routesError) throw routesError;

      // Query 2: all clients that have a route_id (to avoid FK embed issues)
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, first_name, last_name, document_id, phone, plan_name, status, route_id')
        .not('route_id', 'is', null);

      if (clientsError) throw clientsError;

      // Combine: attach clients array to each route
      const combined = routesData.map(route => ({
        ...route,
        clients: clientsData.filter(c => c.route_id === route.id)
      }));

      setRoutes(combined);

      // Extract unique supervisors for filter dropdown
      const uniqueSups = [...new Map(
        routesData.map(r => [r.supervisor_id, r.profiles?.full_name])
      ).entries()].map(([id, name]) => ({ id, name }));
      setSupervisors(uniqueSups);
    } catch (error) {
      console.error('Error fetching routes:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoutes(); }, []);

  const filteredRoutes = routes.filter(r => {
    const matchesSearch =
      r.sector_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.municipio && r.municipio.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.barrio && r.barrio.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSupervisor = supervisorFilter === '' || r.supervisor_id === supervisorFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const routeDate = new Date(r.fecha + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateFilter === 'today') {
        matchesDate = routeDate.getTime() === today.getTime();
      } else if (dateFilter === 'week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        matchesDate = routeDate >= startOfWeek;
      } else if (dateFilter === 'month') {
        matchesDate = routeDate.getMonth() === today.getMonth() && routeDate.getFullYear() === today.getFullYear();
      } else if (dateFilter === 'year') {
        matchesDate = routeDate.getFullYear() === today.getFullYear();
      }
    }

    return matchesSearch && matchesSupervisor && matchesDate;
  });

  const avgRating = filteredRoutes.length > 0
    ? (filteredRoutes.reduce((sum, r) => sum + r.sector_rating, 0) / filteredRoutes.length).toFixed(1)
    : 0;
  const totalVentas = filteredRoutes.reduce((sum, r) => sum + (r.total_ventas || 0), 0);
  const totalClientes = filteredRoutes.reduce((sum, r) => sum + (r.clients?.length || 0), 0);

  const toggleExpand = (id) => setExpandedRoutes(prev => ({ ...prev, [id]: !prev[id] }));

  const exportToExcel = () => {
    if (filteredRoutes.length === 0) return;
    const rows = [];
    filteredRoutes.forEach(r => {
      const base = {
        'Fecha': new Date(r.fecha + 'T00:00:00').toLocaleDateString(),
        'Supervisor': r.profiles?.full_name || 'N/A',
        'Sector': r.sector_name,
        'Municipio': r.municipio || '',
        'Barrio': r.barrio || '',
        'Hora Inicio': r.hora_inicio || '',
        'Hora Fin': r.hora_fin || '',
        'Total Visitas': r.total_visitas || 0,
        'Total Ventas': r.total_ventas || 0,
        'Clientes Registrados': r.clients?.length || 0,
        'Calificación (1-10)': r.sector_rating,
        'Nivel': RATING_LABELS[r.sector_rating] || '',
        'Observaciones': r.observaciones || ''
      };
      if (r.clients && r.clients.length > 0) {
        r.clients.forEach(c => {
          rows.push({
            ...base,
            'Nombre Cliente': `${c.first_name} ${c.last_name}`,
            'Doc. Cliente': c.document_id,
            'Tel. Cliente': c.phone,
            'Plan Cliente': c.plan_name,
            'Estado Cliente': c.status
          });
        });
      } else {
        rows.push({ ...base, 'Nombre Cliente': '', 'Doc. Cliente': '', 'Tel. Cliente': '', 'Plan Cliente': '', 'Estado Cliente': '' });
      }
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 18 }, { wch: 18 },
      { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
      { wch: 15 }, { wch: 14 }, { wch: 40 },
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rutas CorponNet');
    XLSX.writeFile(workbook, `Reporte_Rutas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Rutas</h2>
          <p className="text-muted">Historial de rutas con clientes enlazados por sector.</p>
        </div>
        <button className="btn btn-primary" onClick={exportToExcel} style={{ backgroundColor: 'var(--status-success-text)' }}>
          <Download size={18} /> Descargar Excel
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue"><MapPin size={24} /></div>
          <div className="kpi-value">{filteredRoutes.length}</div>
          <div className="kpi-label">Rutas Registradas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon yellow"><Star size={24} /></div>
          <div className="kpi-value">{avgRating}</div>
          <div className="kpi-label">Calificación Promedio</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green"><TrendingUp size={24} /></div>
          <div className="kpi-value">{totalVentas}</div>
          <div className="kpi-label">Ventas Reportadas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon blue" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
            <Users size={24} />
          </div>
          <div className="kpi-value">{totalClientes}</div>
          <div className="kpi-label">Clientes en Rutas</div>
        </div>
      </div>

      {/* Tabla / lista */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Filtros */}
        <div className="card-header" style={{ padding: '1.25rem 1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 2, minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text" className="form-input" placeholder="Buscar sector, municipio..."
              style={{ paddingLeft: '2.25rem' }} value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <select className="form-select" value={supervisorFilter} onChange={(e) => setSupervisorFilter(e.target.value)}>
              <option value="">Todos los supervisores</option>
              {supervisors.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '160px' }}>
            <select className="form-select" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="all">Todas las fechas</option>
              <option value="today">Hoy</option>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mes</option>
              <option value="year">Este Año</option>
            </select>
          </div>
        </div>

        {/* Rutas expandibles */}
        <div style={{ padding: '1rem' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando rutas...</div>
          )}

          {!loading && filteredRoutes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No hay rutas registradas aún.
            </div>
          )}

          {filteredRoutes.map(r => (
            <div key={r.id} style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '0.75rem',
              overflow: 'hidden',
              transition: 'box-shadow 0.2s ease'
            }}>
              {/* Cabecera clickeable */}
              <div
                onClick={() => toggleExpand(r.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  cursor: 'pointer',
                  background: expandedRoutes[r.id] ? 'rgba(79, 70, 229, 0.04)' : 'transparent',
                  flexWrap: 'wrap'
                }}
              >
                {/* Info principal */}
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <MapPin size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{r.sector_name}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.profiles?.full_name}</span>
                    <span>·</span>
                    <span>
                      <Calendar size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />
                      {new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    {(r.hora_inicio || r.hora_fin) && (
                      <>
                        <span>·</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Clock size={11} />
                          {formatTime(r.hora_inicio)} {r.hora_fin ? `→ ${formatTime(r.hora_fin)}` : ''}
                        </span>
                      </>
                    )}
                    {r.municipio && <span>· {[r.municipio, r.barrio].filter(Boolean).join(', ')}</span>}
                  </div>
                </div>

                {/* Métricas */}
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{r.total_visitas || 0}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Visitas</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--status-success-text)' }}>{r.total_ventas || 0}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ventas</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#8b5cf6' }}>{r.clients?.length || 0}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Clientes</div>
                  </div>
                  {/* Rating badge */}
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: getRatingColor(r.sector_rating),
                    color: 'white', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem',
                    flexShrink: 0
                  }}>
                    {r.sector_rating}
                  </div>
                  {expandedRoutes[r.id]
                    ? <ChevronDown size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    : <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  }
                </div>
              </div>

              {/* Clientes de la ruta — expandible */}
              {expandedRoutes[r.id] && (
                <div style={{ borderTop: '1px solid var(--border)', backgroundColor: 'rgba(248, 250, 252, 0.8)' }}>
                  {r.clients && r.clients.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th style={{ paddingLeft: '2rem' }}>Cliente</th>
                            <th>Doc. Identidad</th>
                            <th>Teléfono</th>
                            <th>Plan</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.clients.map(c => (
                            <tr key={c.id}>
                              <td style={{ paddingLeft: '2rem' }}>
                                <div className="client-name">{c.first_name} {c.last_name}</div>
                              </td>
                              <td><div className="client-doc">{c.document_id}</div></td>
                              <td><div style={{ fontSize: '0.875rem' }}>{c.phone}</div></td>
                              <td><div style={{ fontSize: '0.875rem' }}>{c.plan_name}</div></td>
                              <td>
                                <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: '1.25rem 2rem', color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                      No hay clientes registrados en esta ruta aún.
                    </div>
                  )}
                  {r.observaciones && (
                    <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'white' }}>
                      <strong>Observaciones:</strong> {r.observaciones}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
