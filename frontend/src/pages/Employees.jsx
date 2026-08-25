import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import CustomSelect from '../components/CustomSelect';
import { 
  Users, 
  Search, 
  CheckCircle2, 
  XCircle, 
  UserPlus,
  Trash2,
  Filter,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/users/');
      setEmployees(res.data);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const toggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Disabled' : 'Active';
    try {
      await apiClient.patch(`/users/${userId}/status?new_status=${newStatus}`);
      fetchEmployees();
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const filtered = employees.filter((emp) => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter ? emp.department === deptFilter : true;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-3xl p-6 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Personnel Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">Staff & Intern Directory</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Manage employee access, department allocations, and biometric enrollment statuses
          </p>
        </div>

        <Link
          to="/enroll"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 hover:from-amber-400 hover:to-yellow-200 text-slate-950 font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-500/25 transition hover:scale-[1.02]"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" /> Enroll New Employee
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row gap-4 items-center justify-between border border-slate-800">
        <div className="relative w-full sm:max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, ID, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition shadow-inner"
          />
        </div>

        <div className="w-full sm:w-64">
          <CustomSelect
            value={deptFilter}
            onChange={(val) => setDeptFilter(val)}
            options={[
              { label: 'All Departments', value: '' },
              { label: 'AIML', value: 'AIML' },
              { label: 'Full Stack Development', value: 'Full Stack Development' },
              { label: 'Data Science', value: 'Data Science' },
              { label: 'Product', value: 'Product' },
              { label: 'Human Resources', value: 'Human Resources' },
              { label: 'Management', value: 'Management' },
              { label: 'Marketing', value: 'Marketing' },
            ]}
            icon={Filter}
            placeholder="All Departments"
          />
        </div>
      </div>

      {/* Directory Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[700px]">
            <thead className="bg-slate-950/80 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Role & Type</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Biometric Status</th>
                <th className="px-6 py-4">Account</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400 text-sm">
                    No employees matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => {
                  const initials = emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  return (
                    <tr key={emp.id} className="hover:bg-slate-850/60 transition group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500/20 to-amber-300/10 border border-amber-400/30 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-white group-hover:text-amber-400 transition">{emp.name}</div>
                            <div className="text-[11px] text-slate-400">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">{emp.employee_id}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 text-[11px] font-semibold text-amber-400 border border-amber-400/20">
                          {emp.role} • {emp.employee_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-300">{emp.department}</td>
                      <td className="px-6 py-4">
                        {emp.has_face_enrolled ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled (3D Vector)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3.5 h-3.5" /> Pending Biometrics
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          emp.status === 'Active' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-800'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => toggleStatus(emp.id, emp.status)}
                          className="text-xs font-semibold text-slate-400 hover:text-amber-400 transition"
                        >
                          {emp.status === 'Active' ? 'Disable' : 'Activate'}
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Are you sure you want to delete ${emp.name}?`)) {
                              try {
                                await apiClient.delete(`/users/${emp.id}`);
                                fetchEmployees();
                              } catch (err) {
                                console.error('Delete failed:', err);
                              }
                            }
                          }}
                          className="text-xs font-semibold text-rose-400/80 hover:text-rose-400 transition ml-2"
                        >
                          Delete
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

    </div>
  );
}
