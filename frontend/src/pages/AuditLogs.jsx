import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import CustomSelect from '../components/CustomSelect';
import { 
  ShieldAlert,
  ShieldCheck,
  Activity,
  Filter
} from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/audit/', {
        params: actionFilter ? { action: actionFilter } : {}
      });
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const getActionBadge = (action) => {
    switch (action) {
      case 'UNKNOWN_FACE_DETECTED':
        return <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm">Unknown Face Detected</span>;
      case 'SPOOF_ATTEMPT_BLOCKED':
        return <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm">Anti-Spoof Blocked</span>;
      case 'MANUAL_ATTENDANCE_CORRECTION':
        return <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm">Manual Edit</span>;
      case 'FACE_ENROLLED':
        return <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">Face Enrolled</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300">{action}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-3xl p-6 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Security & DPDP Audit Trail</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">Immutable Security Logs</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Traceable records of manual modifications, unknown face rejections, and biometric enrollments
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Filter Security Events</div>
            <div className="text-xs text-slate-400">Select event classification to inspect</div>
          </div>
        </div>

        <div className="w-full sm:w-64">
          <CustomSelect
            value={actionFilter}
            onChange={(val) => setActionFilter(val)}
            options={[
              { label: 'All Security Events', value: '' },
              { label: 'Unknown Face Events', value: 'UNKNOWN_FACE_DETECTED' },
              { label: 'Anti-Spoof Blocked', value: 'SPOOF_ATTEMPT_BLOCKED' },
              { label: 'Manual Corrections', value: 'MANUAL_ATTENDANCE_CORRECTION' },
              { label: 'Face Enrollments', value: 'FACE_ENROLLED' },
            ]}
            placeholder="All Security Events"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[700px]">
            <thead className="bg-slate-950/80 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Security Action</th>
                <th className="px-6 py-4">Triggered By</th>
                <th className="px-6 py-4">Target Person</th>
                <th className="px-6 py-4">Payload Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-400 text-sm">
                    No security events logged.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/60 transition">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {new Date(log.timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">{getActionBadge(log.action)}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-white">
                      {log.admin_name || 'Kiosk Vision System'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300">
                      {log.target_user_name || '—'}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400 max-w-xs truncate">
                      {JSON.stringify(log.details || {})}
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
