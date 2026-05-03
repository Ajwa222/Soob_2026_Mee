/**
 * Sign-in modal — design variations (login-first hierarchy).
 *
 * The brief: the modal assumes the user already has an account and asks
 * them to log in. Sign-up is a small "don't have an account?" link below.
 * Google sign-in lives at the bottom as the alternative path, not the
 * primary one.
 *
 * Reply with the letter to lock the chosen variant into PlanDetailPage.
 */
import { ArrowRight, ArrowLeft, LogIn, Mail, Phone, ShieldCheck, UserPlus } from 'lucide-react';

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.94H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.06l3.01-2.34z" fill="#FBBC05"/>
      <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function ModalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative max-w-md mx-auto rounded-2xl bg-card border border-border shadow-xl overflow-hidden">
      {children}
    </div>
  );
}

function VariantHeader({ letter, label }: { letter: string; label: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <span className="font-heading font-bold text-3xl text-[var(--ob-cta)]">{letter}</span>
      <span className="font-mono text-[11px] uppercase tracking-widest text-foreground/60">{label}</span>
    </div>
  );
}

export default function AuthVariations() {
  return (
    <div className="safe-pb">
      <section className="relative overflow-hidden page-hero border-b border-border">
        <div className="relative z-[2] max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-7">
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground tracking-tight leading-tight">
            Sign-in Modal — Login-first
          </h1>
          <p className="text-foreground/65 mt-1 text-sm md:text-base">
            All four assume the user has an account. Sign-up is a small link, Google is at the bottom. Pick a letter.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 flex flex-col gap-12 md:gap-16">

        {/* ============ A — Clean login form ============ */}
        <section>
          <VariantHeader letter="A" label="Clean login · email/phone toggle · sign-up link · Google bottom" />
          <ModalShell>
            <div className="px-6 md:px-7 py-6">
              <div className="flex items-center gap-2 mb-1">
                <LogIn size={20} className="text-foreground/70" />
                <h3 className="font-heading font-bold text-xl text-foreground">Log in to continue</h3>
              </div>
              <p className="text-[12.5px] text-foreground/65 mb-4">
                Welcome back. Verify it's you to send the carrier your details.
              </p>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <button className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border-2 border-[var(--ob-cta)] bg-[var(--ob-cta)]/10 text-foreground">
                  <Phone size={13} /> Phone
                </button>
                <button className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border-2 border-border bg-card text-foreground/65">
                  <Mail size={13} /> Email
                </button>
              </div>

              <div className="relative mb-3">
                <Phone size={15} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />
                <input className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm font-mono text-foreground placeholder:text-foreground/40" placeholder="05xxxxxxxx" />
              </div>

              <button className="w-full py-2.5 rounded-lg bg-[var(--ob-cta)] text-[var(--ob-cta-text)] font-bold text-[14px]">
                Send verification code
              </button>

              <p className="text-center text-[12px] text-foreground/65 mt-3">
                Don't have an account?{' '}
                <a className="font-bold text-foreground underline underline-offset-4">Sign up</a>
              </p>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10.5px] uppercase tracking-wider text-foreground/45 font-mono">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button className="w-full inline-flex items-center justify-center gap-2.5 py-2.5 rounded-xl border-2 border-border bg-card font-semibold text-[13px] text-foreground/85">
                <GoogleIcon size={16} /> Continue with Google
              </button>

              <p className="text-[10.5px] text-foreground/50 text-center mt-4 leading-snug">
                By continuing you agree to our <span className="underline">Terms</span> and <span className="underline">Privacy Policy</span>.
              </p>
            </div>
          </ModalShell>
        </section>

        {/* ============ B — Smart detect (single field, auto-detects new vs existing) ============ */}
        <section>
          <VariantHeader letter="B" label="Smart detect · one field · system routes new users to sign-up" />
          <ModalShell>
            <div className="px-6 md:px-7 py-6">
              <div className="flex items-center gap-2 mb-1">
                <LogIn size={20} className="text-foreground/70" />
                <h3 className="font-heading font-bold text-xl text-foreground">Log in to continue</h3>
              </div>
              <p className="text-[12.5px] text-foreground/65 mb-4">
                Enter your phone or email. If it's your first time we'll set up your account in 30 seconds.
              </p>

              <div className="rounded-xl border-2 border-border bg-background overflow-hidden mb-3">
                <div className="grid grid-cols-2 border-b border-border">
                  <button className="py-2 text-[11px] font-semibold bg-[var(--ob-cta)]/10 text-foreground inline-flex items-center justify-center gap-1.5">
                    <Phone size={12} /> Phone
                  </button>
                  <button className="py-2 text-[11px] font-semibold text-foreground/55 inline-flex items-center justify-center gap-1.5">
                    <Mail size={12} /> Email
                  </button>
                </div>
                <input className="w-full px-4 py-3 bg-transparent text-sm font-mono text-foreground placeholder:text-foreground/40 focus:outline-none" placeholder="05xxxxxxxx" />
              </div>

              <button className="w-full py-3 rounded-xl bg-[var(--ob-cta)] text-[var(--ob-cta-text)] font-bold text-[14px] inline-flex items-center justify-center gap-1.5">
                Continue <ArrowRight size={14} />
              </button>

              <div className="flex items-center justify-center gap-1.5 mt-3 text-[11px] text-foreground/55">
                <ShieldCheck size={12} className="text-green-600" />
                We never share your info. Encrypted end-to-end.
              </div>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10.5px] uppercase tracking-wider text-foreground/45 font-mono">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button className="w-full inline-flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-border bg-card font-semibold text-[13px] text-foreground/85">
                <GoogleIcon size={16} /> Continue with Google
              </button>
            </div>
          </ModalShell>
        </section>

        {/* ============ C — Branded panel + login (premium feel) ============ */}
        <section>
          <VariantHeader letter="C" label="Branded panel · صوب lockup top · login below · sign-up + Google bottom" />
          <ModalShell>
            {/* Brand strip */}
            <div
              className="relative px-6 pt-5 pb-4 overflow-hidden"
              style={{ backgroundColor: '#C59AFA' }}
            >
              <div
                className="absolute top-0 bottom-0 right-0 pointer-events-none"
                style={{
                  width: '55%',
                  backgroundImage: 'url(/patterns/wave-purple-medium.png)',
                  backgroundSize: 'auto 130%',
                  backgroundPosition: 'left center',
                  backgroundRepeat: 'no-repeat',
                  opacity: 0.32,
                }}
              />
              <div className="relative z-10">
                <img src="/logo-arabic-navy.png" alt="صوب" className="h-5 w-auto mb-2" />
                <h3 className="font-heading font-bold text-lg text-[#16143A] leading-tight">
                  Welcome back
                </h3>
                <p className="text-[#16143A]/75 text-[12px] mt-0.5">
                  Log in to finish your purchase.
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border-2 border-[var(--ob-cta)] bg-[var(--ob-cta)]/10 text-foreground">
                  <Phone size={13} /> Phone
                </button>
                <button className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border-2 border-border bg-card text-foreground/65">
                  <Mail size={13} /> Email
                </button>
              </div>

              <div className="relative mb-3">
                <Phone size={15} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />
                <input className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm font-mono text-foreground placeholder:text-foreground/40" placeholder="05xxxxxxxx" />
              </div>

              <button className="w-full py-2.5 rounded-lg bg-[var(--ob-cta)] text-[var(--ob-cta-text)] font-bold text-[14px]">
                Log in
              </button>

              <p className="text-center text-[12px] text-foreground/65 mt-3">
                New to SOOB?{' '}
                <a className="inline-flex items-center gap-1 font-bold text-foreground underline underline-offset-4">
                  Create account <UserPlus size={11} />
                </a>
              </p>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10.5px] uppercase tracking-wider text-foreground/45 font-mono">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button className="w-full inline-flex items-center justify-center gap-2.5 py-2.5 rounded-xl border-2 border-border bg-card font-semibold text-[13px] text-foreground/85">
                <GoogleIcon size={16} /> Continue with Google
              </button>
            </div>
          </ModalShell>
        </section>

        {/* ============ D — Login screen with explicit "Sign up" inline toggle ============ */}
        <section>
          <VariantHeader letter="D" label="Tabs (Log in default, Sign up muted) · Google footer" />
          <ModalShell>
            <div className="px-6 md:px-7 py-6">
              <h3 className="font-heading font-bold text-xl text-foreground mb-1">Continue your purchase</h3>
              <p className="text-[12.5px] text-foreground/65 mb-4">
                Log in or create an account to send the carrier your details.
              </p>

              {/* Tabs — Log in is the default; Sign up is muted/secondary */}
              <div className="flex gap-1 border-b border-border mb-4">
                <button className="px-3 py-2 text-[13px] font-bold text-foreground border-b-2 border-[var(--ob-cta)] -mb-px">
                  Log in
                </button>
                <button className="px-3 py-2 text-[13px] font-medium text-foreground/55">
                  Sign up
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <button className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border-2 border-[var(--ob-cta)] bg-[var(--ob-cta)]/10 text-foreground">
                  <Phone size={13} /> Phone
                </button>
                <button className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border-2 border-border bg-card text-foreground/65">
                  <Mail size={13} /> Email
                </button>
              </div>

              <div className="relative mb-3">
                <Phone size={15} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />
                <input className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm font-mono text-foreground placeholder:text-foreground/40" placeholder="05xxxxxxxx" />
              </div>

              <button className="w-full py-2.5 rounded-lg bg-[var(--ob-cta)] text-[var(--ob-cta-text)] font-bold text-[14px]">
                Log in
              </button>

              {/* Footer area — Google at the very bottom */}
              <div className="border-t border-border mt-5 pt-4">
                <p className="text-[11px] text-foreground/55 text-center mb-2.5">
                  Prefer Google?
                </p>
                <button className="w-full inline-flex items-center justify-center gap-2.5 py-2 rounded-lg bg-secondary text-foreground/80 font-semibold text-[12.5px]">
                  <GoogleIcon size={14} /> Continue with Google
                </button>
              </div>
            </div>
          </ModalShell>
        </section>

      </div>
    </div>
  );
}
