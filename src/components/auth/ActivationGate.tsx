import React, { useState, useRef, useEffect } from 'react';
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Cpu,
  Mail,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useI18n } from '../../locales';
import { APP_CONFIG } from '../../config/AppConfig';
import { computeSHA256 } from '../../services/security';
import obStudioLogo from '../../assets/LogoOBStudi512x512.png';

interface ActivationGateProps {
  onActivate: () => void;
}

export const ActivationGate: React.FC<ActivationGateProps> = ({ onActivate }) => {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleActivate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(false);

    try {
      // Compare cryptographically salted SHA-256 hash
      const inputHash = await computeSHA256(password);
      if (inputHash === APP_CONFIG.MASTER_PASSWORD_HASH) {
        localStorage.setItem('app_is_activated', 'true');

        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
        });

        setTimeout(() => {
          onActivate();
        }, 400);
      } else {
        setError(true);
        setShake(true);
        setIsSubmitting(false);
        setTimeout(() => setShake(false), 600);
      }
    } catch (err) {
      console.error('Password hash computation error:', err);
      setError(true);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-2xl overflow-hidden select-none animate-fadeIn">
      {/* Dynamic Ambient Background Glow Orbs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-indigo-600/25 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl pointer-events-none animate-pulse" />

      {/* Main Apple Glass Activation Modal Container */}
      <div
        className={`w-full max-w-md p-6 sm:p-8 rounded-3xl sm:rounded-4xl bg-gradient-to-b from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-indigo-500/30 shadow-2xl backdrop-blur-3xl text-center space-y-6 relative transition-transform ${
          shake ? 'animate-shake' : ''
        }`}
      >
        {/* Top Logo / Icon with Pulse Glow */}
        <div className="relative inline-block mx-auto">
          <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-md opacity-60 animate-pulse" />
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 flex items-center justify-center shadow-glass-glow mx-auto border border-white/20 overflow-hidden">
            <img
              src={obStudioLogo}
              alt="OBStudio Logo"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            {t('activation_title')}
          </h2>
          <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
            {t('activation_subtitle')}
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleActivate} className="space-y-4">
          <div className="space-y-1 text-left">
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <KeyRound className="w-4 h-4 text-indigo-400" />
              </div>

              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                placeholder={t('activation_password_placeholder')}
                className={`w-full pl-10 pr-11 py-3 rounded-2xl bg-black/40 border text-xs text-white placeholder-slate-500 outline-none transition-all ${
                  error
                    ? 'border-rose-500/80 ring-2 ring-rose-500/30'
                    : 'border-white/15 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40'
                }`}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-1.5 px-1 pt-1.5 text-[11px] font-bold text-rose-400">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>{t('activation_error')}</span>
              </div>
            )}
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={!password.trim() || isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 border border-indigo-400/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>{t('activation_button')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Developer Watermark & Credits */}
        <div className="pt-4 border-t border-white/10 flex flex-col items-center gap-1 text-[11px] text-slate-400">
          <a
            href="mailto:obgamestudio@gmail.com"
            className="hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            <Mail className="w-3 h-3 text-indigo-400" />
            <span>{t('activation_dev_watermark')}</span>
          </a>
          <span className="text-[10px] text-slate-500">
            {APP_CONFIG.APP_NAME} v{APP_CONFIG.APP_VERSION} • Desktop Edition
          </span>
        </div>
      </div>
    </div>
  );
};
