import React, { useState } from 'react';
import CameraFeed from '../components/CameraFeed';
import CustomSelect from '../components/CustomSelect';
import apiClient from '../api/client';
import { 
  UserPlus, 
  Camera, 
  CheckCircle, 
  AlertCircle, 
  Trash2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  User,
  CreditCard,
  Mail,
  Phone,
  Building2,
  Tag,
  Shield,
  Briefcase
} from 'lucide-react';

export default function Enrollment() {
  const [formData, setFormData] = useState({
    name: '',
    employee_id: '',
    email: '',
    phone: '',
    role: 'Intern',
    department: 'AIML',
    designation: 'AI Intern',
    employee_type: 'Intern',
    password: '',
    status: 'Active'
  });

  const [step, setStep] = useState(1);
  const [createdUserId, setCreatedUserId] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const departmentOptions = [
    { label: 'AIML', value: 'AIML', desc: 'Artificial Intelligence & Machine Learning' },
    { label: 'Full Stack Development', value: 'Full Stack Development', desc: 'Frontend, Backend & Web Systems' },
    { label: 'Data Science', value: 'Data Science', desc: 'Analytics & Big Data Engineering' },
    { label: 'Product', value: 'Product', desc: 'Product Strategy & UI/UX' },
    { label: 'Human Resources', value: 'Human Resources', desc: 'Talent & Workplace Operations' },
    { label: 'Management', value: 'Management', desc: 'Executive & Admin Leads' },
    { label: 'Marketing', value: 'Marketing', desc: 'Growth & Communications' },
  ];

  const roleOptions = [
    { label: 'Intern', value: 'Intern', desc: 'Biometric Kiosk Scan Attendance Only' },
    { label: 'Employee', value: 'Employee', desc: 'Regular Full-Time / Contract Staff' },
    { label: 'HR', value: 'HR', desc: 'Dashboard Reports & Attendance Management' },
    { label: 'Admin', value: 'Admin', desc: 'Full System Control & User Management' },
  ];

  const employmentTypeOptions = [
    { label: 'Internship', value: 'Intern' },
    { label: 'Full-Time Employee', value: 'Full-Time' },
    { label: 'Contractor', value: 'Contract' },
  ];

  const angleLabels = [
    { title: 'Front Facing', desc: 'Look directly at camera' },
    { title: 'Slight Left', desc: 'Turn head gently left' },
    { title: 'Slight Right', desc: 'Turn head gently right' },
    { title: 'Neutral / Smile', desc: 'Natural facial expression' },
  ];

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.post('/users/', formData);
      setCreatedUserId(res.data.user_id);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to register employee');
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureAngle = (base64Img) => {
    if (capturedImages.length < 4) {
      setCapturedImages((prev) => [...prev, base64Img]);
    }
  };

  const handleEnrollFaces = async () => {
    if (!consentGiven) {
      setError('Explicit biometric consent is required under DPDP Act 2023.');
      return;
    }
    if (capturedImages.length < 3) {
      setError('Please capture at least 3 multi-angle face samples.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/users/enroll-face', {
        user_id: createdUserId,
        face_images: capturedImages,
        consent_given: true,
        consent_timestamp: new Date().toISOString()
      });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process biometric embeddings');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      employee_id: '',
      email: '',
      phone: '',
      role: 'Intern',
      department: 'AIML',
      designation: 'AI Intern',
      employee_type: 'Intern',
      password: '',
      status: 'Active'
    });
    setStep(1);
    setCreatedUserId(null);
    setCapturedImages([]);
    setConsentGiven(false);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 animate-fadeIn">
      
      {/* Title & Stepper Progress Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> Biometric Onboarding Wizard
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Employee Face Enrollment</h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
          Register personnel profile and capture multi-angle 3D vector embeddings with DPDP Act compliance.
        </p>

        {/* Visual Stepper */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 pt-4 max-w-md mx-auto">
          <div className={`flex items-center gap-2 text-xs font-bold ${step >= 1 ? 'text-amber-400' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step >= 1 ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/30' : 'bg-slate-800 text-slate-400'}`}>1</span>
            <span>Profile</span>
          </div>
          <div className={`h-0.5 w-8 sm:w-12 ${step >= 2 ? 'bg-amber-400' : 'bg-slate-800'}`} />
          <div className={`flex items-center gap-2 text-xs font-bold ${step >= 2 ? 'text-amber-400' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step >= 2 ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/30' : 'bg-slate-800 text-slate-400'}`}>2</span>
            <span>Face Capture</span>
          </div>
          <div className={`h-0.5 w-8 sm:w-12 ${step >= 3 ? 'bg-amber-400' : 'bg-slate-800'}`} />
          <div className={`flex items-center gap-2 text-xs font-bold ${step === 3 ? 'text-emerald-400' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step === 3 ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>3</span>
            <span>Active</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-400 text-xs sm:text-sm animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: EMPLOYEE PROFILE FORM */}
      {step === 1 && (
        <form onSubmit={handleCreateUser} className="glass-panel rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 border border-slate-800 animate-scale-up">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Step 1: Employee Personnel Information</h2>
              <p className="text-xs text-slate-400">Enter general staff credentials and system role</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Enter employee full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none transition shadow-inner"
                />
              </div>
            </div>

            {/* Employee ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Employee / Intern ID *</label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. WI101"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none uppercase font-mono transition shadow-inner"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Official Email *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="employee@weintern.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none transition shadow-inner"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="+91-9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none transition shadow-inner"
                />
              </div>
            </div>

            {/* Custom Department Dropdown */}
            <CustomSelect
              label="Department"
              value={formData.department}
              onChange={(val) => setFormData({ ...formData, department: val })}
              options={departmentOptions}
              icon={Building2}
            />

            {/* Designation */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Designation</label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. AI Engineering Intern"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none transition shadow-inner"
                />
              </div>
            </div>

            {/* Custom System Role Dropdown */}
            <CustomSelect
              label="System Role"
              value={formData.role}
              onChange={(val) => setFormData({ ...formData, role: val })}
              options={roleOptions}
              icon={Shield}
            />

            {/* Custom Employment Type Dropdown */}
            <CustomSelect
              label="Employment Type"
              value={formData.employee_type}
              onChange={(val) => setFormData({ ...formData, employee_type: val })}
              options={employmentTypeOptions}
              icon={Briefcase}
            />

            {/* Password input for Admin/HR */}
            {(formData.role === 'Admin' || formData.role === 'HR') && (
              <div className="sm:col-span-2 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2 animate-fadeIn">
                <label className="block text-xs font-bold text-amber-400">
                  Set Dashboard Login Password (Required for Admin/HR)
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter login password for this admin/HR"
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-amber-400/40 rounded-xl text-xs sm:text-sm text-white focus:border-amber-400 focus:outline-none shadow-inner"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 hover:from-amber-400 hover:to-yellow-200 text-slate-950 font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-500/25 transition hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              {loading ? 'Creating Record...' : 'Proceed to Face Capture'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: MULTI-ANGLE FACE CAPTURE */}
      {step === 2 && (
        <div className="glass-panel rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 border border-slate-800 animate-scale-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Step 2: Multi-Angle Face Biometrics</h2>
                <p className="text-xs text-slate-400">Capturing for: <strong className="text-amber-400">{formData.name}</strong> ({formData.employee_id})</p>
              </div>
            </div>
            <div className="self-start sm:self-auto text-xs font-bold text-amber-400 px-3.5 py-1.5 bg-amber-400/10 border border-amber-400/30 rounded-full">
              {capturedImages.length} / 4 Samples Captured
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-7">
              <CameraFeed isScanning={false} />
            </div>

            <div className="md:col-span-5 space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-inner">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Multi-Angle Sequence:</h4>
                <div className="space-y-2">
                  {angleLabels.map((angle, idx) => {
                    const isDone = capturedImages.length > idx;
                    const isCurrent = capturedImages.length === idx;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs transition ${
                          isDone
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold'
                            : isCurrent
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 font-extrabold shadow-sm'
                            : 'bg-slate-900/40 border-slate-800/80 text-slate-400'
                        }`}
                      >
                        <div>
                          <div>{idx + 1}. {angle.title}</div>
                          <div className="text-[10px] opacity-75">{angle.desc}</div>
                        </div>
                        {isDone && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sample Thumbnails Preview */}
              {capturedImages.length > 0 && (
                <div className="flex gap-2 items-center overflow-x-auto pb-1">
                  {capturedImages.map((img, i) => (
                    <div key={i} className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-400 shadow-md shrink-0">
                      <img src={img} alt={`Sample ${i}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <button
                    onClick={() => setCapturedImages([])}
                    title="Clear Samples"
                    className="p-3 text-slate-400 hover:text-rose-400 bg-slate-950 border border-slate-800 rounded-xl shrink-0 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl shadow-inner">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="consentCheck"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
              <label htmlFor="consentCheck" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
                <strong>Explicit DPDP Act 2023 Consent:</strong> I confirm informed consent for biometric vector extraction strictly for workplace attendance. Raw camera frames will not be retained.
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700 transition"
            >
              ← Back to Details
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              {capturedImages.length < 4 && (
                <button
                  type="button"
                  onClick={() => {
                    const canvas = document.querySelector('canvas');
                    const video = document.querySelector('video');
                    if (video && canvas) {
                      canvas.width = video.videoWidth || 640;
                      canvas.height = video.videoHeight || 480;
                      const ctx = canvas.getContext('2d');
                      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                      handleCaptureAngle(canvas.toDataURL('image/jpeg', 0.85));
                    }
                  }}
                  className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-2 shadow-md"
                >
                  <Camera className="w-4 h-4 text-amber-400" /> Capture Angle #{capturedImages.length + 1}
                </button>
              )}

              <button
                type="button"
                disabled={loading || capturedImages.length < 3 || !consentGiven}
                onClick={handleEnrollFaces}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-yellow-300 disabled:opacity-50 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/25 transition hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                {loading ? 'Saving Vectors...' : 'Finalize & Save Embeddings ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS STATE */}
      {step === 3 && (
        <div className="glass-panel border border-emerald-500/30 rounded-3xl p-8 sm:p-12 text-center shadow-2xl space-y-6 animate-scale-up">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-tr from-emerald-500/20 to-emerald-400/10 border-2 border-emerald-400 rounded-3xl flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
            <CheckCircle className="w-12 h-12 sm:w-14 sm:h-14" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Enrollment Completed!</h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-md mx-auto">
              Biometric embeddings for <strong className="text-amber-400">{formData.name}</strong> ({formData.employee_id}) are active and ready for Kiosk scanning.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={resetForm}
              className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-2xl transition"
            >
              + Enroll Another Staff
            </button>
            <a
              href="/kiosk"
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-slate-950 text-xs font-extrabold rounded-2xl transition shadow-lg shadow-amber-500/25 hover:scale-105"
            >
              Test at Live Kiosk →
            </a>
          </div>
        </div>
      )}

    </div>
  );
}
