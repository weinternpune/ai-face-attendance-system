import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { 
  MapPin, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Navigation,
  Globe2,
  Sliders,
  Layers,
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';

export default function GeofenceSettings() {
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius_meters: 100,
    address: '',
    is_active: true
  });

  const [currentLocLoading, setCurrentLocLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  const fetchGeofences = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/geofence');
      setGeofences(res.data);
    } catch (err) {
      console.error('Failed to load geofences:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeofences();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      name: '',
      latitude: '',
      longitude: '',
      radius_meters: 100,
      address: '',
      is_active: true
    });
    setLocationError('');
    setModalOpen(true);
  };

  const openEditModal = (gf) => {
    setIsEditing(true);
    setEditId(gf.id);
    setFormData({
      name: gf.name,
      latitude: gf.latitude,
      longitude: gf.longitude,
      radius_meters: gf.radius_meters || 100,
      address: gf.address || '',
      is_active: gf.is_active !== undefined ? gf.is_active : true
    });
    setLocationError('');
    setModalOpen(true);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setCurrentLocLoading(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: parseFloat(position.coords.latitude.toFixed(6)),
          longitude: parseFloat(position.coords.longitude.toFixed(6))
        }));
        setCurrentLocLoading(false);
      },
      (error) => {
        setLocationError(`GPS error: ${error.message}`);
        setCurrentLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radius_meters: parseFloat(formData.radius_meters),
        address: formData.address.trim(),
        is_active: formData.is_active
      };

      if (isEditing) {
        await apiClient.patch(`/geofence/${editId}`, payload);
      } else {
        await apiClient.post('/geofence', payload);
      }

      setModalOpen(false);
      fetchGeofences();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save geofence location');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete geofence location "${name}"?`)) return;
    try {
      await apiClient.delete(`/geofence/${id}`);
      fetchGeofences();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete geofence');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 animate-fadeIn font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 sm:p-7 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
              Phase 3 Enterprise Geofencing
            </span>
            <span className="text-slate-400 text-xs">• GPS Perimeter Control</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
            Office Geofence & Location Boundaries
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Configure geographic coordinates and allowed radius thresholds for mobile remote self-attendance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchGeofences}
            className="p-2.5 sm:p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-800 transition cursor-pointer"
            title="Refresh Locations"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Geofence Location
          </button>
        </div>
      </div>

      {/* Geofence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {geofences.map((gf) => (
          <div 
            key={gf.id} 
            className="glass-panel card-hover rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base leading-tight">{gf.name}</h3>
                    <span className="text-[11px] text-slate-400 font-mono">ID: {gf.id.slice(-6)}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                  gf.is_active 
                    ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {gf.is_active ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>

              {gf.address && (
                <p className="text-xs text-slate-400 mt-3 line-clamp-2">{gf.address}</p>
              )}

              {/* Coordinates Info Box */}
              <div className="mt-4 p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>GPS Latitude:</span>
                  <span className="font-mono text-white font-bold">{gf.latitude}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>GPS Longitude:</span>
                  <span className="font-mono text-white font-bold">{gf.longitude}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 border-t border-slate-800/60 pt-1.5">
                  <span className="flex items-center gap-1 text-amber-400 font-semibold">
                    <Sliders className="w-3.5 h-3.5" /> Allowed Radius:
                  </span>
                  <span className="font-extrabold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
                    {gf.radius_meters} meters
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <a
                href={`https://www.google.com/maps?q=${gf.latitude},${gf.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition"
              >
                <Globe2 className="w-3.5 h-3.5" /> View on Map
              </a>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(gf)}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition cursor-pointer"
                  title="Edit Geofence"
                >
                  <Edit3 className="w-4 h-4 text-amber-400" />
                </button>
                <button
                  onClick={() => handleDelete(gf.id, gf.name)}
                  className="p-2 bg-slate-900 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-xl border border-slate-800 transition cursor-pointer"
                  title="Delete Geofence"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center border border-amber-400/20">
                  <MapPin className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  {isEditing ? 'Edit Geofence Boundary' : 'Create Office Geofence Location'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Location Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WeIntern Pune HQ - Main Office"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 shadow-inner"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    GPS Coordinates (Latitude & Longitude) *
                  </label>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={currentLocLoading}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Navigation className={`w-3 h-3 ${currentLocLoading ? 'animate-spin' : ''}`} />
                    {currentLocLoading ? 'Detecting GPS...' : 'Use My Current GPS'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Latitude (e.g. 18.5204)"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 shadow-inner font-mono"
                  />
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Longitude (e.g. 73.8567)"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 shadow-inner font-mono"
                  />
                </div>
                {locationError && (
                  <p className="text-[11px] text-rose-400 mt-1">{locationError}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Allowed Radius: <span className="text-amber-400 font-bold">{formData.radius_meters} meters</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Max allowed distance from center</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="1000"
                  step="10"
                  value={formData.radius_meters}
                  onChange={(e) => setFormData({ ...formData, radius_meters: e.target.value })}
                  className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>20m (Strict)</span>
                  <span>100m (Standard)</span>
                  <span>500m</span>
                  <span>1000m (Campus)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Physical Address (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. FC Road, Shivajinagar, Pune, Maharashtra"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 shadow-inner"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="active_check"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-400 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="active_check" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Activate this geofence for mobile attendance verification
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-6 py-2 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Geofence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
