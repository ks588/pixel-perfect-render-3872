import { useState } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Quote,
  ShieldCheck,
  Store,
  Warehouse,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { PERSONAS } from "@/lib/kf/seed";
import { useKF } from "@/lib/kf/store";
import type { Persona } from "@/lib/kf/types";

// Soft avatar color schemes mirroring the reference design
const AVATAR_STYLES: Record<string, string> = {
  "bm-col": "bg-[#e8dfd8] text-[#5c4738]",
  "bm-kcc": "bg-[#f3dbcf] text-[#6b3d22]",
  admin: "bg-[#e2d5ec] text-[#482860]",
  board: "bg-[#dbe4d3] text-[#34502a]",
  "dc-manager": "bg-[#d8e5e8] text-[#244b54]",
};

export function LoginScreen() {
  const { login } = useKF();

  const [step, setStep] = useState<"select" | "email" | "otp">("select");
  const [selectedPersona, setSelectedPersona] = useState<Persona>(PERSONAS[0]!);
  const [email, setEmail] = useState<string>("kavindu@kellyfelder.lk");
  const [otp, setOtp] = useState<string>("123456");

  // Helper to generate a realistic work email based on persona
  const getEmailForPersona = (p: Persona) => {
    const slug = p.name.split(" ")[0]!.toLowerCase();
    return `${slug}@kellyfelder.lk`;
  };

  const handleSelectAccount = (p: Persona) => {
    setSelectedPersona(p);
    setEmail(getEmailForPersona(p));
    setStep("email");
  };

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("otp");
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    login(selectedPersona.id);
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* LEFT COLUMN: Interactive Authentication Pane */}
      <div className="flex w-full flex-col justify-between p-6 sm:p-10 lg:w-[52%] lg:p-14 xl:p-20">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Zap className="size-4" />
          </div>
          <span className="font-semibold tracking-tight text-foreground text-sm sm:text-base">
            Kelly Felder <span className="text-muted-foreground font-normal">AI</span>
          </span>
        </div>

        {/* Center Container */}
        <div className="mx-auto my-auto w-full max-w-[420px] py-8">
          {/* ================= STEP 1: ACCOUNT SELECTION ================= */}
          {step === "select" && (
            <div className="space-y-6">
              {/* Top Icon Badge */}
              <div className="flex justify-center">
                <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-secondary/70 shadow-xs">
                  <Building2 className="size-5 text-foreground" />
                </div>
              </div>

              {/* Headings */}
              <div className="text-center space-y-1.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Sign in to your workspace
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Pick an account. Each one holds a different role, so the app you see changes with it.
                </p>
              </div>

              {/* Account Rows */}
              <div className="space-y-2.5 pt-2">
                {PERSONAS.map((p) => {
                  const avatarColor =
                    AVATAR_STYLES[p.id] ?? "bg-secondary text-secondary-foreground";
                  const roleLabel =
                    p.role === "admin"
                      ? "Admin · Group LOB Lead"
                      : p.role === "warehouse"
                        ? "Distribution Center · Logistics"
                        : `${p.branchName ?? p.branchId} · Store Manager`;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectAccount(p)}
                      className="group flex w-full items-center justify-between rounded-xl border border-border/80 bg-card p-3 text-left transition-all duration-150 hover:border-primary/50 hover:bg-accent/40 hover:shadow-xs cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex size-10 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold ${avatarColor}`}
                        >
                          {p.initials}
                        </div>
                        <div className="leading-tight">
                          <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {p.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {roleLabel}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </button>
                  );
                })}
              </div>

              {/* Sub-note */}
              <div className="pt-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Looking for group policy?{" "}
                  <button
                    type="button"
                    onClick={() => handleSelectAccount(PERSONAS.find((p) => p.role === "admin")!)}
                    className="font-medium text-foreground underline-offset-4 hover:underline cursor-pointer"
                  >
                    Sign in as Retail Lead
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ================= STEP 2: WORK EMAIL CONFIRMATION ================= */}
          {step === "email" && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-secondary/70 shadow-xs">
                  <Building2 className="size-5 text-foreground" />
                </div>
              </div>

              <div className="text-center space-y-1.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Sign in to Kelly Felder
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  We will email you a one-time code — no password needed.
                </p>
              </div>

              {/* Selected User Pill */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold ${
                      AVATAR_STYLES[selectedPersona.id] ?? "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {selectedPersona.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {selectedPersona.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedPersona.department}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("select")}
                  className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Change
                </Button>
              </div>

              {/* Form */}
              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="work-email" className="text-xs font-medium text-foreground">
                    Work email
                  </Label>
                  <Input
                    id="work-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 bg-card border-border"
                  />
                </div>

                <Button type="submit" className="w-full h-10 font-medium cursor-pointer">
                  Send code
                </Button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep("select")}
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline cursor-pointer"
                >
                  Back to start
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 3: OTP VERIFICATION ================= */}
          {step === "otp" && (
            <div className="space-y-6">
              {/* Green Verified Icon */}
              <div className="flex justify-center">
                <div className="flex size-12 items-center justify-center rounded-xl border border-success/30 bg-success/15 text-success shadow-xs">
                  <Check className="size-6 stroke-[2.5]" />
                </div>
              </div>

              <div className="text-center space-y-1.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Check your email
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>
                </p>
              </div>

              {/* OTP Form */}
              <form onSubmit={handleVerify} className="space-y-5">
                <div className="flex justify-center py-2">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(val) => setOtp(val)}
                  >
                    <InputOTPGroup className="gap-2">
                      <InputOTPSlot index={0} className="rounded-md border border-border size-11 text-base font-semibold" />
                      <InputOTPSlot index={1} className="rounded-md border border-border size-11 text-base font-semibold" />
                      <InputOTPSlot index={2} className="rounded-md border border-border size-11 text-base font-semibold" />
                      <InputOTPSlot index={3} className="rounded-md border border-border size-11 text-base font-semibold" />
                      <InputOTPSlot index={4} className="rounded-md border border-border size-11 text-base font-semibold" />
                      <InputOTPSlot index={5} className="rounded-md border border-border size-11 text-base font-semibold" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {/* Demo Hint */}
                <p className="text-center text-xs text-muted-foreground">
                  Demo mode — the code is <span className="font-mono font-bold text-foreground">123456</span>
                </p>

                <Button type="submit" className="w-full h-10 font-medium cursor-pointer">
                  Sign in
                </Button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:underline cursor-pointer"
                >
                  <ArrowLeft className="size-3" />
                  <span>Use a different email</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Metadata */}
        <div className="text-xs text-muted-foreground">
          Axceera AI Platform · Section 7.5 Automated Replenishment
        </div>
      </div>

      {/* RIGHT COLUMN: Atmospheric Visual & Retail Intelligence Testimonial */}
      <div className="relative hidden w-[48%] flex-col justify-end p-12 lg:flex lg:p-16 xl:p-20 overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a1220] to-[#040810] border-l border-border">
        {/* Subtle ambient light blur */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-1/3 left-10 h-[300px] w-[300px] rounded-full bg-info/10 blur-[90px]" />

        <div className="relative z-10 space-y-6 max-w-lg">
          <Quote className="size-12 text-muted-foreground/30 stroke-[1.5]" />

          <blockquote className="text-2xl font-medium tracking-tight text-slate-100 sm:text-3xl leading-snug">
            “We cut store reorder lead times from four days to automated minutes, without ever letting an exception bypass human sign-off.”
          </blockquote>

          <div className="pt-2">
            <div className="text-sm font-semibold text-slate-200">
              Dinith Wickramanayake
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Retail LOB Lead, Kelly Felder Enterprise
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}