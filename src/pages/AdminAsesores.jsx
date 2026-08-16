import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Plus, X, Save, Trash2, Edit2 } from 'lucide-react';

const CITY_OPTIONS = [
  { name: 'Quito', prefix: 'UIO' },
  { name: 'Guayaquil', prefix: 'GYE' },
  { name: 'Cuenca', prefix: 'CUE' },
  { name: 'Manta', prefix: 'MTA' },
  { name: 'Machala', prefix: 'MCH' },
  { name: 'Loja', prefix: 'LOJ' },
  { name: 'Ambato', prefix: 'AMB' },
  { name: 'Santo Domingo', prefix: 'SDO' },
  { name: 'Duran', prefix: 'DUR' },
  { name: 'Milagro', prefix: 'MIL' },
  { name: 'Portoviejo', prefix: 'PVO' },
  { name: 'Esmeraldas', prefix: 'ESM' },
  { name: 'Ibarra', prefix: 'IBA' },
  { name: 'Riobamba', prefix: 'RIO' }
];

const normalizeCity = (city) => (city || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toUpperCase();

const CITY_PREFIX_BY_NAME = Object.fromEntries(
  CITY_OPTIONS.map(({ name, prefix }) => [normalizeCity(name), prefix])
);

const getCityPrefix = (city) => {
  const normalized = normalizeCity(city);
  if (!normalized) return '';

  const mappedPrefix = CITY_PREFIX_BY_NAME[normalized];
  if (mappedPrefix) return mappedPrefix;

  return normalized.replace(/[^A-Z0-9]/g, '').slice(0, 3).padEnd(3, 'X');
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default function AdminAsesores() {
  const [advisors, setAdvisors] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBase, setEditingBase] = useState({ city: '', code: '' });
  const [formData, setFormData] = useState({
    id: null,
    code: '',
    first_name: '',
    second_name: '',
    first_surname: '',
    second_surname: '',
    document_id: '',
    city: '',
    address: '',
    email: '',
    phone: '',
    supervisor_id: '',
    contract_signed: false
  });

  // Fetch advisors with their assigned supervisors
  const fetchAdvisors = async () => {
    setLoading(true);
    try {
      const { data: advisorsData, error: advisorsError } = await supabase
        .from('advisors')
        .select(`
          *,
          supervisor_advisors (
            supervisor_id,
            profiles:profiles (id, full_name)
          )
        `)
        .order('code', { ascending: true });

      if (advisorsError) throw advisorsError;
      setAdvisors(advisorsData || []);

      // Fetch supervisors for assignment dropdown
      const { data: supsData, error: supsError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'supervisor')
        .order('full_name', { ascending: true });

      if (supsError) throw supsError;
      setSupervisors(supsData || []);
    } catch (error) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvisors();
  }, []);

  const getNextAdvisorCode = (city, excludedAdvisorId = null, sourceAdvisors = advisors) => {
    const prefix = getCityPrefix(city);
    if (!prefix) return '';

    const codePattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`, 'i');
    const highestNumber = sourceAdvisors.reduce((highest, advisor) => {
      if (excludedAdvisorId && advisor.id === excludedAdvisorId) return highest;

      const match = String(advisor.code || '').trim().match(codePattern);
      if (!match) return highest;

      const codeNumber = Number(match[1]);
      return Number.isNaN(codeNumber) ? highest : Math.max(highest, codeNumber);
    }, 0);

    return `${prefix}-${String(highestNumber + 1).padStart(3, '0')}`;
  };

  const getGeneratedAdvisorCode = (city, excludedAdvisorId = null, sourceAdvisors = advisors) => {
    const cleanCity = (city || '').trim();
    if (!cleanCity) return '';

    const isSameEditingCity =
      isEditing &&
      excludedAdvisorId &&
      normalizeCity(cleanCity) === normalizeCity(editingBase.city);

    if (isSameEditingCity && editingBase.code) {
      return editingBase.code;
    }

    return getNextAdvisorCode(cleanCity, excludedAdvisorId, sourceAdvisors);
  };

  const fetchLatestAdvisorCodes = async () => {
    const { data, error } = await supabase
      .from('advisors')
      .select('id, code');

    if (error) throw error;
    return data || [];
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      code: name === 'city' ? getGeneratedAdvisorCode(value, prev.id) : prev.code
    }));
  };

  const handleEdit = (advisor) => {
    const supervisor = advisor.supervisor_advisors?.[0];
    setEditingBase({
      city: advisor.city || '',
      code: advisor.code || ''
    });
    setFormData({
      id: advisor.id,
      code: advisor.code || '',
      first_name: advisor.first_name || '',
      second_name: advisor.second_name || '',
      first_surname: advisor.first_surname || '',
      second_surname: advisor.second_surname || '',
      document_id: advisor.document_id || '',
      city: advisor.city || '',
      address: advisor.address || '',
      email: advisor.email || '',
      phone: advisor.phone || '',
      supervisor_id: supervisor?.supervisor_id || '',
      contract_signed: advisor.contract_signed || false
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleOpenNew = () => {
    setEditingBase({ city: '', code: '' });
    setFormData({
      id: null,
      code: '',
      first_name: '',
      second_name: '',
      first_surname: '',
      second_surname: '',
      document_id: '',
      city: '',
      address: '',
      email: '',
      phone: '',
      supervisor_id: '',
      contract_signed: false
    });
    setIsEditing(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const advisorCity = formData.city.trim();
      const latestAdvisorCodes = await fetchLatestAdvisorCodes();
      const advisorCode = getGeneratedAdvisorCode(advisorCity, formData.id, latestAdvisorCodes);

      if (!advisorCity || !advisorCode || !formData.first_name || !formData.first_surname) {
        alert('Los campos Ciudad, Primer Nombre y Primer Apellido son obligatorios.');
        return;
      }

      if (isEditing) {
        // Update advisor
        const { error } = await supabase
          .from('advisors')
          .update({
            code: advisorCode,
            first_name: formData.first_name,
            second_name: formData.second_name,
            first_surname: formData.first_surname,
            second_surname: formData.second_surname,
            document_id: formData.document_id,
            city: advisorCity,
            address: formData.address,
            email: formData.email,
            phone: formData.phone,
            contract_signed: formData.contract_signed
          })
          .eq('id', formData.id);

        if (error) throw error;

        // Update supervisor assignment
        if (formData.supervisor_id) {
          // Delete existing assignment
          await supabase
            .from('supervisor_advisors')
            .delete()
            .eq('advisor_id', formData.id);

          // Create new assignment
          const { error: assignError } = await supabase
            .from('supervisor_advisors')
            .insert({
              supervisor_id: formData.supervisor_id,
              advisor_id: formData.id
            });

          if (assignError) throw assignError;
        } else {
          // Remove assignment if no supervisor selected
          await supabase
            .from('supervisor_advisors')
            .delete()
            .eq('advisor_id', formData.id);
        }

        alert('Asesor actualizado correctamente.');
      } else {
        // Create new advisor
        const { data: newAdvisor, error: insertError } = await supabase
          .from('advisors')
          .insert({
            code: advisorCode,
            first_name: formData.first_name,
            second_name: formData.second_name,
            first_surname: formData.first_surname,
            second_surname: formData.second_surname,
            document_id: formData.document_id,
            city: advisorCity,
            address: formData.address,
            email: formData.email,
            phone: formData.phone,
            contract_signed: formData.contract_signed
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Assign to supervisor if selected
        if (formData.supervisor_id && newAdvisor?.id) {
          const { error: assignError } = await supabase
            .from('supervisor_advisors')
            .insert({
              supervisor_id: formData.supervisor_id,
              advisor_id: newAdvisor.id
            });

          if (assignError) throw assignError;
        }

        alert('Asesor creado correctamente.');
      }

      setShowModal(false);
      fetchAdvisors();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este asesor? Se eliminarán todas sus asignaciones.')) return;

    try {
      // Delete supervisor assignments first
      await supabase
        .from('supervisor_advisors')
        .delete()
        .eq('advisor_id', id);

      // Delete advisor
      const { error } = await supabase
        .from('advisors')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Asesor eliminado correctamente.');
      fetchAdvisors();
    } catch (error) {
      alert('Error eliminando asesor: ' + error.message);
    }
  };

  const getSupervisorName = (advisor) => {
    const assignment = advisor.supervisor_advisors?.[0];
    return assignment?.profiles?.full_name || 'Sin asignar';
  };

  const cityOptions = [
    ...CITY_OPTIONS.map(({ name }) => name),
    ...advisors.map(advisor => advisor.city).filter(Boolean)
  ].filter((city, index, options) =>
    options.findIndex(option => normalizeCity(option) === normalizeCity(city)) === index
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Gestión de Asesores</h2>
          <p className="text-muted">Panel centralizado para crear, editar y asignar asesores a supervisores.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenNew}>
          <Plus size={18} /> Nuevo Asesor
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Directorio de Asesores</h3>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Cargando asesores...
          </div>
        ) : advisors.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No hay asesores registrados. Crea uno nuevo para comenzar.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre Completo</th>
                  <th>Cédula</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Ciudad</th>
                  <th>Contrato</th>
                  <th>Supervisor Asignado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {advisors.map(advisor => (
                  <tr key={advisor.id}>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary)',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '0.85rem'
                      }}>
                        {advisor.code}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {advisor.first_name} {advisor.second_name} {advisor.first_surname} {advisor.second_surname}
                    </td>
                    <td>{advisor.document_id || '—'}</td>
                    <td style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{advisor.email || '—'}</td>
                    <td>{advisor.phone || '—'}</td>
                    <td>{advisor.city || '—'}</td>
                    <td>
                      <span style={{
                        padding: '0.35rem 0.75rem',
                        backgroundColor: advisor.contract_signed ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: advisor.contract_signed ? '#22c55e' : '#ef4444',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: 500
                      }}>
                        {advisor.contract_signed ? '✓ Sí' : '✗ No'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '0.35rem 0.75rem',
                        backgroundColor: getSupervisorName(advisor) === 'Sin asignar' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                        color: getSupervisorName(advisor) === 'Sin asignar' ? '#ef4444' : '#22c55e',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: 500
                      }}>
                        {getSupervisorName(advisor)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEdit(advisor)}
                          className="btn btn-icon btn-secondary"
                          title="Editar"
                          style={{ border: 'none', padding: '0.5rem' }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(advisor.id)}
                          className="btn btn-icon"
                          title="Eliminar"
                          style={{ border: 'none', padding: '0.5rem', color: '#ef4444' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>{isEditing ? 'Editar Asesor' : 'Nuevo Asesor'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="btn btn-icon btn-secondary" style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Ciudad *</label>
                    <input
                      type="text"
                      name="city"
                      className="form-input"
                      required
                      list="advisor-city-options"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Ej: Quito"
                    />
                    <datalist id="advisor-city-options">
                      {cityOptions.map(city => (
                        <option key={city} value={city} />
                      ))}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Código *</label>
                    <input
                      type="text"
                      name="code"
                      className="form-input"
                      required
                      readOnly
                      value={formData.code}
                      placeholder="Auto"
                      style={{ backgroundColor: 'var(--surface-hover)', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Cédula</label>
                  <input
                    type="text"
                    name="document_id"
                    className="form-input"
                    value={formData.document_id}
                    onChange={handleChange}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Primer Nombre *</label>
                    <input
                      type="text"
                      name="first_name"
                      className="form-input"
                      required
                      value={formData.first_name}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Segundo Nombre</label>
                    <input
                      type="text"
                      name="second_name"
                      className="form-input"
                      value={formData.second_name}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Primer Apellido *</label>
                    <input
                      type="text"
                      name="first_surname"
                      className="form-input"
                      required
                      value={formData.first_surname}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Segundo Apellido</label>
                    <input
                      type="text"
                      name="second_surname"
                      className="form-input"
                      value={formData.second_surname}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      name="email"
                      className="form-input"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input
                      type="text"
                      name="phone"
                      className="form-input"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Domicilio</label>
                  <textarea
                    name="address"
                    className="form-textarea"
                    rows="3"
                    value={formData.address}
                    onChange={handleChange}
                  ></textarea>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Supervisor Asignado</label>
                  <select
                    name="supervisor_id"
                    className="form-input"
                    value={formData.supervisor_id}
                    onChange={handleChange}
                  >
                    <option value="">— Sin asignar —</option>
                    {supervisors.map(sup => (
                      <option key={sup.id} value={sup.id}>
                        {sup.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Contrato Firmado</label>
                  <select
                    name="contract_signed"
                    className="form-input"
                    value={formData.contract_signed ? 'si' : 'no'}
                    onChange={(e) => setFormData(prev => ({ ...prev, contract_signed: e.target.value === 'si' }))}
                  >
                    <option value="no">No</option>
                    <option value="si">Sí</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <Save size={18} /> {isEditing ? 'Actualizar' : 'Crear'} Asesor
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
