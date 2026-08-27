import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import CustomSelect from '../components/CustomSelect';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  CalendarOff, 
  Download, 
  Search, 
  RefreshCw, 
  Edit3, 
  Activity, 
  Sparkles, 
  X, 
  Wifi, 
  WifiOff, 
  Calendar, 
  Layers, 
  ArrowRight 
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_employees: 0,
    present: 0,
    absent: 0,
    late: 0,
    on_leave: 0
  });
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionStatus, setCorrectionStatus] = useState('Present');
  const [correctionReason, setCorrectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastLiveEvent, setLastLiveEvent] = useState(null);
  const wsRef = useRef(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, attendanceRes] = await Promise.all([
        apiClient.get('/attendance/today-stats'),
        apiClient.get('/attendance/today')
      ]);
      setStats(statsRes.data);
      setAttendanceRecords(attendanceRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-Time WebSocket Connection
  useEffect(() => {
    fetchDashboardData();

    // Determine WS URL
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const baseUrl = apiUrl.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
    const wsUrl = `${baseUrl}/ws/attendance`;

    let socket;
    try {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setWsConnected(true);
        console.log('Real-time attendance WebSocket connected');
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setLastLiveEvent(payload);
          // Auto-refresh stats and records immediately
          fetchDashboardData();
        } catch (e) {
          console.warn('Failed to parse WS message:', e);
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
      };

      socket.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
        setWsConnected(false);
      };
    } catch (err) {
      console.warn('WebSocket init failed:', err);
    }

    return () => {
      if (socket) socket.close();
    };
  }, []);

  const handleExportCSV = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await apiClient.get(`/reports/daily-csv?date=${today}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `weintern_attendance_${today}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('CSV export failed:', err);
    }
  };

  const handleOpenCorrection = (record) => {
    setSelectedRecord(record);
    setCorrectionStatus(record.status || 'Present');
    setCorrectionReason('');
    setCorrectionModalOpen(true);
  };

  const submitCorrection = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setActionLoading(true);
    try {
      await apiClient.patch(`/attendance/${selectedRecord.id}/correct`, {
        status: correctionStatus,
        reason: correctionReason
      });
      setCorrectionModalOpen(false);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update attendance record');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRecords = attendanceRecords.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.employee_name?.toLowerCase().includes(q) ||
      r.employee_id?.toLowerCase().includes(q) ||
      r.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-10 space-y-5 sm:space-y-8 animate-fadeIn font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 sm:p-7 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-extrabold bg-amber-400/10 text-amber-400 border border-amber-400/20">
              Live Workforce
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              {wsConnected ? (
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Sync Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-500">
                  <WifiOff className="w-3.5 h-3.5" /> Polling Mode
                </span>
              )}
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">Real-Time Attendance Operations</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Monitor real-time biometric kiosk verification, employee shift statuses, and live headcount statistics
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={fetchDashboardData}
            title="Refresh Table"
            className="p-2.5 sm:p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-800 transition cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="btn-primary flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm rounded-2xl cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.5]" /> Export Daily CSV
          </button>
        </div>
      </div>

      {/* Live Punch Alert Toast when WebSocket event fires */}
      {lastLiveEvent && (
        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 shadow-lg flex items-center justify-between gap-3 animate-spring-in">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <div>
              <span className="text-xs font-bold text-white">Live Attendance Punch Logged: </span>
              <span className="text-xs text-emerald-400 font-extrabold">{lastLiveEvent.data?.employee_name || 'Staff Member'}</span>
              <span className="text-[11px] text-slate-400 font-mono ml-2">({lastLiveEvent.data?.entry_time || 'Just now'})</span>
            </div>
          </div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 font-bold uppercase">
            {lastLiveEvent.data?.status || 'VERIFIED'}
          </span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 animate-fade-slide-up">
        
        {/* Total Staff */}
        <div className="glass-panel card-hover rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Total Staff</span>
            <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:scale-110 transition">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white mt-3 tracking-tight">{stats.total_employees}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Registered Personnel
          </div>
        </div>

        {/* Present */}
        <div className="glass-panel card-hover rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden border-emerald-500/20 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400">Present</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition shadow-sm">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-400 mt-3 tracking-tight">{stats.present}</div>
          <div className="text-[11px] text-emerald-400/90 mt-1 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Verified at Kiosk
          </div>
        </div>

        {/* Late */}
        <div className="glass-panel card-hover rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden border-amber-500/20 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400">Late Arrivals</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition shadow-sm">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-amber-400 mt-3 tracking-tight">{stats.late}</div>
          <div className="text-[11px] text-amber-400/90 mt-1 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> After Shift Grace
          </div>
        </div>

        {/* Absent */}
        <div className="glass-panel card-hover rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden border-rose-500/20 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-rose-400">Absent</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition shadow-sm">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-rose-400 mt-3 tracking-tight">{stats.absent}</div>
          <div className="text-[11px] text-rose-400/90 mt-1 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Not Checked In
          </div>
        </div>

        {/* On Leave */}
        <div className="glass-panel card-hover rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden border-cyan-500/20 col-span-2 sm:col-span-1 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-400">On Leave</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition shadow-sm">
              <CalendarOff className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-cyan-400 mt-3 tracking-tight">{stats.on_leave}</div>
          <div className="text-[11px] text-cyan-400/90 mt-1 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Approved Leaves
          </div>
        </div>

      </div>

      {/* Turnout Progress Bar Banner */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-800 shadow-xl space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> Organization Turnout Rate
          </span>
          <span className="font-mono font-extrabold text-amber-400">
            {stats.total_employees > 0 ? Math.round((stats.present / stats.total_employees) * 100) : 0}% Present
          </span>
        </div>
        <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div 
            className="bg-gradient-to-r from-emerald-500 via-amber-400 to-cyan-400 h-full rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(245,158,11,0.5)]" 
            style={{ width: `${stats.total_employees > 0 ? Math.min(100, Math.round((stats.present / stats.total_employees) * 100)) : 0}%` }}
          />
        </div>
      </div>

      {/* Quick Access Modules Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link 
          to="/leaves" 
          className="glass-panel card-hover p-5 rounded-2xl border border-slate-800 transition flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center border border-amber-400/20 group-hover:scale-110 transition">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm group-hover:text-amber-400 transition">Leave & Regularization Center</p>
              <p className="text-slate-400 text-xs">Review pending time-off requests and regularizations</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1.5 transition" />
        </Link>

        <Link 
          to="/shifts" 
          className="glass-panel card-hover p-5 rounded-2xl border border-slate-800 transition flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center border border-cyan-400/20 group-hover:scale-110 transition">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm group-hover:text-cyan-400 transition">Shift & Timing Rules</p>
              <p className="text-slate-400 text-xs">Configure shifts, grace periods, and late thresholds</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1.5 transition" />
        </Link>
      </div>

      {/* Live Attendance Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 shadow-xl overflow-hidden animate-fade-slide-up">
        
        {/* Table Search & Filter Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" /> Today's Live Attendance Stream
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Real-time biometrics stream from Entrance Kiosks</p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search live punches by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 shadow-inner"
            />
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm min-w-[700px]">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px] sm:text-[11px]">
              <tr>
                <th className="px-5 py-4">Employee</th>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">In Time</th>
                <th className="px-5 py-4">Out Time</th>
                <th className="px-5 py-4">AI Confidence</th>
                <th className="px-5 py-4">Shift Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full mb-2" />
                    <p className="font-medium">Connecting to live attendance stream...</p>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    <Activity className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-300">No attendance scans recorded today yet</p>
                    <p className="text-xs text-slate-500 mt-0.5">Scans made at the Kiosk will appear here in real-time.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-900/40 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-400 font-bold flex items-center justify-center border border-amber-400/20">
                          {r.employee_name?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <p className="font-bold text-white">{r.employee_name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{r.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-300 font-medium">{r.department}</td>
                    <td className="px-5 py-4 font-mono text-white font-bold">{r.entry_time}</td>
                    <td className="px-5 py-4 font-mono text-slate-400">{r.exit_time}</td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-900 border border-slate-800 text-slate-300">
                        {r.confidence ? `${r.confidence}%` : 'Manual'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {r.status === 'Present' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Present
                        </span>
                      )}
                      {r.status === 'Late' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30">
                          <Clock className="w-3 h-3 text-amber-400" /> Late
                        </span>
                      )}
                      {r.status === 'Leave' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-400/10 text-cyan-400 border border-cyan-400/30">
                          <CalendarOff className="w-3 h-3 text-cyan-400" /> On Leave
                        </span>
                      )}
                      {r.is_manual && (
                        <span className="ml-1 text-[10px] text-amber-400/80 italic font-mono font-bold">(Edited)</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleOpenCorrection(r)}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl transition border border-slate-800 cursor-pointer"
                      >
                        Override
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Correction Modal */}
      {correctionModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 w-full max-w-md rounded-3xl border border-slate-800 p-5 sm:p-7 space-y-4 shadow-2xl animate-spring-in my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> Manual Attendance Override
              </h3>
              <button onClick={() => setCorrectionModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-1">
              <p className="text-slate-400">Employee: <strong className="text-white">{selectedRecord.employee_name} ({selectedRecord.employee_id})</strong></p>
              <p className="text-slate-400">Recorded In Time: <span className="text-amber-400 font-mono font-bold">{selectedRecord.entry_time}</span></p>
            </div>

            <form onSubmit={submitCorrection} className="space-y-4 text-xs">
              <CustomSelect
                label="Status Override *"
                value={correctionStatus}
                onChange={(val) => setCorrectionStatus(val)}
                options={[
                  { label: 'Present', value: 'Present', desc: 'Clocked in on time' },
                  { label: 'Late', value: 'Late', desc: 'Clocked in after shift grace period' },
                  { label: 'Leave', value: 'Leave', desc: 'Approved casual or medical leave' },
                  { label: 'Absent', value: 'Absent', desc: 'Not present in office' }
                ]}
              />

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Correction Reason (Logged to Audit Trail) *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Device offline, verified in-person with Manager approval"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white focus:outline-none focus:border-amber-400 shadow-inner"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCorrectionModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary px-5 py-2 rounded-xl font-bold cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Save Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
