import React, { useState, useEffect } from 'react';
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
  X 
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

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleExportCSV = async () => {
    try {
      const response = await apiClient.get('/reports/daily-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `weintern_attendance_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('CSV Export failed:', err);
    }
  };

  const handleOpenCorrection = (record) => {
    setSelectedRecord(record);
    setCorrectionStatus(record.status);
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
        reason: correctionReason || 'Admin manual override'
      });
      setCorrectionModalOpen(false);
      fetchDashboardData();
    } catch (err) {
      console.error('Correction failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRecords = attendanceRecords.filter((r) =>
    r.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 animate-fadeIn">
      
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel rounded-3xl p-6 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Live Workspace Monitoring</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">Executive Attendance Dashboard</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Biometric activity for {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:border-amber-400/40 transition hover:scale-105"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 hover:from-amber-400 hover:to-yellow-200 text-slate-950 font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-500/25 transition hover:scale-[1.02] active:scale-95"
          >
            <Download className="w-4 h-4 stroke-[2.5]" /> Export Daily CSV
          </button>
        </div>
      </div>

      {/* 12.1 Premium Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
        
        {/* Total Staff */}
        <div className="glass-panel glass-panel-hover rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Total Staff</span>
            <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white mt-3 tracking-tight">{stats.total_employees}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Registered Personnel</div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-slate-800/20 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Present */}
        <div className="glass-panel glass-panel-hover rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden border-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Present</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-400 mt-3 tracking-tight">{stats.present}</div>
          <div className="text-[11px] text-emerald-400/80 mt-1 font-medium">Verified at Kiosk</div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/15 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Late */}
        <div className="glass-panel glass-panel-hover rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden border-amber-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">Late Arrivals</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-amber-400 mt-3 tracking-tight">{stats.late}</div>
          <div className="text-[11px] text-amber-400/80 mt-1 font-medium">After 10:00 AM</div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-500/15 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Absent */}
        <div className="glass-panel glass-panel-hover rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden border-rose-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-rose-400">Absent</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-rose-400 mt-3 tracking-tight">{stats.absent}</div>
          <div className="text-[11px] text-rose-400/80 mt-1 font-medium">Not checked in</div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-rose-500/15 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* On Leave */}
        <div className="glass-panel glass-panel-hover rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden border-cyan-500/20 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-400">On Leave</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <CalendarOff className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-cyan-400 mt-3 tracking-tight">{stats.on_leave}</div>
          <div className="text-[11px] text-cyan-400/80 mt-1 font-medium">Approved Leaves</div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-cyan-500/15 rounded-full blur-xl pointer-events-none" />
        </div>

      </div>

      {/* 12.2 Live Attendance Stream Table */}
      <div className="glass-panel rounded-3xl p-4 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
        
        {/* Table Search & Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Live Attendance Stream</h2>
              <p className="text-xs text-slate-400">Real-time camera verification activity log</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff, ID, dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none transition shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Table Rows */}
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[700px]">
            <thead className="bg-slate-950/80 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Entry Time</th>
                <th className="px-6 py-4">AI Match</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center text-slate-400 text-sm">
                    <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <Clock className="w-6 h-6" />
                    </div>
                    No attendance records logged for today yet.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const initials = record.employee_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  return (
                    <tr key={record.id} className="hover:bg-slate-850/60 transition group">
                      <td className="px-6 py-4 font-semibold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500/20 to-amber-300/10 border border-amber-400/30 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div>{record.employee_name}</div>
                          {record.is_manual && (
                            <span className="text-[10px] text-amber-400 font-normal">
                              Manual Override
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">{record.employee_id}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-300">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800">
                          {record.department}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-emerald-400 font-bold">{record.entry_time}</td>
                      <td className="px-6 py-4 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full"
                              style={{ width: `${Math.min(100, record.confidence)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">{record.confidence}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          record.status === 'Present'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                            : record.status === 'Late'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${record.status === 'Present' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenCorrection(record)}
                          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-transparent hover:border-slate-700 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Correction Modal */}
      {correctionModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Manual Attendance Correction</h3>
              <button onClick={() => setCorrectionModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-1 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <div>Employee: <strong className="text-white">{selectedRecord.employee_name}</strong> ({selectedRecord.employee_id})</div>
              <div>Current Entry Time: <strong className="text-emerald-400 font-mono">{selectedRecord.entry_time}</strong></div>
            </div>

            <form onSubmit={submitCorrection} className="space-y-4">
              <CustomSelect
                label="Update Status"
                value={correctionStatus}
                onChange={(val) => setCorrectionStatus(val)}
                options={[
                  { label: 'Present (On-Time)', value: 'Present' },
                  { label: 'Late Arrival', value: 'Late' },
                  { label: 'Absent', value: 'Absent' },
                  { label: 'Approved Leave', value: 'Leave' },
                ]}
              />

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Correction (Audit Logged)</label>
                <textarea
                  required
                  rows="3"
                  placeholder="e.g. Official outdoor duty / biometric exception"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:border-amber-400 focus:outline-none placeholder-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCorrectionModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:scale-105 transition"
                >
                  {actionLoading ? 'Saving...' : 'Save & Log Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
