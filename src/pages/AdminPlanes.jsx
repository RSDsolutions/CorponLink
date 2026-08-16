import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Plus, Save, Trash2, Wifi } from 'lucide-react';

const emptyForm = {
  family: '',
  plan: '',
  speed: '',
  price: ''
};

export default function AdminPlanes() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('family', { ascending: true })
        .order('plan', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.family.trim() || !form.plan.trim() || !form.speed.trim() || !form.price) {
      alert('Completa todos los campos del plan.');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.from('plans').upsert([
        {
          family: form.family.trim(),
          plan: form.plan.trim(),
          speed: form.speed.trim(),
          price: Number(form.price)
        }
      ], { onConflict: 'family,plan' });

      if (error) throw error;
      setForm(emptyForm);
      await fetchPlans();
    } catch (error) {
      alert('Error guardando el plan: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Deseas eliminar este plan?')) return;

    try {
      const { error } = await supabase.from('plans').delete().eq('id', id);
      if (error) throw error;
      await fetchPlans();
    } catch (error) {
      alert('Error eliminando el plan: ' + error.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Catálogo de Planes</h2>
          <p className="text-muted">Gestiona familias, planes, velocidades y precios para que los supervisores los seleccionen automáticamente.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Familia</label>
            <input type="text" name="family" className="form-input" value={form.family} onChange={handleChange} placeholder="Fibra Óptica" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Plan</label>
            <input type="text" name="plan" className="form-input" value={form.plan} onChange={handleChange} placeholder="Plan 100" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Velocidad</label>
            <input type="text" name="speed" className="form-input" value={form.speed} onChange={handleChange} placeholder="100 Mbps" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Precio</label>
            <input type="number" step="0.01" min="0" name="price" className="form-input" value={form.price} onChange={handleChange} placeholder="45000" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Plus size={18} /> {saving ? 'Guardando...' : 'Agregar'}
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Planes Registrados</h3>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Familia</th>
                <th>Plan</th>
                <th>Velocidad</th>
                <th>Precio</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando planes...</td></tr>
              ) : plans.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay planes registrados.</td></tr>
              ) : (
                plans.map(plan => (
                  <tr key={plan.id}>
                    <td style={{ fontWeight: 600 }}>{plan.family}</td>
                    <td>{plan.plan}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Wifi size={14} /> {plan.speed}
                      </span>
                    </td>
                    <td>${Number(plan.price).toLocaleString('es-CO')}</td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => handleDelete(plan.id)}>
                        <Trash2 size={16} /> Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
