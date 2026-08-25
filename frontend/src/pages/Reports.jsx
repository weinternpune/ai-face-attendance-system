import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { 
  FileSpreadsheet, 
  Download, 
  TrendingUp, 
  Calendar,
  Sparkles
} from 'lucide-react';

export default function Reports() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/reports/summary?days=7');
      setSummaryData(res.data);
    } catch (err) {
      console.error('Failed to load summary reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const downloadDailyCSV = async () => {
    try {
      const res = await apiClient.get(`/reports/daily-csv?date=${selectedDate}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `weintern_attendance_${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-3xl p-6 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Compliance & Exports</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">Attendance Analytics & Reports</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Export audit-ready CSV records and inspect 7-day attendance compliance
          </p>
        </div>
      </div>

      {/* CSV Export Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-1.5 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Daily Attendance Export (.CSV)</h2>
              <p className="text-xs text-slate-400">
                Official audit spreadsheet with verified entry timestamps, device IDs, and match confidence.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-amber-400 shadow-inner"
            />
          </div>
          <button
            onClick={downloadDailyCSV}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 hover:from-amber-400 hover:to-yellow-200 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg shadow-amber-500/25 transition hover:scale-105"
          >
            <Download className="w-4 h-4 stroke-[2.5]" /> Download CSV Report
          </button>
        </div>
      </div>

      {/* 7-Day Performance & Attendance Rate Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">7-Day Attendance Rate Summary</h3>
            <p className="text-xs text-slate-400">Compliance percentage evaluated across active personnel</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[650px]">
            <thead className="bg-slate-950/80 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Present Days</th>
                <th className="px-6 py-4">Late Days</th>
                <th className="px-6 py-4">7-Day Attendance Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {summaryData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400 text-sm">
                    No summary data recorded in the last 7 days.
                  </td>
                </tr>
              ) : (
                summaryData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-850/60 transition">
                    <td className="px-6 py-4 font-semibold text-white">{item.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{item.employee_id}</td>
                    <td className="px-6 py-4 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300">
                        {item.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-emerald-400 font-bold">{item.present_days} / {item.total_days_evaluated}</td>
                    <td className="px-6 py-4 font-mono text-xs text-amber-400 font-bold">{item.late_days}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-28 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full"
                            style={{ width: `${item.attendance_rate_percent}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-white font-mono">{item.attendance_rate_percent}%</span>
                      </div>
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
