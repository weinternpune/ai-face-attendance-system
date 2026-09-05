import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { 
  User, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone, 
  ScanFace, 
  CalendarDays, 
  Send, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw,
  Plus,
  X,
  Building2,
  Zap,
  ArrowRight,
  Lock,
  Key
} from 'lucide-react';
import { Link } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';

export default function EmployeePortal() {
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leavesData, setLeavesData] = useState({ leaves: [], balances: {} });
  const [loading, setLoading] = useState(true);

  // Leave Modal
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Change Password Modal
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      const [profileRes, attRes, leavesRes] = await Promise.all([
        apiClient.get('/users/me/profile'),
        apiClient.get('/users/me/attendance'),
        apiClient.get('/users/me/leaves')
      ]);
      setProfile(profileRes.data);
      setAttendance(attRes.data);
      setLeavesData(leavesRes.data);
    } catch (err) {
      console.error('Failed to load employee portal:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, []);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!profile) return;
    setSubmittingLeave(true);
    try {
      await apiClient.post('/leaves/apply', {
        employee_id: profile.employee_id,
        employee_name: profile.name,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
        is_half_day: isHalfDay
      });
      setApplyModalOpen(false);
      setReason('');
      fetchPortalData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit leave request');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters.');
      return;
    }

    setPwdLoading(true);
    try {
      await apiClient.post('/users/me/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      setPwdSuccess('Password changed successfully! You can use your new password next time.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordModalOpen(false);
        setPwdSuccess('');
      }, 1500);
    } catch (err) {
      setPwdError(err.response?.data?.detail || 'Failed to update password.');
    } finally {
      setPwdLoading(false);
    }
  };

  const totalPresent = attendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const totalLate = attendance.filter(a => a.status === 'Late').length;
  const totalHours = attendance.reduce((acc, a) => acc + (a.working_hours || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 animate-fadeIn font-sans">
      
      {/* Welcome Header */}
      <div className="glass-panel p-5 sm:p-7 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-400/5 border border-amber-400/30 flex items-center justify-center text-amber-400 font-black text-xl shrink-0 shadow-lg">
            {profile?.name ? profile.name.charAt(0) : <User className="w-7 h-7" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                {profile?.role || 'Employee'} Self-Service
              </span>
              <span className="text-xs text-slate-400 font-mono">• {profile?.employee_id}</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight mt-0.5">
              Welcome back, {profile?.name || 'Employee'}!
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              {profile?.designation} • {profile?.department} • Assigned to <strong className="text-white">{profile?.shift_name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          <button
            onClick={fetchPortalData}
            title="Refresh Data"
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-800 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={() => {
              setPwdError('');
              setPwdSuccess('');
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setPasswordModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 sm:py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-2xl border border-slate-800 text-xs sm:text-sm font-semibold transition cursor-pointer"
          >
            <Key className="w-4 h-4 text-amber-400" /> Change Password
          </button>
          
          <Link
            to="/mobile-checkin"
            className="btn-primary flex items-center gap-2 px-4 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-amber-500/20"
          >
            <Smartphone className="w-4 h-4" /> Quick Mobile Check-In
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-slide-up">
        
        <div className="glass-panel card-hover p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 hover:border-emerald-400/60 space-y-1.5 shadow-xl">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400">Total Check-Ins</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">{totalPresent} Days</div>
          <p className="text-[10px] text-emerald-400/80">Logged in this cycle</p>
        </div>

        <div className="glass-panel card-hover p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 hover:border-amber-400/60 space-y-1.5 shadow-xl">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400">Late Check-Ins</span>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">{totalLate} Days</div>
          <p className="text-[10px] text-amber-400/80">After grace period</p>
        </div>

        <div className="glass-panel card-hover p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/30 hover:border-cyan-400/60 space-y-1.5 shadow-xl">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-400">Productive Hours</span>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400">{roundHours(totalHours)} hrs</div>
          <p className="text-[10px] text-cyan-400/80">Total working time</p>
        </div>

        <div className="glass-panel card-hover p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/30 hover:border-purple-400/60 space-y-1.5 shadow-xl">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-purple-400">Biometric Face</span>
          <div className="text-sm sm:text-base font-black text-white flex items-center gap-1.5 mt-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            {profile?.has_enrolled_face ? 'Face Enrolled' : 'Not Enrolled'}
          </div>
          <p className="text-[10px] text-purple-400/80">
            {profile?.has_enrolled_face ? 'DPDP Compliant (Active)' : 'Action required'}
          </p>
        </div>
      </div>

      {/* Leave Balances & Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Leave Balances Card */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-amber-400" /> Leave Balances & Entitlement
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Your annual credited time-off allocations</p>
            </div>
            <button
              onClick={() => setApplyModalOpen(true)}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Apply Leave
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            
            {/* Casual Leave */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">Casual Leave (CL)</span>
              <div className="text-xl font-black text-white">
                {leavesData?.balances?.casual_leave?.remaining ?? 12} <span className="text-xs font-normal text-slate-400">/ 12 left</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-2">
                <div 
                  className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${((leavesData?.balances?.casual_leave?.remaining ?? 12) / 12) * 100}%` }}
                />
              </div>
            </div>

            {/* Sick Leave */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">Sick Leave (SL)</span>
              <div className="text-xl font-black text-white">
                {leavesData?.balances?.sick_leave?.remaining ?? 10} <span className="text-xs font-normal text-slate-400">/ 10 left</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-2">
                <div 
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${((leavesData?.balances?.sick_leave?.remaining ?? 10) / 10) * 100}%` }}
                />
              </div>
            </div>

            {/* Paid Leave */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">Paid Annual Leave (PL)</span>
              <div className="text-xl font-black text-white">
                {leavesData?.balances?.paid_leave?.remaining ?? 15} <span className="text-xs font-normal text-slate-400">/ 15 left</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-2">
                <div 
                  className="bg-cyan-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${((leavesData?.balances?.paid_leave?.remaining ?? 15) / 15) * 100}%` }}
                />
              </div>
            </div>

          </div>
        </div>

        {/* Quick Help / Geofence Status */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between space-y-3">
          <div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
              Remote / Field Attendance
            </span>
            <h3 className="text-base font-bold text-white mt-1">Mobile Geofence Check-In</h3>
            <p className="text-xs text-slate-400 mt-1">
              If working from an authorized client site or field location, use your mobile browser to punch attendance with GPS coordinates.
            </p>
          </div>

          <Link
            to="/mobile-checkin"
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl border border-slate-800 text-xs font-bold transition flex items-center justify-center gap-2 group"
          >
            <span>Open Mobile Punch Camera</span>
            <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition" />
          </Link>
        </div>

      </div>

      {/* Attendance Punch History Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> Recent Attendance & Punch History
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Your verified biometric punch logs</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 min-w-[650px]">
            <thead className="bg-slate-950/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">In Time</th>
                <th className="px-6 py-3.5">Out Time</th>
                <th className="px-6 py-3.5">Duration</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Verification Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-400">
                    No attendance punch records found yet.
                  </td>
                </tr>
              ) : (
                attendance.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-850/60 transition">
                    <td className="px-6 py-4 font-mono font-bold text-white">{rec.date}</td>
                    <td className="px-6 py-4 font-mono text-emerald-400 font-semibold">{rec.entry_time}</td>
                    <td className="px-6 py-4 font-mono text-slate-300">{rec.exit_time || '—'}</td>
                    <td className="px-6 py-4 font-mono font-bold text-white">
                      {rec.working_hours > 0 ? (
                        <span className="text-white font-mono">{rec.working_hours} hrs</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" /> Shift In Progress
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                        rec.status === 'Present'
                          ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                          : rec.status === 'Late'
                          ? 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                          : 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20'
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-[11px]">
                      {rec.verification_mode || 'KIOSK'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* My Leave Applications & Approval Status Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-hidden space-y-0">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-amber-400" /> My Leave Requests & Live Approval Status
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Track whether HR/Admin has Approved, Rejected, or is Reviewing your time-off</p>
          </div>
          <button
            onClick={() => setApplyModalOpen(true)}
            className="btn-primary flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> New Request
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 min-w-[650px]">
            <thead className="bg-slate-950/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Dates / Period</th>
                <th className="px-6 py-3.5">Reason</th>
                <th className="px-6 py-3.5">Approval Status</th>
                <th className="px-6 py-3.5">HR / Admin Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {!leavesData?.leaves || leavesData.leaves.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                    No leave applications submitted yet. Click "New Request" above to apply.
                  </td>
                </tr>
              ) : (
                leavesData.leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-850/60 transition">
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      {l.leave_type}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-200">
                      {l.start_date} <span className="text-slate-500">→</span> {l.end_date}
                    </td>
                    <td className="px-6 py-4 text-slate-300 max-w-xs truncate" title={l.reason}>
                      {l.reason}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold border ${
                        l.status === 'Approved'
                          ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30'
                          : l.status === 'Rejected'
                          ? 'bg-rose-400/10 text-rose-400 border-rose-400/30'
                          : 'bg-amber-400/10 text-amber-400 border-amber-400/30 animate-pulse'
                      }`}>
                        {l.status === 'Approved' ? '✅ Approved' : l.status === 'Rejected' ? '❌ Rejected' : '⏳ Pending Review'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs italic">
                      {l.admin_remarks || (l.status === 'Pending' ? 'Under Review' : '—')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center border border-amber-400/20">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-white">Apply for Time Off / Leave</h3>
              </div>
              <button
                onClick={() => setApplyModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <CustomSelect
                  label="Leave Category *"
                  value={leaveType}
                  onChange={(val) => setLeaveType(val)}
                  options={[
                    { label: 'Casual Leave (CL)', value: 'Casual Leave', desc: 'Standard casual personal leave (Max 12 days/yr)' },
                    { label: 'Sick Leave (SL)', value: 'Sick Leave', desc: 'Medical and health-related leave (Max 10 days/yr)' },
                    { label: 'Paid Annual Leave (PL)', value: 'Paid Leave', desc: 'Planned earned annual vacation (Max 15 days/yr)' },
                    { label: 'Unpaid Leave (LWP)', value: 'Unpaid Leave', desc: 'Leave without pay authorization' }
                  ]}
                  icon={CalendarDays}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Leave *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Explain reason for leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="portal_halfday"
                  checked={isHalfDay}
                  onChange={(e) => setIsHalfDay(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-400 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="portal_halfday" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Half-day leave request
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="btn-primary px-6 py-2 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {submittingLeave ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Change Login Password</h3>
                  <p className="text-[11px] text-slate-400">Update your personal portal account password</p>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pwdError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pwdError}</span>
              </div>
            )}

            {pwdSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{pwdSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Current Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 shadow-inner"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="btn-primary px-6 py-2 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {pwdLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function roundHours(val) {
  return Math.round((val || 0) * 10) / 10;
}
