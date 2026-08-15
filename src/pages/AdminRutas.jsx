import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { MapPin, Star, Calendar, Download, Search, TrendingUp, ChevronDown, ChevronRight, Users, Clock, Trash2, AlertTriangle, X } from 'lucide-react';
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
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showRouteModal, setShowRouteModal] = useState(false);

  // Soft delete modal for route
  const [routeToDelete, setRouteToDelete] = useState(null);
  const [deletionReason, setDeletionReason] = useState('Eliminado por mala digitación');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select('*, profiles:supervisor_id(full_name)')
        .order('fecha', { ascending: false });

      if (routesError) throw routesError;

      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, first_name, last_name, document_id, phone, plan_name, status, route_id')
        .not('route_id', 'is', null);

      if (clientsError) throw clientsError;

      const combined = (routesData || []).map(route => ({
        ...route,
        clients: (clientsData || []).filter(c => c.route_id === route.id)
      }));

      setRoutes(combined);

      const uniqueSups = [...new Map(
        (routesData || []).map(r => [r.supervisor_id, r.profiles?.full_name])
      ).entries()].map(([id, name]) => ({ id, name }));
      setSupervisors(uniqueSups);
    } catch (error) {
      console.error('Error fetching routes:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoutes(); }, []);

  const confirmSoftDeleteRoute = async () => {
    if (!routeToDelete) return;
    try {
      const { error } = await supabase
        .from('routes')
        .update({
          status: 'Eliminado',
          deletion_reason: deletionReason || 'Eliminado por mala digitación'
        })
        .eq('id', routeToDelete.id);

      if (error) throw error;
      setShowDeleteModal(false);
      setRouteToDelete(null);
      fetchRoutes();
    } catch (error) {
      alert('Error al realizar borrado lógico de ruta: ' + error.message);
    }
  };

  const filteredRoutes = routes.filter(r => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (r.sector_name || '').toLowerCase().includes(searchLower) ||
      (r.provincia && r.provincia.toLowerCase().includes(searchLower)) ||
      (r.municipio && r.municipio.toLowerCase().includes(searchLower)) ||
      (r.barrio && r.barrio.toLowerCase().includes(searchLower));
    
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

  const activeRoutes = filteredRoutes.filter(r => r.status !== 'Eliminado');
  const avgRating = activeRoutes.length > 0
    ? (activeRoutes.reduce((sum, r) => sum + r.sector_rating, 0) / activeRoutes.length).toFixed(1)
    : 0;
  const totalVentas = activeRoutes.reduce((sum, r) => sum + (r.total_ventas || 0), 0);
  const totalClientes = activeRoutes.reduce((sum, r) => sum + (r.clients?.length || 0), 0);
  const totalEliminadas = filteredRoutes.filter(r => r.status === 'Eliminado').length;

  const toggleExpand = (id) => setExpandedRoutes(prev => ({ ...prev, [id]: !prev[id] }));
  const openRouteModal = (route) => { setSelectedRoute(route); setShowRouteModal(true); };

  const exportToExcel = () => {
    if (filteredRoutes.length === 0) return;
    const rows = [];
    filteredRoutes.forEach(r => {
      const base = {
        'Fecha': new Date(r.fecha + 'T00:00:00').toLocaleDateString(),
        'Supervisor': r.profiles?.full_name || 'N/A',
        'Sector': r.sector_name,
        'Provincia': r.provincia || r.municipio || '',
        'Barrio': r.barrio || '',
        'Hora Inicio': r.hora_inicio || '',
        'Hora Fin': r.hora_fin || '',
        'Total Visitas': r.total_visitas || 0,
        'Total Ventas': r.total_ventas || 0,
        'Clientes Registrados': r.clients?.length || 0,
        'Calificación (1-10)': r.sector_rating,
        'Nivel': RATING_LABELS[r.sector_rating] || '',
        'Estado Ruta': r.status || 'Cerrada',
        'Motivo Eliminación': r.deletion_reason || '',
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
      { wch: 15 }, { wch: 14 }, { wch: 12 }, { wch: 28 }, { wch: 40 },
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
          <h2>Administración de Rutas</h2>
          <p className="text-muted">Historial global de sectores, calificaciones y borrado lógico.</p>
        </div>
        <button className="btn btn-primary" onClick={exportToExcel} style={{ backgroundColor: 'var(--status-success-text)' }}>
          <Download size={18} /> Descargar Excel
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue"><MapPin size={24} /></div>
          <div className="kpi-value">{activeRoutes.length}</div>
          <div className="kpi-label">Rutas Activas</div>
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
          <div className="kpi-icon red"><Trash2 size={24} /></div>
          <div className="kpi-value">{totalEliminadas}</div>
          <div className="kpi-label">Rutas Eliminadas</div>
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
              No hay rutas registradas.
            </div>
          )}

          {filteredRoutes.map(r => {
            const isEliminada = r.status === 'Eliminado';

            return (
              <div key={r.id} style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '0.75rem',
                overflow: 'hidden',
                opacity: isEliminada ? 0.7 : 1,
                backgroundColor: isEliminada ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                transition: 'box-shadow 0.2s ease'
              }}>
                <div
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
                  <div style={{ flex: 1, minWidth: '180px' }} onClick={() => openRouteModal(r)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <MapPin size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{r.sector_name}</span>
                      {isEliminada && (
                        <span className="badge badge-eliminado" style={{ fontSize: '0.7rem' }}>
                          Eliminada ({r.deletion_reason || 'Borrado lógico'})
                        </span>
                      )}
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
                    </div>
                    <div style={{ marginTop: '0.4rem' }}>
                      <button type="button" className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); openRouteModal(r); }}>
                        Ver detalle
                      </button>
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
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: getRatingColor(r.sector_rating),
                      color: 'white', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem',
                      flexShrink: 0
                    }}>
                      {r.sector_rating}
                    </div>

                    {!isEliminada && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger-text)', border: 'none' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRouteToDelete(r);
                          setDeletionReason('Eliminado por mala digitación');
                          setShowDeleteModal(true);
                        }}
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                    )}

                    <div onClick={() => toggleExpand(r.id)}>
                      {expandedRoutes[r.id]
                        ? <ChevronDown size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        : <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      }
                    </div>
                  </div>
                </div>

                {/* Detalle expandible */}
                {expandedRoutes[r.id] && (
                  <div style={{ borderTop: '1px solid var(--border)', backgroundColor: 'rgba(248, 250, 252, 0.8)' }}>
                    {r.observaciones && (
                      <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'white' }}>
                        <strong>Observaciones:</strong> {r.observaciones}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Detalle de Ruta */}
      {showRouteModal && selectedRoute && (
        <div className="modal-overlay" onClick={() => setShowRouteModal(false)}>
          <div className="modal-content" style={{ maxWidth: '760px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>{selectedRoute.sector_name}</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>{selectedRoute.profiles?.full_name || 'Supervisor desconocido'}</p>
              </div>
              <button onClick={() => setShowRouteModal(false)} className="btn btn-icon btn-secondary" style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <strong>Fecha:</strong> {new Date(selectedRoute.fecha + 'T00:00:00').toLocaleDateString()}
                </div>
                <div>
                  <strong>Horario:</strong> {formatTime(selectedRoute.hora_inicio)} {selectedRoute.hora_fin ? `→ ${formatTime(selectedRoute.hora_fin)}` : ''}
                </div>
                <div>
                  <strong>Provincia / Municipio:</strong> {selectedRoute.provincia || selectedRoute.municipio || '-'}
                </div>
                <div>
                  <strong>Barrio:</strong> {selectedRoute.barrio || '-'}
                </div>
              </div>

              {selectedRoute.observaciones && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Observaciones:</strong>
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--status-neutral-bg)' }}>{selectedRoute.observaciones}</div>
                </div>
              )}

              <div>
                <h4 style={{ marginBottom: '0.5rem' }}>Clientes asociados ({selectedRoute.clients?.length || 0})</h4>
                {selectedRoute.clients && selectedRoute.clients.length > 0 ? (
                  <table className="table" style={{ marginBottom: 0 }}>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Cédula</th>
                        <th>Teléfono</th>
                        <th>Plan</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRoute.clients.map(c => (
                        <tr key={c.id}>
                          <td>{c.first_name} {c.last_name}</td>
                          <td>{c.document_id}</td>
                          <td>{c.phone}</td>
                          <td>{c.plan_name}</td>
                          <td>{c.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>No hay clientes asociados a esta ruta.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Borrado Lógico de Ruta */}
      {showDeleteModal && routeToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-danger-text)' }}>
                <AlertTriangle size={22} />
                <h3 style={{ margin: 0, color: 'var(--status-danger-text)' }}>¿Está seguro de eliminar?</h3>
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="btn btn-icon btn-secondary" style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                La ruta del sector <strong>{routeToDelete.sector_name}</strong> será cambiada al estado de borrado lógico (<strong>Eliminada</strong>).
              </p>

              <div style={{
                padding: '0.875rem',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                fontSize: '0.85rem'
              }}>
                <label className="form-label" style={{ color: 'var(--status-danger-text)', fontWeight: 600 }}>
                  Motivo de Eliminación:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="Motivo de eliminación..."
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                  Se asignará como motivo: <em>Eliminado por mala digitación</em>.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
                <button
                  type="button"
                  className="btn"
                  style={{ backgroundColor: 'var(--status-danger-text)', color: 'white' }}
                  onClick={confirmSoftDeleteRoute}
                >
                  <Trash2 size={16} /> Confirmar Eliminación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
