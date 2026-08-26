import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { 
  Clock, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Layers,
  Check,
  X,
  RefreshCw,
  Edit,
  Sun,
  Moon,
  Sunset
} from 'lucide-react';

export default function Shifts() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    start_time: '09:00',
    end_time: '18:00',
    grace_period_minutes: 15,
    late_threshold_minutes: 30,
    description: '',
    is_default: false
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    code: '',
    start_time: '09:00',
    end_time: '18:00',
    grace_period_minutes: 15,
    late_threshold_minutes: 30,
    description: '',
    is_default: false
  });

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/shifts');
      setShifts(res.data);
    } catch (err) {
      console.error('Failed to fetch shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleCreateShift = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await apiClient.post('/shifts', formData);
      setSuccess('Shift created successfully!');
      setTimeout(() => {
        setShowAddModal(false);
        setSuccess('');
        setFormData({
          name: '',
          code: '',
          start_time: '09:00',
          end_time: '18:00',
          grace_period_minutes: 15,
          late_threshold_minutes: 30,
          description: '',
          is_default: false
        });
        fetchShifts();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create shift');
    }
  };

  const handleOpenEdit = (shift) => {
    setEditingShift(shift);
    setEditFormData({
      name: shift.name,
      code: shift.code,
      start_time: shift.start_time,
      end_time: shift.end_time,
      grace_period_minutes: shift.grace_period_minutes,
      late_threshold_minutes: shift.late_threshold_minutes,
      description: shift.description || '',
      is_default: shift.is_default
    });
    setError('');
    setSuccess('');
  };

  const handleUpdateShift = async (e) => {
    e.preventDefault();
    if (!editingShift) return;
    setError('');
    setSuccess('');

    try {
      await apiClient.patch(`/shifts/${editingShift.id}`, editFormData);
      setSuccess('Shift updated successfully!');
      setTimeout(() => {
        setEditingShift(null);
        setSuccess('');
        fetchShifts();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update shift');
    }
  };

  const handleDeleteShift = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete shift "${name}"?`)) return;
    try {
      await apiClient.delete(`/shifts/${id}`);
      fetchShifts();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete shift');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 animate-fadeIn font-sans">
      
      {/* Header Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 sm:p-7 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
              Phase 2 Enterprise
            </span>
            <span className="text-slate-400 text-xs">• Dynamic Attendance Rules</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white mt-1 tracking-tight">
            Shift Scheduling & Grace Rules
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Configure work shift timings, grace periods and automated late-arrival calculations
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={fetchShifts}
            className="p-2.5 sm:p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-800 transition cursor-pointer shrink-0"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm flex items-center justify-center gap-2 rounded-2xl shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add New Shift
          </button>
        </div>
      </div>

      {/* Shifts Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-slide-up">
        {shifts.map((shift) => (
          <div 
            key={shift.id} 
            className={`glass-panel card-hover rounded-3xl p-6 border relative flex flex-col justify-between ${
              shift.is_default ? 'border-amber-500/40 bg-amber-500/[0.03]' : 'border-slate-800'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-slate-900 border border-slate-800 text-amber-400">
                  {shift.code}
                </span>
                {shift.is_default && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
                    Default Shift
                  </span>
                )}
              </div>

              <h3 className="text-lg font-black text-white">{shift.name}</h3>
              <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{shift.description || 'Standard working hours for employees.'}</p>

              <div className="mt-5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Working Hours:</span>
                  <span className="font-mono font-bold text-white">{shift.start_time} — {shift.end_time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Grace Period:</span>
                  <span className="font-semibold text-emerald-400">+{shift.grace_period_minutes} mins</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Late Marked After:</span>
                  <span className="font-semibold text-rose-400">+{shift.late_threshold_minutes} mins</span>
                </div>
              </div>
            </div>

            <div className="pt-5 mt-4 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Dynamic AI rules active</span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(shift)}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 rounded-xl transition border border-slate-800 cursor-pointer"
                  title="Edit Shift Timings & Grace"
                >
                  <Edit className="w-4 h-4" />
                </button>

                {!shift.is_default && (
                  <button
                    onClick={() => handleDeleteShift(shift.id, shift.name)}
                    className="p-2 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-xl transition cursor-pointer"
                    title="Delete Shift"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Shift Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-md rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-5 shadow-2xl animate-spring-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" /> Create Work Shift
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleCreateShift} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Shift Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Night Shift"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Shift Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NGT"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Start Time (HH:MM) *</label>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">End Time (HH:MM) *</label>
                  <input
                    type="time"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Grace Period (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={formData.grace_period_minutes}
                    onChange={(e) => setFormData({ ...formData, grace_period_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Late Threshold (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={formData.late_threshold_minutes}
                    onChange={(e) => setFormData({ ...formData, late_threshold_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. For customer support and operations team"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 shadow-inner"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="rounded border-slate-700 text-amber-400 focus:ring-0 w-4 h-4 bg-slate-950 cursor-pointer"
                />
                <label htmlFor="is_default" className="text-slate-300 text-xs font-medium cursor-pointer">
                  Set as Default Shift for new employees
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-6 py-2 rounded-xl font-bold cursor-pointer"
                >
                  Create Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Shift Modal */}
      {editingShift && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-md rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-5 shadow-2xl animate-spring-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-400" /> Edit Shift: {editingShift.name}
              </h2>
              <button onClick={() => setEditingShift(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleUpdateShift} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Shift Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Shift Code *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.code}
                    onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Start Time (HH:MM) *</label>
                  <input
                    type="time"
                    required
                    value={editFormData.start_time}
                    onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">End Time (HH:MM) *</label>
                  <input
                    type="time"
                    required
                    value={editFormData.end_time}
                    onChange={(e) => setEditFormData({ ...editFormData, end_time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Grace Period (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={editFormData.grace_period_minutes}
                    onChange={(e) => setEditFormData({ ...editFormData, grace_period_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Late Threshold (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={editFormData.late_threshold_minutes}
                    onChange={(e) => setEditFormData({ ...editFormData, late_threshold_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <input
                  type="text"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 shadow-inner"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit_is_default"
                  checked={editFormData.is_default}
                  onChange={(e) => setEditFormData({ ...editFormData, is_default: e.target.checked })}
                  className="rounded border-slate-700 text-amber-400 focus:ring-0 w-4 h-4 bg-slate-950 cursor-pointer"
                />
                <label htmlFor="edit_is_default" className="text-slate-300 text-xs font-medium cursor-pointer">
                  Set as Default Shift
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingShift(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-6 py-2 rounded-xl font-bold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
