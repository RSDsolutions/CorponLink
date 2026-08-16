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
  const [selectedAdvisor, setSelectedAdvisor] = useState(null);
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
        .select('*')
        .order('code', { ascending: true });

      if (advisorsError) throw advisorsError;

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('supervisor_advisors')
        .select('advisor_id, supervisor_id, profiles:supervisor_id (id, full_name)');

      if (assignmentsError) throw assignmentsError;

      const assignmentsByAdvisor = (assignmentsData || []).reduce((acc, item) => {
        acc[item.advisor_id] = item;
        return acc;
      }, {});

      const normalizedAdvisors = (advisorsData || []).map(advisor => ({
        ...advisor,
        supervisor_assignment: assignmentsByAdvisor[advisor.id] || null
      }));

      setAdvisors(normalizedAdvisors);

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

  const getNextAdvisorCode = (city, excludedAdvisorId = null, sourceAdvisors = advisors, sourceSupervisors = supervisors) => {
    const prefix = getCityPrefix(city);
    if (!prefix) return '';

    const supervisorExistsForCity = sourceSupervisors.some(supervisor => {
      const sameCity = supervisor?.city && normalizeCity(supervisor.city) === normalizeCity(city);
      const samePrefix = String(supervisor.code || '').toUpperCase().startsWith(`SUP-${prefix}-`);
      return sameCity && samePrefix;
    });

    const codePattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`, 'i');
    const highestNumber = sourceAdvisors.reduce((highest, advisor) => {
      if (excludedAdvisorId && advisor.id === excludedAdvisorId) return highest;

      const match = String(advisor.code || '').trim().match(codePattern);
      if (!match) return highest;

      const codeNumber = Number(match[1]);
      return Number.isNaN(codeNumber) ? highest : Math.max(highest, codeNumber);
    }, supervisorExistsForCity ? 1 : 0);

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
    const supervisor = advisor.supervisor_assignment;
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

      await fetchAdvisors();
      setShowModal(false);
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
    const assignment = advisor.supervisor_assignment;
    return assignment?.profiles?.full_name || 'Sin asignar';
  };

  const advisorGroups = [
    ...supervisors.map(supervisor => ({
      id: supervisor.id,
      name: supervisor.full_name,
      advisors: advisors.filter(advisor => advisor.supervisor_assignment?.supervisor_id === supervisor.id)
    })),
    {
      id: 'unassigned',
      name: 'Sin supervisor',
      advisors: advisors.filter(advisor => !advisor.supervisor_assignment)
    }
  ].filter(group => group.advisors.length > 0 || group.id === 'unassigned');

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
          <p className="text-muted">Panel centralizado por supervisor para ver, editar y asignar asesores.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenNew}>
          <Plus size={18} /> Nuevo Asesor
        </button>
      </div>

      <div className="card" style={{ padding: '1rem', overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: 0, marginBottom: '1rem', borderBottom: 'none' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Asesores por supervisor</h3>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Cargando asesores...
          </div>
        ) : advisorGroups.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No hay asesores registrados. Crea uno nuevo para comenzar.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {advisorGroups.map(group => (
              <div key={group.id} style={{
                border: '1px solid var(--border)',
                borderRadius: '12px',
                background: 'var(--surface)',
                overflow: 'hidden'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  background: 'var(--surface-hover)',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{group.name}</h4>
                  <span style={{
                    minWidth: '2rem',
                    textAlign: 'center',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '999px',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}>
                    {group.advisors.length}
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '0.75rem',
                  padding: '0.75rem'
                }}>
                  {group.advisors.map(advisor => (
                    <div
                      key={advisor.id}
                      onClick={() => setSelectedAdvisor(advisor)}
                      style={{
                        cursor: 'pointer',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        background: 'var(--surface)',
                        padding: '0.75rem',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{
                          padding: '0.2rem 0.45rem',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          fontWeight: 700
                        }}>
                          {advisor.code}
                        </span>
                        <span style={{
                          padding: '0.2rem 0.45rem',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          background: advisor.contract_signed ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: advisor.contract_signed ? '#22c55e' : '#ef4444',
                          fontWeight: 600
                        }}>
                          {advisor.contract_signed ? 'Firmado' : 'Pend.'}
                        </span>
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.35rem' }}>
                        {advisor.first_name} {advisor.second_name} {advisor.first_surname} {advisor.second_surname}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                        {advisor.document_id || 'Sin cédula'}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                        {advisor.city || 'Sin ciudad'}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {advisor.email || 'Sin email'}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.7rem' }}>
                        <button
                          type="button"
                          className="btn btn-icon btn-secondary"
                          style={{ border: 'none', padding: '0.45rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(advisor);
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-icon"
                          style={{ border: 'none', padding: '0.45rem', color: '#ef4444' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(advisor.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedAdvisor && (
        <div className="modal-overlay" onClick={() => setSelectedAdvisor(null)}>
          <div className="modal-content" style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>{selectedAdvisor.first_name} {selectedAdvisor.first_surname}</h3>
              </div>
              <button onClick={() => setSelectedAdvisor(null)} className="btn btn-icon btn-secondary" style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="info-box"><strong>Código</strong><span>{selectedAdvisor.code || '—'}</span></div>
                <div className="info-box"><strong>Supervisor</strong><span>{getSupervisorName(selectedAdvisor)}</span></div>
                <div className="info-box"><strong>Cédula</strong><span>{selectedAdvisor.document_id || '—'}</span></div>
                <div className="info-box"><strong>Ciudad</strong><span>{selectedAdvisor.city || '—'}</span></div>
                <div className="info-box"><strong>Email</strong><span>{selectedAdvisor.email || '—'}</span></div>
                <div className="info-box"><strong>Teléfono</strong><span>{selectedAdvisor.phone || '—'}</span></div>
                <div className="info-box" style={{ gridColumn: '1 / -1' }}><strong>Dirección</strong><span>{selectedAdvisor.address || '—'}</span></div>
                <div className="info-box" style={{ gridColumn: '1 / -1' }}><strong>Contrato</strong><span>{selectedAdvisor.contract_signed ? 'Firmado' : 'Pendiente'}</span></div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedAdvisor(null)}>
                Cerrar
              </button>
              <button type="button" className="btn btn-primary" onClick={() => {
                setSelectedAdvisor(null);
                handleEdit(selectedAdvisor);
              }}>
                <Edit2 size={16} /> Editar
              </button>
            </div>
          </div>
        </div>
      )}

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
