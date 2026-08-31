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
  Sparkles,
  Edit,
  X,
  Check,
  AlertCircle,
  Clock,
  Briefcase,
  Building2,
  Tag,
  Shield,
  Phone,
  User,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    role: '',
    department: '',
    designation: '',
    employee_type: '',
    shift_name: '',
    phone: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const [empRes, shiftRes] = await Promise.all([
        apiClient.get('/users/'),
        apiClient.get('/shifts').catch(() => ({ data: [] }))
      ]);
      setEmployees(empRes.data);
      setShifts(shiftRes.data || []);
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

  const handleOpenEdit = (emp) => {
    setEditingEmployee(emp);
    setEditFormData({
      name: emp.name || '',
      role: emp.role || 'Intern',
      department: emp.department || 'AIML',
      designation: emp.designation || '',
      employee_type: emp.employee_type || 'Intern',
      shift_name: emp.shift_name || 'General Shift',
      phone: emp.phone || '',
      password: ''
    });
    setEditError('');
    setEditSuccess('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setEditLoading(true);
    setEditError('');
    setEditSuccess('');

    try {
      await apiClient.patch(`/users/${editingEmployee.id}`, editFormData);
      setEditSuccess('Employee updated successfully!');
      setTimeout(() => {
        setEditingEmployee(null);
        setEditSuccess('');
        fetchEmployees();
      }, 1000);
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Failed to update employee details');
    } finally {
      setEditLoading(false);
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

  const departmentsList = [
    'AIML',
    'Full Stack Development',
    'Data Science',
    'Product',
    'Human Resources',
    'Management',
    'Marketing'
  ];

  const deptOptions = [
    { 
      label: 'All Departments', 
      value: '', 
      badge: employees.length 
    },
    ...departmentsList.map(dept => {
      const count = employees.filter(e => e.department === dept).length;
      return {
        label: dept,
        value: dept,
        badge: count
      };
    })
  ];

  const shiftOptions = [
    { label: 'General Shift (09:00 - 18:00)', value: 'General Shift', desc: 'Standard 9 AM to 6 PM' },
    { label: 'Morning Shift (07:00 - 16:00)', value: 'Morning Shift', desc: 'Early 7 AM to 4 PM' },
    { label: 'Evening Shift (14:00 - 23:00)', value: 'Evening Shift', desc: 'Afternoon 2 PM to 11 PM' },
    ...shifts.filter(s => !['General Shift', 'Morning Shift', 'Evening Shift'].includes(s.name)).map(s => ({
      label: `${s.name} (${s.start_time} - ${s.end_time})`,
      value: s.name,
      desc: s.description || `${s.start_time} to ${s.end_time}`
    }))
  ];

  const roleOptions = [
    { label: 'Intern', value: 'Intern', desc: 'Attendance Only' },
    { label: 'Employee', value: 'Employee', desc: 'Regular Full-Time / Contract' },
    { label: 'HR', value: 'HR', desc: 'Reports & Leave Approvals' },
    { label: 'Admin', value: 'Admin', desc: 'Full System Control' },
  ];

  const employmentTypeOptions = [
    { label: 'Internship', value: 'Intern' },
    { label: 'Full-Time Employee', value: 'Full-Time' },
    { label: 'Contractor', value: 'Contract' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 animate-fadeIn font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Personnel Directory</span>
            <span className="text-xs text-slate-400">• Phase 2 Workforce</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">Staff & Intern Directory</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Manage employee access, assigned work shifts, department allocations, and biometric enrollment statuses
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={fetchEmployees}
            className="p-2.5 sm:p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-800 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/enroll"
            className="btn-primary flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-500/25 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" /> Enroll New Employee
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 glass-panel p-3.5 sm:p-4 rounded-3xl border border-slate-800 shadow-xl relative z-30">
        
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none transition shadow-inner"
          />
        </div>

        {/* Custom Department Filter */}
        <div className="w-full sm:w-72 relative z-40">
          <CustomSelect
            value={deptFilter}
            onChange={(val) => setDeptFilter(val)}
            options={deptOptions}
            placeholder="Filter by Department"
            icon={Filter}
            size="sm"
            isClearable={true}
          />
        </div>
      </div>

      {/* Directory Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[750px]">
            <thead className="bg-slate-950/80 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Employee</th>
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Role & Assigned Shift</th>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Biometric Status</th>
                <th className="px-5 py-4">Account</th>
                <th className="px-5 py-4 text-right">Actions</th>
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
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-amber-400 transition">{emp.name}</div>
                            <div className="text-[11px] text-slate-400">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-300 font-bold">{emp.employee_id}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-[11px] font-semibold text-slate-300 border border-slate-800 w-fit">
                            {emp.role} • {emp.employee_type}
                          </span>
                          <span className="text-[10px] text-amber-400/90 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {emp.shift_name || 'General Shift'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-300">{emp.department}</td>
                      <td className="px-5 py-4">
                        {emp.has_face_enrolled ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled (3D Vector)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3.5 h-3.5" /> Pending Biometrics
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          emp.status === 'Active' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-slate-400 bg-slate-800'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 rounded-xl transition border border-slate-800 cursor-pointer"
                          title="Edit Details & Shift"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleStatus(emp.id, emp.status)}
                          className="text-xs font-bold text-slate-400 hover:text-white transition ml-1 cursor-pointer"
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
                                alert(err.response?.data?.detail || 'Delete failed');
                              }
                            }
                          }}
                          className="text-xs font-bold text-rose-400 hover:text-rose-300 transition ml-2 cursor-pointer"
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

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-800 p-5 sm:p-8 space-y-4 sm:space-y-5 shadow-2xl animate-spring-in my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 sm:pb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-400" /> Edit Staff: {editingEmployee.name}
              </h2>
              <button onClick={() => setEditingEmployee(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {editSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{editSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-amber-400 shadow-inner"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="+91-..."
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-amber-400 shadow-inner"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomSelect
                  label="Department"
                  value={editFormData.department}
                  onChange={(val) => setEditFormData({ ...editFormData, department: val })}
                  options={departmentsList.map(d => ({ label: d, value: d }))}
                  icon={Building2}
                />

                <CustomSelect
                  label="Assigned Work Shift"
                  value={editFormData.shift_name}
                  onChange={(val) => setEditFormData({ ...editFormData, shift_name: val })}
                  options={shiftOptions}
                  icon={Clock}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomSelect
                  label="System Role"
                  value={editFormData.role}
                  onChange={(val) => setEditFormData({ ...editFormData, role: val })}
                  options={roleOptions}
                  icon={Shield}
                />

                <CustomSelect
                  label="Employment Type"
                  value={editFormData.employee_type}
                  onChange={(val) => setEditFormData({ ...editFormData, employee_type: val })}
                  options={employmentTypeOptions}
                  icon={Briefcase}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Designation</label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Senior Full Stack Engineer"
                    value={editFormData.designation}
                    onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-amber-400 shadow-inner"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-300 font-semibold">Reset Login Password</label>
                  <span className="text-[10px] text-slate-500">Leave blank to keep unchanged</span>
                </div>
                <input
                  type="password"
                  placeholder="Enter new password (optional)"
                  value={editFormData.password || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-amber-400 shadow-inner text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="btn-primary px-6 py-2.5 rounded-xl font-bold cursor-pointer"
                >
                  {editLoading ? 'Saving...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
