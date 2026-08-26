import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import CustomSelect from '../components/CustomSelect';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Plus, 
  Filter, 
  Search,
  User,
  FileText,
  Check,
  X,
  Sparkles,
  RefreshCw,
  Layers,
  ChevronRight,
  CalendarOff
} from 'lucide-react';

export default function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [actionModalLeave, setActionModalLeave] = useState(null);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    employee_id: '',
    employee_name: '',
    leave_type: 'Casual Leave',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
    is_half_day: false
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const leaveTypeOptions = [
    { label: 'Casual Leave', value: 'Casual Leave', desc: 'Standard personal / unplanned leave' },
    { label: 'Sick Leave', value: 'Sick Leave', desc: 'Medical / health-related leave' },
    { label: 'Work From Home', value: 'Work From Home', desc: 'Remote working authorization' },
    { label: 'Attendance Regularization', value: 'Attendance Regularization', desc: 'Correction for missed biometric punch' },
    { label: 'Other', value: 'Other', desc: 'Special or unlisted circumstances' },
  ];

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'All' ? '/leaves' : `/leaves?status_filter=${statusFilter}`;
      const response = await apiClient.get(url);
      setLeaves(response.data);
    } catch (err) {
      console.error('Failed to fetch leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [statusFilter]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.employee_id.trim() || !formData.reason.trim()) {
      setFormError('Please fill in employee ID and reason.');
      return;
    }

    try {
      await apiClient.post('/leaves/apply', formData);
      setFormSuccess('Leave request submitted successfully!');
      setTimeout(() => {
        setShowApplyModal(false);
        setFormSuccess('');
        setFormData({
          employee_id: '',
          employee_name: '',
          leave_type: 'Casual Leave',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          reason: '',
          is_half_day: false
        });
        fetchLeaves();
      }, 1000);
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to submit leave request');
    }
  };

  const handleReviewLeave = async (status) => {
    if (!actionModalLeave) return;
    setSubmittingAction(true);
    try {
      await apiClient.patch(`/leaves/${actionModalLeave.id}/action`, {
        status: status,
        admin_remarks: adminRemarks || undefined
      });
      setActionModalLeave(null);
      setAdminRemarks('');
      fetchLeaves();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to process leave action');
    } finally {
      setSubmittingAction(false);
    }
  };

  const pendingCount = leaves.filter(l => l.status === 'Pending').length;
  const approvedCount = leaves.filter(l => l.status === 'Approved').length;
  const rejectedCount = leaves.filter(l => l.status === 'Rejected').length;

  const filteredLeaves = leaves.filter(l => {
    const term = searchTerm.toLowerCase();
    return (
      l.employee_name?.toLowerCase().includes(term) ||
      l.employee_id?.toLowerCase().includes(term) ||
      l.leave_type?.toLowerCase().includes(term) ||
      l.reason?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 animate-fadeIn font-sans">
      
      {/* Header Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
              Phase 2 Enterprise
            </span>
            <span className="text-slate-400 text-xs">• HR Workflow</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white mt-1 tracking-tight">
            Leave & Regularization Management
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Review employee time-off requests, attendance regularizations & 1-click approvals
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={fetchLeaves}
            className="p-2.5 sm:p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-800 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowApplyModal(true)}
            className="btn-primary flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm flex items-center justify-center gap-2 rounded-2xl shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Apply Leave / Request
          </button>
        </div>
      </div>

      {/* Stats Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-panel card-hover p-4 sm:p-5 rounded-2xl border border-slate-800">
          <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Requests</p>
          <p className="text-xl sm:text-3xl font-black text-white mt-1">{leaves.length}</p>
        </div>

        <div className="glass-panel card-hover p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] sm:text-xs font-bold text-amber-400 uppercase tracking-wider">Pending Review</p>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
          </div>
          <p className="text-xl sm:text-3xl font-black text-amber-400 mt-1">{pendingCount}</p>
        </div>

        <div className="glass-panel card-hover p-4 sm:p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] sm:text-xs font-bold text-emerald-400 uppercase tracking-wider">Approved</p>
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
          </div>
          <p className="text-xl sm:text-3xl font-black text-emerald-400 mt-1">{approvedCount}</p>
        </div>

        <div className="glass-panel card-hover p-4 sm:p-5 rounded-2xl border border-rose-500/30 bg-rose-500/5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] sm:text-xs font-bold text-rose-400 uppercase tracking-wider">Rejected</p>
            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
          </div>
          <p className="text-xl sm:text-3xl font-black text-rose-400 mt-1">{rejectedCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 glass-panel p-3 sm:p-4 rounded-2xl border border-slate-800">
        
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {['All', 'Pending', 'Approved', 'Rejected'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === tab
                  ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search employee or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 shadow-inner"
          />
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="glass-panel rounded-3xl border border-slate-800/80 overflow-hidden shadow-xl animate-fade-slide-up">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm min-w-[650px]">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px] sm:text-[11px]">
              <tr>
                <th className="px-5 py-4">Employee</th>
                <th className="px-5 py-4">Leave Type</th>
                <th className="px-5 py-4">Dates / Duration</th>
                <th className="px-5 py-4">Reason</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full mb-2" />
                    <p className="font-medium">Loading leave applications...</p>
                  </td>
                </tr>
              ) : filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-slate-500">
                    <FileText className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-400">No leave requests found</p>
                    <p className="text-xs text-slate-600 mt-0.5">Requests submitted by employees will show up here.</p>
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-900/40 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-400 font-bold flex items-center justify-center border border-amber-400/20 shrink-0">
                          {leave.employee_name?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <p className="font-bold text-white">{leave.employee_name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{leave.employee_id} • {leave.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300">
                        {leave.leave_type}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white font-mono text-xs">
                        {leave.start_date} {leave.start_date !== leave.end_date ? `to ${leave.end_date}` : ''}
                      </p>
                      {leave.is_half_day && (
                        <span className="text-[10px] text-amber-400/80 font-bold uppercase">(Half Day)</span>
                      )}
                    </td>
                    <td className="px-5 py-4 max-w-xs truncate text-slate-300 font-medium" title={leave.reason}>
                      {leave.reason}
                    </td>
                    <td className="px-5 py-4">
                      {leave.status === 'Pending' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                      {leave.status === 'Approved' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/30">
                          <Check className="w-3 h-3" /> Approved
                        </span>
                      )}
                      {leave.status === 'Rejected' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-400/10 text-rose-400 border border-rose-400/30">
                          <X className="w-3 h-3" /> Rejected
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {leave.status === 'Pending' ? (
                        <button
                          onClick={() => setActionModalLeave(leave)}
                          className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow transition cursor-pointer"
                        >
                          Review
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">
                          {leave.approved_by ? `By ${leave.approved_by}` : 'Closed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-800 p-5 sm:p-8 space-y-4 sm:space-y-5 shadow-2xl animate-spring-in my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 sm:pb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" /> Apply Leave / Regularization
              </h2>
              <button onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleApplyLeave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Employee ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP101"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-amber-400 font-mono shadow-inner"
                  />
                </div>

                <CustomSelect
                  label="Leave Type *"
                  value={formData.leave_type}
                  onChange={(val) => setFormData({ ...formData, leave_type: val })}
                  options={leaveTypeOptions}
                  icon={Calendar}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-amber-400 shadow-inner font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-amber-400 shadow-inner font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="half_day"
                  checked={formData.is_half_day}
                  onChange={(e) => setFormData({ ...formData, is_half_day: e.target.checked })}
                  className="rounded border-slate-700 text-amber-400 focus:ring-0 w-4 h-4 bg-slate-950 cursor-pointer"
                />
                <label htmlFor="half_day" className="text-slate-300 text-xs font-medium cursor-pointer">
                  Is Half Day Leave?
                </label>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Reason / Notes *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Provide reason for time-off or why attendance was missed..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-amber-400 shadow-inner"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-6 py-2.5 rounded-xl font-bold cursor-pointer"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {actionModalLeave && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 w-full max-w-md rounded-3xl border border-slate-800 p-5 sm:p-6 space-y-4 shadow-2xl animate-spring-in my-auto">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" /> Review Leave Request
            </h3>
            
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
              <p className="text-slate-400">Employee: <strong className="text-white">{actionModalLeave.employee_name} ({actionModalLeave.employee_id})</strong></p>
              <p className="text-slate-400">Type: <strong className="text-amber-400">{actionModalLeave.leave_type}</strong></p>
              <p className="text-slate-400">Duration: <span className="font-mono text-white">{actionModalLeave.start_date} to {actionModalLeave.end_date}</span></p>
              <p className="text-slate-400">Reason: <span className="text-slate-200">{actionModalLeave.reason}</span></p>
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-1.5">Admin Remarks (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Approved as per casual quota"
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 shadow-inner"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActionModalLeave(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={() => handleReviewLeave('Rejected')}
                  className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={() => handleReviewLeave('Approved')}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-xl transition shadow cursor-pointer"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
