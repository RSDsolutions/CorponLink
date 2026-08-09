import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { MapPin, Star, Calendar, Download, Search, TrendingUp, ChevronDown, ChevronRight, Users } from 'lucide-react';
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

export default function AdminRutas() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [supervisorFilter, setSupervisorFilter] = useState('');
  const [supervisors, setSupervisors] = useState([]);
  const [expandedRoutes, setExpandedRoutes] = useState({});

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      // Obtener rutas con sus clientes enlazados
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          profiles:supervisor_id(full_name),
          clients!clients_route_id_fkey(id, first_name, last_name, document_id, phone, plan_name, status)
        `)
        .order('fecha', { ascending: false });

      if (error) throw error;
      setRoutes(data);

      const uniqueSups = [...new Map(
        data.map(r => [r.supervisor_id, r.profiles?.full_name])
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
    return matchesSearch && matchesSupervisor;
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
        'Total Visitas': r.total_visitas,
        'Total Ventas': r.total_ventas,
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
      { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 15 }, { wch: 14 }, { wch: 40 },
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
          <p className="text-muted">Historial de rutas con detalle de clientes enlazados por sector.</p>
        </div>
        <button className="btn btn-primary" onClick={exportToExcel} style={{ backgroundColor: 'var(--status-success-text)' }}>
          <Download size={18} /> Descargar Excel (.xlsx)
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

      {/* Filtros */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 2, minWidth: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text" className="form-input" placeholder="Buscar sector, municipio, barrio..."
              style={{ paddingLeft: '2.5rem' }} value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <select className="form-select" value={supervisorFilter} onChange={(e) => setSupervisorFilter(e.target.value)}>
              <option value="">Todos los supervisores</option>
              {supervisors.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Rutas con clientes expandibles */}
        <div style={{ padding: '1rem' }}>
          {filteredRoutes.map(r => (
            <div key={r.id} style={{
              border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
              marginBottom: '0.75rem', overflow: 'hidden',
              transition: 'box-shadow 0.2s ease'
            }}>
              {/* Cabecera de ruta */}
              <div
                onClick={() => toggleExpand(r.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem 1.25rem', cursor: 'pointer',
                  background: expandedRoutes[r.id] ? 'rgba(var(--primary-rgb, 59, 130, 246), 0.05)' : 'transparent',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ marginRight: 'auto', flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <MapPin size={15} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{r.sector_name}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--primary)' }}>{r.profiles?.full_name}</strong>
                    {' · '}
                    <Calendar size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                    {' '}
                    {new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                    {r.municipio && ` · ${[r.municipio, r.barrio].filter(Boolean).join(', ')}`}
                  </div>
                </div>

                {/* Métricas */}
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700 }}>{r.total_visitas}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Visitas</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: 'var(--status-success-text)' }}>{r.total_ventas}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ventas</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: '#8b5cf6' }}>{r.clients?.length || 0}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Clientes</div>
                  </div>
                  {/* Rating badge */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: getRatingColor(r.sector_rating),
                    color: 'white', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 700
                  }}>
                    {r.sector_rating}
                  </div>
                  {/* Expand icon */}
                  {expandedRoutes[r.id] ? <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />}
                </div>
              </div>

              {/* Clientes de la ruta */}
              {expandedRoutes[r.id] && (
                <div style={{ borderTop: '1px solid var(--border)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  {r.clients && r.clients.length > 0 ? (
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
                  ) : (
                    <div style={{ padding: '1.25rem 2rem', color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                      No hay clientes registrados en esta ruta.
                    </div>
                  )}
                  {r.observaciones && (
                    <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <strong>Observaciones:</strong> {r.observaciones}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {filteredRoutes.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No hay rutas registradas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
