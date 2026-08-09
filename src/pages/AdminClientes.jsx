import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Download, Search, Globe, Users, CheckCircle, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AdminClientes() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          profiles:asesor_id(full_name),
          route:route_id(id, sector_name, fecha, sector_rating, municipio, barrio)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  // Sectores únicos para filtrar
  const uniqueSectors = [...new Set(clients.map(c => c.route?.sector_name).filter(Boolean))];

  const filteredClients = clients.filter(c => {
    const matchesSearch =
      c.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.document_id.includes(searchTerm);
    const matchesStatus = statusFilter === '' || c.status === statusFilter;
    const matchesSector = sectorFilter === '' || c.route?.sector_name === sectorFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const clientDate = new Date(c.created_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateFilter === 'today') {
        const clientDay = new Date(clientDate);
        clientDay.setHours(0, 0, 0, 0);
        matchesDate = clientDay.getTime() === today.getTime();
      } else if (dateFilter === 'week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        matchesDate = clientDate >= startOfWeek;
      } else if (dateFilter === 'month') {
        matchesDate = clientDate.getMonth() === today.getMonth() && clientDate.getFullYear() === today.getFullYear();
      } else if (dateFilter === 'year') {
        matchesDate = clientDate.getFullYear() === today.getFullYear();
      }
    }
    
    return matchesSearch && matchesStatus && matchesSector && matchesDate;
  });

  const total = filteredClients.length;
  const activos = filteredClients.filter(c => c.status === 'Activo').length;
  const pendientes = filteredClients.filter(c => ['Registrado', 'Contactado', 'Programado'].includes(c.status)).length;

  const exportToExcel = () => {
    if (filteredClients.length === 0) return;
    const exportData = filteredClients.map(c => ({
      'Fecha de Registro': new Date(c.created_at).toLocaleDateString(),
      'Supervisor': c.profiles?.full_name || 'Desconocido',
      'Nombres': c.first_name,
      'Apellidos': c.last_name,
      'Documento de Identidad': c.document_id,
      'Teléfono': c.phone,
      'Dirección': c.address,
      'Plan Contratado': c.plan_name,
      'Estado Actual': c.status,
      'Sector de Ruta': c.route?.sector_name || '',
      'Municipio': c.route?.municipio || '',
      'Barrio': c.route?.barrio || '',
      'Fecha de Ruta': c.route ? new Date(c.route.fecha + 'T00:00:00').toLocaleDateString() : '',
      'Calificación Sector (1-10)': c.route?.sector_rating || '',
      'Notas': c.notes || ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 18 },
      { wch: 15 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 25 },
      { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 50 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes CorponNet');
    XLSX.writeFile(workbook, `Reporte_Clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Clientes</h2>
          <p className="text-muted">Vista global de todos los clientes con su ruta asociada.</p>
        </div>
        <button className="btn btn-primary" onClick={exportToExcel} style={{ backgroundColor: 'var(--status-success-text)' }}>
          <Download size={18} /> Descargar Excel (.xlsx)
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue"><Globe size={24} /></div>
          <div className="kpi-value">{total}</div>
          <div className="kpi-label">Total Clientes</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green"><CheckCircle size={24} /></div>
          <div className="kpi-value">{activos}</div>
          <div className="kpi-label">Instalaciones Activas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon yellow"><Users size={24} /></div>
          <div className="kpi-value">{pendientes}</div>
          <div className="kpi-label">En Proceso / Por Instalar</div>
        </div>
      </div>

      {/* Tabla con filtros */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 2, minWidth: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text" className="form-input" placeholder="Buscar por nombre o documento..."
              style={{ paddingLeft: '2.5rem' }} value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="Registrado">Registrado</option>
              <option value="Contactado">Contactado</option>
              <option value="Programado">Instalación Programada</option>
              <option value="Activo">Activo (Instalado)</option>
              <option value="Cancelado">Cancelado</option>
              <option value="Rechazado">Rechazado</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <select className="form-select" value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)}>
              <option value="">Todos los sectores</option>
              {uniqueSectors.map(s => (
                <option key={s} value={s}>{s}</option>
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

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha / Supervisor</th>
                <th>Datos del Cliente</th>
                <th>Plan y Estado</th>
                <th>Ruta Asociada</th>
                <th>Contacto</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--primary)', marginTop: '0.25rem' }}>
                      {c.profiles?.full_name || 'N/A'}
                    </div>
                  </td>
                  <td>
                    <div className="client-name">{c.first_name} {c.last_name}</div>
                    <div className="client-doc">DNI: {c.document_id}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{c.plan_name}</div>
                    <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                  </td>
                  <td>
                    {c.route ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                          <MapPin size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          {c.route.sector_name}
                        </div>
                        <div className="client-doc">
                          {[c.route.municipio, c.route.barrio].filter(Boolean).join(', ')}
                        </div>
                        <div className="client-doc">
                          {new Date(c.route.fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                          {' · Calif: '}
                          <strong style={{ color: c.route.sector_rating >= 7 ? 'var(--status-success-text)' : c.route.sector_rating >= 5 ? '#3b82f6' : '#f59e0b' }}>
                            {c.route.sector_rating}/10
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Sin ruta</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.875rem' }}>{c.phone}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.address}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && !loading && (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No se encontraron resultados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
