import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { 
  FileSpreadsheet, 
  Download, 
  TrendingUp, 
  Calendar, 
  Sparkles, 
  PieChart, 
  BarChart3, 
  Users, 
  CheckCircle2, 
  Clock, 
  Layers,
  Building2,
  RefreshCw
} from 'lucide-react';

export default function Reports() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [rangeStart, setRangeStart] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [rangeEnd, setRangeEnd] = useState(new Date().toISOString().split('T')[0]);
  const [summaryData, setSummaryData] = useState([]);
  const [deptAnalytics, setDeptAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const [summaryRes, deptRes] = await Promise.all([
        apiClient.get('/reports/summary?days=7'),
        apiClient.get('/reports/department-analytics')
      ]);
      setSummaryData(summaryRes.data);
      setDeptAnalytics(deptRes.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
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
      alert('Failed to generate daily attendance spreadsheet');
    }
  };

  const downloadRangeCSV = async () => {
    try {
      const res = await apiClient.get(`/reports/range-csv?start_date=${rangeStart}&end_date=${rangeEnd}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `weintern_attendance_report_${rangeStart}_to_${rangeEnd}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to generate custom range spreadsheet');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 animate-fadeIn font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 sm:p-7 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
              Phase 2 Enterprise Analytics
            </span>
            <span className="text-slate-400 text-xs">• CSV Exports</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">Workforce Intelligence & Reports</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Real-time department breakdown, weekly attendance trends, and instant CSV spreadsheet exports
          </p>
        </div>

        <button
          onClick={fetchReportsData}
          className="p-2.5 sm:p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-800 transition cursor-pointer self-start sm:self-auto"
          title="Refresh Analytics"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Department Analytics Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" /> Department Attendance Breakdown (Today)
          </h2>
          <span className="text-xs text-slate-400">{deptAnalytics.length} Departments Active</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {deptAnalytics.map((dept) => (
            <div key={dept.department} className="glass-panel card-hover p-5 rounded-3xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm truncate">{dept.department}</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  {dept.attendance_rate}% Rate
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-700 ease-out" 
                  style={{ width: `${Math.min(100, dept.attendance_rate)}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-400 block">Total</span>
                  <span className="font-bold text-white">{dept.total_members}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-400 block">Present</span>
                  <span className="font-bold text-emerald-400">{dept.present}</span>
                </div>
                <div>
                  <span className="text-[10px] text-amber-400 block">Late</span>
                  <span className="font-bold text-amber-400">{dept.late}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CSV Exports Grid (Daily + Custom Range) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Daily CSV */}
        <div className="glass-panel card-hover rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Daily Attendance Export (.CSV)</h3>
                <p className="text-xs text-slate-400">Export verified biometric records for single date.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <button
              onClick={downloadDailyCSV}
              className="btn-primary flex items-center justify-center gap-2 px-5 py-2.5 text-xs rounded-xl shadow transition shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download Daily
            </button>
          </div>
        </div>

        {/* Date Range CSV */}
        <div className="glass-panel card-hover rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Custom Range / Monthly Export (.CSV)</h3>
                <p className="text-xs text-slate-400">Export aggregated multi-day or monthly history.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                const last7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                setRangeStart(last7);
                setRangeEnd(today);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 border border-slate-800 transition cursor-pointer"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                setRangeStart(last30);
                setRangeEnd(today);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 border border-slate-800 transition cursor-pointer"
            >
              Last 30 Days
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Start Date</label>
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 shadow-inner"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">End Date</label>
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 shadow-inner"
              />
            </div>
          </div>

          <button
            onClick={downloadRangeCSV}
            className="btn-primary w-full py-2.5 text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Download Range CSV Report
          </button>
        </div>

      </div>

      {/* 7-Day Trend Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" /> 7-Day Historical Trend
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Aggregated headcount and punctuality data over the past week</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[600px]">
            <thead className="bg-slate-950/80 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Present Headcount</th>
                <th className="px-6 py-4">Late Check-ins</th>
                <th className="px-6 py-4">Total Registered</th>
                <th className="px-6 py-4">Overall Turnout Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {summaryData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                    No historical logs available yet.
                  </td>
                </tr>
              ) : (
                summaryData.map((row) => (
                  <tr key={row.date} className="hover:bg-slate-850/60 transition">
                    <td className="px-6 py-4 font-mono font-bold text-white">{row.date}</td>
                    <td className="px-6 py-4 text-emerald-400 font-bold">{row.present}</td>
                    <td className="px-6 py-4 text-amber-400 font-bold">{row.late}</td>
                    <td className="px-6 py-4 text-slate-400">{row.total_registered}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                        {row.turnout_rate}%
                      </span>
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
