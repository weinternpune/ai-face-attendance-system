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
  Briefcase,
  Clock
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
    shift_name: 'General Shift',
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
    { label: 'Human Resources', value: 'Human Resources', desc: 'Talent & Workplace Ops' },
    { label: 'Management', value: 'Management', desc: 'Executive & Strategic Operations' },
    { label: 'Marketing', value: 'Marketing', desc: 'Growth & Developer Relations' },
  ];

  const roleOptions = [
    { label: 'Intern', value: 'Intern', desc: 'Standard Attendance & Profile Access' },
    { label: 'Employee', value: 'Employee', desc: 'Staff Member' },
    { label: 'HR', value: 'HR', desc: 'Review Leaves & Download Reports' },
    { label: 'Admin', value: 'Admin', desc: 'Full System Control & Configuration' },
  ];

  const employmentTypeOptions = [
    { label: 'Internship', value: 'Intern' },
    { label: 'Full-Time Employee', value: 'Full-Time' },
    { label: 'Contractor', value: 'Contract' },
  ];

  const shiftOptions = [
    { label: 'General Shift (09:00 - 18:00)', value: 'General Shift', desc: 'Standard 9 AM to 6 PM' },
    { label: 'Morning Shift (07:00 - 16:00)', value: 'Morning Shift', desc: 'Early 7 AM to 4 PM' },
    { label: 'Evening Shift (14:00 - 23:00)', value: 'Evening Shift', desc: 'Afternoon 2 PM to 11 PM' },
  ];

  const angleLabels = [
    { title: 'Straight Looking Center', desc: 'Keep head aligned directly with camera' },
    { title: 'Slight Turn Left (15°)', desc: 'Turn head slightly towards the left side' },
    { title: 'Slight Turn Right (15°)', desc: 'Turn head slightly towards the right side' },
    { title: 'Slight Tilt Up / Down', desc: 'Natural slight vertical tilt for lighting robustness' },
  ];

  // STEP 1: CREATE USER
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.post('/users/', formData);
      setCreatedUserId(res.data.id);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to register employee');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: CAPTURE PHOTO SAMPLE
  const handleCaptureSample = () => {
    const video = document.querySelector('video');
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.85);

    setCapturedImages((prev) => [...prev, base64]);
  };

  // STEP 3: SUBMIT MULTI-SAMPLE ENROLLMENT
  const handleSubmitEnrollment = async () => {
    if (!consentGiven) {
      setError('DPDP biometric consent agreement must be checked before submitting.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await apiClient.post(`/users/${createdUserId}/enroll-face`, {
        images_base64: capturedImages,
        dpdp_consent: consentGiven
      });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || 'Face enrollment failed. Ensure face is clear without glare.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 animate-fadeIn font-sans">
      
      {/* Step Indicators */}
      <div className="glass-panel rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between max-w-xl mx-auto text-xs sm:text-sm font-bold">
          
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
              step >= 1 ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-500'
            }`}>
              1
            </div>
            <span className={step >= 1 ? 'text-white' : 'text-slate-500'}>Profile Info</span>
          </div>

          <div className={`h-0.5 flex-1 mx-3 sm:mx-4 ${step >= 2 ? 'bg-amber-400' : 'bg-slate-800'}`} />

          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
              step >= 2 ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-500'
            }`}>
              2
            </div>
            <span className={step >= 2 ? 'text-white' : 'text-slate-500'}>Face Vectors</span>
          </div>

          <div className={`h-0.5 flex-1 mx-3 sm:mx-4 ${step === 3 ? 'bg-amber-400' : 'bg-slate-800'}`} />

          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
              step === 3 ? 'bg-emerald-400 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-500'
            }`}>
              3
            </div>
            <span className={step === 3 ? 'text-emerald-400' : 'text-slate-500'}>Complete</span>
          </div>

        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: METADATA PROFILE */}
      {step === 1 && (
        <form onSubmit={handleCreateUser} className="glass-panel rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Step 1: Employee Personnel Profile</h2>
              <p className="text-slate-400 text-xs mt-0.5">Enter identification, departmental allocation, and shift rules</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none transition shadow-inner"
                />
              </div>
            </div>

            {/* Employee ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Employee ID *</label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. WI101"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value.toUpperCase() })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none transition font-mono shadow-inner"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="john@weintern.com"
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
                  type="text"
                  placeholder="+91-..."
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

            {/* Custom Shift Assignment Dropdown */}
            <CustomSelect
              label="Assigned Shift"
              value={formData.shift_name}
              onChange={(val) => setFormData({ ...formData, shift_name: val })}
              options={shiftOptions}
              icon={Clock}
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
              className="btn-primary w-full sm:w-auto px-7 py-3.5 text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
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
                    className="p-3 text-slate-400 hover:text-rose-400 bg-slate-950 border border-slate-800 rounded-xl shrink-0 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Capture Button */}
              {capturedImages.length < 4 ? (
                <button
                  type="button"
                  onClick={handleCaptureSample}
                  className="btn-primary w-full py-3.5 text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25"
                >
                  <Camera className="w-4 h-4" /> Capture Angle #{capturedImages.length + 1}
                </button>
              ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center text-xs text-emerald-400 font-bold">
                  ✓ All 4 biometric angles captured successfully!
                </div>
              )}

              {/* DPDP Consent */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 text-slate-300 text-xs cursor-pointer p-3 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-amber-400 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-slate-400">
                    I confirm employee consent for facial template embedding vector storage under DPDP Act & IT Security guidelines.
                  </span>
                </label>
              </div>

              <div className="pt-3 flex justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={capturedImages.length < 3 || !consentGiven || loading}
                  onClick={handleSubmitEnrollment}
                  className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Extracting Vector Embeddings...' : 'Generate 3D Biometric Vector'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: ENROLLMENT SUCCESS */}
      {step === 3 && (
        <div className="glass-panel rounded-3xl p-8 sm:p-12 shadow-2xl text-center space-y-6 border border-emerald-500/30 animate-scale-up">
          <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-8 h-8 stroke-[2.5]" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-2xl font-black text-white">Biometric Profile Successfully Enrolled!</h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Employee <strong className="text-white">{formData.name}</strong> ({formData.employee_id}) has been assigned to <strong className="text-amber-400">{formData.shift_name}</strong> and can now instantly punch in at the Kiosk.
            </p>
          </div>

          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={() => {
                setStep(1);
                setCapturedImages([]);
                setFormData({
                  name: '',
                  employee_id: '',
                  email: '',
                  phone: '',
                  role: 'Intern',
                  department: 'AIML',
                  designation: 'AI Intern',
                  employee_type: 'Intern',
                  shift_name: 'General Shift',
                  password: '',
                  status: 'Active'
                });
              }}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm rounded-2xl border border-slate-700 transition cursor-pointer"
            >
              Enroll Another Staff
            </button>
            <a
              href="/kiosk"
              className="btn-primary px-7 py-3 text-xs sm:text-sm rounded-2xl font-bold cursor-pointer"
            >
              Go to Live Kiosk
            </a>
          </div>
        </div>
      )}

    </div>
  );
}
