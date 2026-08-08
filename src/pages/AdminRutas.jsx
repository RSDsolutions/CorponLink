import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { MapPin, Star, Calendar, Download, Search, TrendingUp } from 'lucide-react';
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

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('routes')
        .select(`*, profiles:supervisor_id(full_name)`)
        .order('fecha', { ascending: false });
      if (error) throw error;
      setRoutes(data);

      // Extraer supervisores únicos
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
    const matchesSearch = r.sector_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.municipio && r.municipio.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (r.barrio && r.barrio.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSupervisor = supervisorFilter === '' || r.supervisor_id === supervisorFilter;
    return matchesSearch && matchesSupervisor;
  });

  const avgRating = filteredRoutes.length > 0
    ? (filteredRoutes.reduce((sum, r) => sum + r.sector_rating, 0) / filteredRoutes.length).toFixed(1)
    : 0;
  const totalVentas = filteredRoutes.reduce((sum, r) => sum + (r.total_ventas || 0), 0);
  const totalVisitas = filteredRoutes.reduce((sum, r) => sum + (r.total_visitas || 0), 0);

  const exportToExcel = () => {
    if (filteredRoutes.length === 0) return;
    const exportData = filteredRoutes.map(r => ({
      'Fecha': new Date(r.fecha + 'T00:00:00').toLocaleDateString(),
      'Supervisor': r.profiles?.full_name || 'N/A',
      'Sector': r.sector_name,
      'Municipio': r.municipio || '',
      'Barrio': r.barrio || '',
      'Total Visitas': r.total_visitas,
      'Total Ventas': r.total_ventas,
      'Calificación (1-10)': r.sector_rating,
      'Nivel': RATING_LABELS[r.sector_rating] || '',
      'Observaciones': r.observaciones || ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 20 },
      { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 50 }
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
          <p className="text-muted">Historial de rutas y calificaciones de sectores por supervisor.</p>
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
          <div className="kpi-label">Total Ventas en Ruta</div>
        </div>
      </div>

      {/* Tabla */}
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

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Supervisor</th>
                <th>Sector / Ubicación</th>
                <th>Visitas / Ventas</th>
                <th>Calificación</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.875rem' }}>
                        {new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.profiles?.full_name || 'N/A'}</div>
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
              {filteredRoutes.length === 0 && !loading && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No hay rutas registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
