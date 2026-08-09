import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { MapPin, Plus, X, Save, Star, Calendar, TrendingUp, Clock } from 'lucide-react';

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
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    sector_name: '',
    municipio: '',
    barrio: '',
    hora_inicio: '',
    hora_fin: '',
    total_visitas: '',
    total_ventas: '',
    sector_rating: '7',
    observaciones: ''
  });

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('supervisor_id', user.id)
        .order('fecha', { ascending: false });
      if (error) throw error;
      setRoutes(data);
    } catch (error) {
      console.error('Error fetching routes:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoutes(); }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        ...formData,
        supervisor_id: user.id,
        sector_rating: parseInt(formData.sector_rating),
        total_visitas: parseInt(formData.total_visitas) || 0,
        total_ventas: parseInt(formData.total_ventas) || 0,
      };
      const { error } = await supabase.from('routes').insert([payload]);
      if (error) throw error;
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        sector_name: '', municipio: '', barrio: '',
        hora_inicio: '', hora_fin: '',
        total_visitas: '', total_ventas: '', sector_rating: '7', observaciones: ''
      });
      setShowModal(false);
      fetchRoutes();
    } catch (error) {
      alert('Error guardando ruta: ' + error.message);
    }
  };

  const totalRoutes = routes.length;
  const avgRating = routes.length > 0
    ? (routes.reduce((sum, r) => sum + r.sector_rating, 0) / routes.length).toFixed(1)
    : 0;
  const totalVentas = routes.reduce((sum, r) => sum + (r.total_ventas || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Rutas</h2>
          <p className="text-muted">Registro diario de sectores visitados y su calificación.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Registrar Ruta
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue"><MapPin size={24} /></div>
          <div className="kpi-value">{totalRoutes}</div>
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
          <div className="kpi-label">Ventas en Rutas</div>
        </div>
      </div>

      {/* Tabla de rutas */}
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
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {routes.map(r => (
                <tr key={r.id}>
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
                      {[r.municipio, r.barrio].filter(Boolean).join(' · ')}
                    </div>
                  </td>
                  <td>
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
                  </td>
                  <td>
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
                  </td>
                  <td style={{ maxWidth: '220px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.observaciones || <span style={{ fontStyle: 'italic' }}>Sin observaciones</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {routes.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No hay rutas registradas. ¡Registra tu primera ruta del día!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Ruta */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Registrar Ruta del Día</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-icon btn-secondary" style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                <div className="form-group">
                  <label className="form-label">Fecha de la Ruta</label>
                  <input type="date" name="fecha" className="form-input" required value={formData.fecha} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre del Sector</label>
                  <input type="text" name="sector_name" className="form-input" required placeholder="Ej: Centro Histórico, Zona Industrial..." value={formData.sector_name} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label className="form-label">Municipio</label>
                  <input type="text" name="municipio" className="form-input" placeholder="Ej: Bogotá, Medellín..." value={formData.municipio} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Barrio / Localidad</label>
                  <input type="text" name="barrio" className="form-input" placeholder="Ej: Chapinero, El Poblado..." value={formData.barrio} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label className="form-label">Total Visitas Realizadas</label>
                  <input type="number" name="total_visitas" className="form-input" min="0" placeholder="0" value={formData.total_visitas} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Ventas Cerradas</label>
                  <input type="number" name="total_ventas" className="form-input" min="0" placeholder="0" value={formData.total_ventas} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={14} /> Hora de Inicio
                  </label>
                  <input type="time" name="hora_inicio" className="form-input" value={formData.hora_inicio} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={14} /> Hora de Fin
                  </label>
                  <input type="time" name="hora_fin" className="form-input" value={formData.hora_fin} onChange={handleChange} />
                </div>

                {/* Rating visual */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">
                    Calificación del Sector: <strong style={{ color: getRatingColor(parseInt(formData.sector_rating)) }}>
                      {formData.sector_rating}/10 — {RATING_LABELS[parseInt(formData.sector_rating)]}
                    </strong>
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setFormData({ ...formData, sector_rating: String(n) })}
                        style={{
                          width: 40, height: 40, borderRadius: '0.5rem', border: '2px solid',
                          borderColor: parseInt(formData.sector_rating) === n ? getRatingColor(n) : 'var(--border)',
                          background: parseInt(formData.sector_rating) === n ? getRatingColor(n) : 'transparent',
                          color: parseInt(formData.sector_rating) === n ? 'white' : 'var(--text)',
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
                    placeholder="Condiciones del sector, receptividad de la gente, recomendaciones para próximas visitas..."
                    value={formData.observaciones} onChange={handleChange}
                  ></textarea>
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary"><Save size={18} /> Guardar Ruta</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
