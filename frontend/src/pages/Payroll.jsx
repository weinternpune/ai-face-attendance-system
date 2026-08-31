import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { 
  DollarSign, 
  Clock, 
  Download, 
  Calendar, 
  Users, 
  TrendingUp, 
  Sparkles, 
  Search, 
  RefreshCw, 
  Award, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Building2
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

export default function Payroll() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [payrollData, setPayrollData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [downloading, setDownloading] = useState(false);

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/reports/payroll?month=${selectedMonth}`);
      setPayrollData(res.data);
    } catch (err) {
      console.error('Failed to load payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, [selectedMonth]);

  const handleDownloadCSV = async () => {
    setDownloading(true);
    try {
      const res = await apiClient.get(`/reports/payroll-csv?month=${selectedMonth}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `weintern_payroll_statement_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to generate payroll spreadsheet');
    } finally {
      setDownloading(false);
    }
  };

  const employees = payrollData?.employees || [];

  const STANDARD_DEPARTMENTS = [
    'ALL',
    'AIML',
    'Full Stack Development',
    'Data Science',
    'Engineering',
    'Human Resources',
    'Management',
    'Marketing',
    'Product',
    'Design'
  ];

  const allDepartmentNames = Array.from(
    new Set([...STANDARD_DEPARTMENTS, ...employees.map(e => e.department).filter(Boolean)])
  );

  const deptOptions = allDepartmentNames.map((dept) => {
    const count = dept === 'ALL' 
      ? employees.length 
      : employees.filter(e => (e.department || '').trim().toLowerCase() === dept.trim().toLowerCase()).length;
    return {
      label: dept === 'ALL' ? 'All Departments' : dept,
      value: dept,
      badge: count
    };
  });

  const filteredEmployees = employees.filter((e) => {
    const matchesSearch = 
      (e.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.employee_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.department || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === 'ALL' || (e.department || '').trim().toLowerCase() === deptFilter.trim().toLowerCase();
    return matchesSearch && matchesDept;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 animate-fadeIn font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass-panel p-5 sm:p-7 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
              Phase 3 Payroll Intelligence
            </span>
            <span className="text-slate-400 text-xs">• Hours & Overtime Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
            Workforce Payroll & Working Hours
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Automated net working hours, overtime (OT) accruals, leave balances, and 1-click salary statement exports.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-2 rounded-2xl border border-slate-800">
            <Calendar className="w-4 h-4 text-amber-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white text-xs sm:text-sm font-bold focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={fetchPayrollData}
            title="Refresh Data"
            className="p-2.5 sm:p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-800 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={handleDownloadCSV}
            disabled={downloading}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {downloading ? 'Exporting...' : 'Export Payroll CSV'}
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Employees */}
        <div className="glass-panel card-hover p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 hover:border-slate-700 space-y-2 shadow-xl group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Total Staff</span>
            <div className="w-9 h-9 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-300 group-hover:scale-110 group-hover:bg-slate-700 transition duration-300 shadow-md">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white group-hover:scale-[1.02] transition origin-left">{payrollData?.total_employees || 0}</div>
          <p className="text-[10px] sm:text-[11px] text-slate-400">Active payroll profiles</p>
        </div>

        {/* Total Working Hours */}
        <div className="glass-panel card-hover p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 hover:border-emerald-400/60 space-y-2 shadow-xl group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400">Hours Logged</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/25 transition duration-300 shadow-md shadow-emerald-500/10">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 group-hover:scale-[1.02] transition origin-left">{payrollData?.total_hours_logged || 0} hrs</div>
          <p className="text-[10px] sm:text-[11px] text-emerald-400/80">Net productive hours</p>
        </div>

        {/* Total Overtime Hours */}
        <div className="glass-panel card-hover p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 hover:border-amber-400/60 space-y-2 shadow-xl group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400">Overtime (OT)</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/25 transition duration-300 shadow-md shadow-amber-500/10">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 group-hover:scale-[1.02] transition origin-left">{payrollData?.total_overtime_hours || 0} hrs</div>
          <p className="text-[10px] sm:text-[11px] text-amber-400/80">Accrued extra shift time</p>
        </div>

        {/* Working Days */}
        <div className="glass-panel card-hover p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/30 hover:border-cyan-400/60 space-y-2 shadow-xl group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-400">Standard Base</span>
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500/25 transition duration-300 shadow-md shadow-cyan-500/10">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400 group-hover:scale-[1.02] transition origin-left">{payrollData?.standard_working_days || 26} Days</div>
          <p className="text-[10px] sm:text-[11px] text-cyan-400/80">Monthly pay schedule</p>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 glass-panel p-4 rounded-2xl border border-slate-800 relative z-30">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee name, ID or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="w-full sm:w-64">
          <CustomSelect
            value={deptFilter}
            onChange={(val) => setDeptFilter(val || 'ALL')}
            options={deptOptions}
            icon={Building2}
            size="sm"
            placeholder="Filter Department..."
          />
        </div>
      </div>

      {/* Payroll Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[900px]">
            <thead className="bg-slate-950/80 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Dept & Shift</th>
                <th className="px-6 py-4">Present / Late / Half</th>
                <th className="px-6 py-4">Paid Leaves</th>
                <th className="px-6 py-4">Total Hours</th>
                <th className="px-6 py-4">Overtime (OT)</th>
                <th className="px-6 py-4">Net Payable Days</th>
                <th className="px-6 py-4">Turnout %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                    No payroll attendance records found for this period.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-slate-850/60 transition">
                    
                    {/* Employee Profile */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-white block">{emp.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{emp.employee_id} • {emp.designation}</span>
                        </div>
                      </div>
                    </td>

                    {/* Department & Shift */}
                    <td className="px-6 py-4">
                      <span className="text-white font-semibold block">{emp.department}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800 mt-0.5 inline-block">
                        {emp.shift_name}
                      </span>
                    </td>

                    {/* Present / Late / Half-Day */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-emerald-400 font-bold">{emp.days_present} Present</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-amber-400">{emp.days_late} Late</span>
                        {emp.half_days > 0 && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-rose-400 font-semibold">{emp.half_days} Half</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Paid Leaves */}
                    <td className="px-6 py-4">
                      <span className="text-cyan-400 font-bold">{emp.paid_leaves} Days</span>
                      {emp.unpaid_leaves > 0 && (
                        <span className="text-[10px] text-rose-400 block font-semibold">{emp.unpaid_leaves} Unpaid LOP</span>
                      )}
                    </td>

                    {/* Total Logged Hours */}
                    <td className="px-6 py-4 font-mono font-bold text-white">
                      {emp.total_working_hours} hrs
                    </td>

                    {/* Overtime (OT) Hours */}
                    <td className="px-6 py-4">
                      {emp.total_overtime_hours > 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                          +{emp.total_overtime_hours} hrs
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs font-mono">—</span>
                      )}
                    </td>

                    {/* Net Payable Days */}
                    <td className="px-6 py-4">
                      <span className="text-base font-black text-emerald-400">
                        {emp.payable_days} <span className="text-xs font-normal text-slate-400">/ {emp.total_working_days}</span>
                      </span>
                    </td>

                    {/* Turnout % */}
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                        {emp.attendance_rate_percent}%
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
