import { useState, useEffect } from 'react';
import { supabase, getCurrentAuthUser } from '../services/supabase';
import { MapPin, Plus, X, Save, Star, Calendar, TrendingUp, Clock, Trash2, AlertTriangle, Lock } from 'lucide-react';

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

export default function SupervisorRutas() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal Apertura (Open Route)
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openFormData, setOpenFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    sector_name: '',
    provincia: '',
    barrio: '',
    hora_inicio: ''
  });

  // Modal Cierre (Close Route)
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [routeToClose, setRouteToClose] = useState(null);
  const [closeFormData, setCloseFormData] = useState({
    hora_fin: '',
    total_visitas: '',
    total_ventas: '',
    sector_rating: '7',
    observaciones: ''
  });

  // Modal Edición de Ruta abierta
  const [showEditModal, setShowEditModal] = useState(false);
  const [routeToEdit, setRouteToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    sector_name: '',
    provincia: '',
    barrio: '',
    hora_inicio: '',
    change_reason: ''
  });

  // Modal Borrado Lógico
  const [routeToDelete, setRouteToDelete] = useState(null);
  const [deletionReason, setDeletionReason] = useState('Eliminado por mala digitación');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const user = await getCurrentAuthUser({ allowDemo: false });
      if (!user?.id) {
        setRoutes([]);
        return;
      }

      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('supervisor_id', user.id)
        .order('fecha', { ascending: false });
      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error fetching routes:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoutes(); }, []);

  const handleOpenChange = (e) => setOpenFormData({ ...openFormData, [e.target.name]: e.target.value });
  const handleCloseChange = (e) => setCloseFormData({ ...closeFormData, [e.target.name]: e.target.value });
  const handleEditChange = (e) => setEditFormData({ ...editFormData, [e.target.name]: e.target.value });

  // Apertura de Ruta
  const handleOpenSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await getCurrentAuthUser({ allowDemo: false });
      if (!user?.id) {
        alert('No hay una sesión activa para abrir rutas.');
        return;
      }

      const payload = {
        ...openFormData,
        supervisor_id: user.id,
        status: 'Abierta',
        total_visitas: 0,
        total_ventas: 0,
        sector_rating: 0
      };
      const { error } = await supabase.from('routes').insert([payload]);
      if (error) throw error;
      
      setOpenFormData({
        fecha: new Date().toISOString().split('T')[0],
        sector_name: '', provincia: '', barrio: '', hora_inicio: ''
      });
      setShowOpenModal(false);
      fetchRoutes();
    } catch (error) {
      alert('Error abriendo ruta: ' + error.message);
    }
  };

  // Cierre de Ruta
  const handleCloseSubmit = async (e) => {
    e.preventDefault();
    if (!routeToClose) return;
    try {
      const payload = {
        hora_fin: closeFormData.hora_fin,
        total_visitas: parseInt(closeFormData.total_visitas) || 0,
        total_ventas: parseInt(closeFormData.total_ventas) || 0,
        sector_rating: parseInt(closeFormData.sector_rating),
        observaciones: closeFormData.observaciones,
        status: 'Cerrada'
      };
      const { error } = await supabase
        .from('routes')
        .update(payload)
        .eq('id', routeToClose.id);
      
      if (error) throw error;
      
      setShowCloseModal(false);
      setRouteToClose(null);
      fetchRoutes();
    } catch (error) {
      alert('Error cerrando ruta: ' + error.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!routeToEdit) return;
    if (!editFormData.change_reason?.trim()) {
      alert('Debes indicar el motivo del cambio antes de guardar la ruta abierta.');
      return;
    }

    try {
      const { error } = await supabase
        .from('routes')
        .update({
          sector_name: editFormData.sector_name.trim(),
          provincia: editFormData.provincia.trim(),
          barrio: editFormData.barrio.trim(),
          hora_inicio: editFormData.hora_inicio,
          last_change_reason: editFormData.change_reason.trim(),
          last_changed_at: new Date().toISOString()
        })
        .eq('id', routeToEdit.id)
        .eq('status', 'Abierta');

      if (error) throw error;
      setShowEditModal(false);
      setRouteToEdit(null);
      setEditFormData({ sector_name: '', provincia: '', barrio: '', hora_inicio: '', change_reason: '' });
      fetchRoutes();
      alert('Ruta actualizada correctamente.');
    } catch (error) {
      alert('Error editando ruta abierta: ' + error.message);
    }
  };

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

  const activeRoutes = routes.filter(r => r.status !== 'Eliminado');
  const totalAbiertas = activeRoutes.filter(r => r.status === 'Abierta').length;
  const avgRating = activeRoutes.filter(r => r.status === 'Cerrada' && r.sector_rating > 0).length > 0
    ? (activeRoutes.filter(r => r.status === 'Cerrada' && r.sector_rating > 0).reduce((sum, r) => sum + r.sector_rating, 0) / activeRoutes.filter(r => r.status === 'Cerrada' && r.sector_rating > 0).length).toFixed(1)
    : 0;
  const totalVentas = activeRoutes.reduce((sum, r) => sum + (r.total_ventas || 0), 0);
  const totalEliminadas = routes.filter(r => r.status === 'Eliminado').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Gestión de Rutas</h2>
          <p className="text-muted">Apertura y cierre de sectores visitados.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowOpenModal(true)}>
          <Plus size={18} /> Aperturar Ruta
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue"><MapPin size={24} /></div>
          <div className="kpi-value">{totalAbiertas}</div>
          <div className="kpi-label">Rutas Abiertas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon yellow"><Star size={24} /></div>
          <div className="kpi-value">{avgRating}</div>
          <div className="kpi-label">Calificación Promedio</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green"><TrendingUp size={24} /></div>
          <div className="kpi-value">{totalVentas}</div>
          <div className="kpi-label">Ventas en Rutas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon red"><Trash2 size={24} /></div>
          <div className="kpi-value">{totalEliminadas}</div>
          <div className="kpi-label">Rutas Eliminadas</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Historial de Rutas</h3>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha / Horario</th>
                <th>Sector / Ubicación</th>
                <th>Visitas / Ventas</th>
                <th>Calificación</th>
                <th>Estado / Observaciones</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {routes.map(r => {
                const isEliminada = r.status === 'Eliminado';
                const isAbierta = r.status === 'Abierta';
                const isCerrada = r.status === 'Cerrada';

                return (
                  <tr key={r.id} style={{ opacity: isEliminada ? 0.7 : 1, backgroundColor: isEliminada ? 'rgba(239, 68, 68, 0.03)' : isAbierta ? 'rgba(59, 130, 246, 0.02)' : 'transparent' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                        <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.875rem' }}>
                          {new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {(r.hora_inicio || r.hora_fin) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <Clock size={11} />
                          {r.hora_inicio || '--'} → {r.hora_fin || '--'}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="client-name">{r.sector_name}</div>
                      <div className="client-doc">
                        {[r.provincia || r.municipio, r.barrio].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td>
                      {isCerrada ? (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>{r.total_visitas}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Visitas</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--status-success-text)' }}>{r.total_ventas}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ventas</div>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>En progreso...</span>
                      )}
                    </td>
                    <td>
                      {isCerrada && r.sector_rating > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: getRatingColor(r.sector_rating),
                            color: 'white', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem'
                          }}>
                            {r.sector_rating}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{RATING_LABELS[r.sector_rating]}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ maxWidth: '220px' }}>
                      <span className={`badge`} style={{ 
                        backgroundColor: isAbierta ? '#dbeafe' : isCerrada ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
                        color: isAbierta ? '#1e40af' : isCerrada ? 'var(--status-success-text)' : 'var(--status-danger-text)'
                      }}>
                        {r.status}
                      </span>
                      {isEliminada && r.deletion_reason && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--status-danger-text)', marginTop: '0.3rem' }}>Motivo: {r.deletion_reason}</div>
                      )}
                      {isCerrada && r.observaciones && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.observaciones}
                        </div>
                      )}
                    </td>
                    <td>
                      {!isEliminada && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {isAbierta && (
                            <>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => {
                                  setRouteToEdit(r);
                                  setEditFormData({
                                    sector_name: r.sector_name || '',
                                    provincia: r.provincia || '',
                                    barrio: r.barrio || '',
                                    hora_inicio: r.hora_inicio || '',
                                    change_reason: ''
                                  });
                                  setShowEditModal(true);
                                }}
                              >
                                Editar
                              </button>
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => {
                                  setRouteToClose(r);
                                  setCloseFormData({
                                    hora_fin: '',
                                    total_visitas: '',
                                    total_ventas: '',
                                    sector_rating: '7',
                                    observaciones: ''
                                  });
                                  setShowCloseModal(true);
                                }}
                              >
                                <Lock size={14} /> Cerrar
                              </button>
                            </>
                          )}
                          <button
                            className="btn btn-sm"
                            style={{ backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger-text)', border: 'none' }}
                            onClick={() => {
                              setRouteToDelete(r);
                              setDeletionReason('Eliminado por mala digitación');
                              setShowDeleteModal(true);
                            }}
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {routes.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No hay rutas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Aperturar Ruta */}
      {showOpenModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Aperturar Ruta del Día</h3>
              <button onClick={() => setShowOpenModal(false)} className="btn btn-icon btn-secondary" style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleOpenSubmit}>
                <div className="form-group">
                  <label className="form-label">Fecha de la Ruta</label>
                  <input type="date" name="fecha" className="form-input" required value={openFormData.fecha} onChange={handleOpenChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre del Sector *</label>
                  <input type="text" name="sector_name" className="form-input" required placeholder="Ej: Centro Histórico..." value={openFormData.sector_name} onChange={handleOpenChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Provincia *</label>
                  <input type="text" name="provincia" className="form-input" required placeholder="Ej: Pichincha, Guayas..." value={openFormData.provincia} onChange={handleOpenChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Barrio / Localidad *</label>
                  <input type="text" name="barrio" className="form-input" required placeholder="Ej: La Mariscal..." value={openFormData.barrio} onChange={handleOpenChange} />
                </div>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={14} /> Hora de Inicio *
                  </label>
                  <input type="time" name="hora_inicio" className="form-input" required value={openFormData.hora_inicio} onChange={handleOpenChange} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowOpenModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary"><Save size={18} /> Aperturar Ruta</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Ruta Abierta */}
      {showEditModal && routeToEdit && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Editar Ruta Abierta</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>Sector: {routeToEdit.sector_name}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="btn btn-icon btn-secondary" style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleEditSubmit}>
                <div className="form-group">
                  <label className="form-label">Nombre del Sector *</label>
                  <input type="text" name="sector_name" className="form-input" required value={editFormData.sector_name} onChange={handleEditChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Provincia *</label>
                  <input type="text" name="provincia" className="form-input" required value={editFormData.provincia} onChange={handleEditChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Barrio / Localidad *</label>
                  <input type="text" name="barrio" className="form-input" required value={editFormData.barrio} onChange={handleEditChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora de Inicio *</label>
                  <input type="time" name="hora_inicio" className="form-input" required value={editFormData.hora_inicio} onChange={handleEditChange} />
                </div>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Motivo del Cambio *</label>
                  <textarea
                    name="change_reason"
                    className="form-textarea"
                    rows="3"
                    required
                    placeholder="Ej: Se ajustó el sector por cierre de vía" 
                    value={editFormData.change_reason}
                    onChange={handleEditChange}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary"><Save size={18} /> Guardar Cambios</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cerrar Ruta */}
      {showCloseModal && routeToClose && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Cerrar Ruta</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>Completar información de la ruta: {routeToClose.sector_name}</p>
              </div>
              <button onClick={() => setShowCloseModal(false)} className="btn btn-icon btn-secondary" style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCloseSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Total Visitas Realizadas *</label>
                  <input type="number" name="total_visitas" className="form-input" min="0" required placeholder="0" value={closeFormData.total_visitas} onChange={handleCloseChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Ventas Cerradas *</label>
                  <input type="number" name="total_ventas" className="form-input" min="0" required placeholder="0" value={closeFormData.total_ventas} onChange={handleCloseChange} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={14} /> Hora de Fin *
                  </label>
                  <input type="time" name="hora_fin" className="form-input" required value={closeFormData.hora_fin} onChange={handleCloseChange} />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">
                    Calificación del Sector: <strong style={{ color: getRatingColor(parseInt(closeFormData.sector_rating)) }}>
                      {closeFormData.sector_rating}/10 — {RATING_LABELS[parseInt(closeFormData.sector_rating)]}
                    </strong>
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button
                        key={n} type="button"
                        onClick={() => setCloseFormData({ ...closeFormData, sector_rating: String(n) })}
                        style={{
                          width: 40, height: 40, borderRadius: '0.5rem', border: '2px solid',
                          borderColor: parseInt(closeFormData.sector_rating) === n ? getRatingColor(n) : 'var(--border)',
                          background: parseInt(closeFormData.sector_rating) === n ? getRatingColor(n) : 'transparent',
                          color: parseInt(closeFormData.sector_rating) === n ? 'white' : 'var(--text)',
                          fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s ease'
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                  <label className="form-label">Observaciones del Sector</label>
                  <textarea
                    name="observaciones" className="form-textarea" rows="3"
                    placeholder="Condiciones del sector, receptividad de la gente, recomendaciones..."
                    value={closeFormData.observaciones} onChange={handleCloseChange}
                  ></textarea>
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCloseModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary"><Save size={18} /> Guardar y Cerrar Ruta</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Borrado Lógico */}
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
                La ruta del sector <strong>{routeToDelete.sector_name}</strong> ({routeToDelete.fecha}) cambiará a estado de borrado lógico (<strong>Eliminada</strong>).
              </p>
              <div style={{
                padding: '0.875rem', backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem', fontSize: '0.85rem'
              }}>
                <label className="form-label" style={{ color: 'var(--status-danger-text)', fontWeight: 600 }}>Motivo de Eliminación:</label>
                <input type="text" className="form-input" value={deletionReason} onChange={(e) => setDeletionReason(e.target.value)} placeholder="Motivo..." required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
                <button type="button" className="btn" style={{ backgroundColor: 'var(--status-danger-text)', color: 'white' }} onClick={confirmSoftDeleteRoute}>
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
