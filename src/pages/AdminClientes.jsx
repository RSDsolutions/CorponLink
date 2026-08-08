import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Download, Search, Globe, Users, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AdminClientes() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`*, profiles:asesor_id(full_name, supervisor_id, role)`)
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

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.document_id.includes(searchTerm);
    const matchesStatus = statusFilter === '' || c.status === statusFilter;
    const matchesRoute = routeFilter === '' || (c.route_name && c.route_name.toLowerCase().includes(routeFilter.toLowerCase()));
    return matchesSearch && matchesStatus && matchesRoute;
  });

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
      'Ruta de Venta': c.route_name || '',
      'Calificación de Ruta': c.route_rating || '',
      'Notas': c.notes || ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 18 },
      { wch: 15 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 50 }
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
          <p className="text-muted">Vista global de todos los clientes registrados.</p>
        </div>
        <button className="btn btn-primary" onClick={exportToExcel} style={{ backgroundColor: 'var(--status-success-text)' }}>
          <Download size={18} /> Descargar Excel (.xlsx)
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text" className="form-input" placeholder="Buscar por cliente o documento..."
              style={{ paddingLeft: '2.5rem' }} value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
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
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text" className="form-input" placeholder="Filtrar por Ruta..."
              value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha / Supervisor</th>
                <th>Datos del Cliente</th>
                <th>Plan y Estado</th>
                <th>Contacto</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</div>
                    <div style={{ fontWeight: 600, color: 'var(--primary)', marginTop: '0.25rem' }}>{c.profiles?.full_name || 'N/A'}</div>
                  </td>
                  <td>
                    <div className="client-name">{c.first_name} {c.last_name}</div>
                    <div className="client-doc">DNI: {c.document_id}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{c.plan_name}</div>
                    <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                    {c.route_name && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Ruta: {c.route_name} ({c.route_rating}⭐)
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.875rem' }}>{c.phone}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.address}</div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && !loading && (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No se encontraron resultados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
