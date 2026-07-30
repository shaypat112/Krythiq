"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Github,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  isStrongPassword,
  isValidEmail,
  normalizeEmail,
  passwordRequirements,
} from "@/app/lib/auth-validation";
import { createClient } from "@/app/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandLogo } from "@/app/components/BrandLogo";

type Mode = "sign-in" | "sign-up";
type RecoveryMode = "forgot" | "reset" | null;
type PendingAction = "password" | "github" | "magic-link" | "resend" | "reset-request" | "reset-update" | null;

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "The email or password is incorrect.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Verify your email before signing in.";
  }
  if (normalized.includes("user already registered")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (normalized.includes("rate limit")) {
    return "Too many attempts. Wait a moment and try again.";
  }
  if (normalized.includes("password")) {
    return "The password does not meet the security requirements.";
  }
  return message;
}

export default function AuthClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const nextPath = safeNextPath(searchParams.get("next"));
  const [mode, setMode] = useState<Mode>("sign-in");
  const [recoveryMode, setRecoveryMode] = useState<RecoveryMode>(
    searchParams.get("mode") === "reset" ? "reset" : null,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(() => {
    const reason = searchParams.get("error");
    if (reason === "expired-link") return "This sign-in link has expired. Request a new verification email.";
    if (reason === "callback") return "The authentication callback was incomplete. Try signing in again.";
    return null;
  });
  const [verificationEmail, setVerificationEmail] = useState<string | null>(
    searchParams.get("verification") === "required" ? email || null : null,
  );
  const [success, setSuccess] = useState<string | null>(null);

  const requirements = passwordRequirements(password);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      if (data.user.email_confirmed_at && recoveryMode !== "reset") {
        router.replace(nextPath);
        router.refresh();
        return;
      }
      if (data.user.email) {
        setEmail(data.user.email);
        setVerificationEmail(data.user.email);
      }
    });
    return () => {
      active = false;
    };
  }, [nextPath, recoveryMode, router, supabase]);

  const validate = () => {
    if (!isValidEmail(email)) return "Enter a valid email address.";
    if (mode === "sign-up" && !isStrongPassword(password)) {
      return "Create a stronger password using every requirement below.";
    }
    if (mode === "sign-up" && password !== confirmPassword) {
      return "The passwords do not match.";
    }
    if (mode === "sign-in" && !password) return "Enter your password.";
    return null;
  };

  const submitPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setPending("password");
    setError(null);
    const normalizedEmail = normalizeEmail(email);

    if (mode === "sign-up") {
      const response = await fetch("/api/auth/email-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "signup", email: normalizedEmail, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof result?.error === "string" ? result.error : "Unable to create your account.");
        setPending(null);
        return;
      }
      setVerificationEmail(normalizedEmail);
      setPending(null);
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError) {
      setError(friendlyAuthError(signInError.message));
      setPending(null);
      return;
    }

    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut({ scope: "local" });
      setVerificationEmail(normalizedEmail);
      setError("Verify your email before accessing Krythiq.");
      setPending(null);
      return;
    }

    router.replace(nextPath);
    router.refresh();
  };

  const loginWithGitHub = async () => {
    setPending("github");
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
    if (oauthError) {
      setError(friendlyAuthError(oauthError.message));
      setPending(null);
    }
  };

  const loginWithMagicLink = async () => {
    if (!isValidEmail(email)) {
      setError("Enter your email address first.");
      return;
    }
    setPending("magic-link");
    setError(null);
    const response = await fetch("/api/auth/email-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "magiclink", email: normalizeEmail(email) }),
    });
    const result = await response.json().catch(() => ({}));
    setPending(null);
    if (!response.ok) {
      setError(typeof result?.error === "string" ? result.error : "Unable to send a sign-in link.");
      return;
    }
    setSuccess(result.message ?? "Check your email for a secure sign-in link.");
  };

  const resendVerification = async () => {
    const target = verificationEmail ?? normalizeEmail(email);
    if (!isValidEmail(target)) {
      setError("Enter the email address used for your account.");
      return;
    }
    setPending("resend");
    setError(null);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: target,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
    setPending(null);
    if (resendError) setError(friendlyAuthError(resendError.message));
  };

  const requestPasswordReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setPending("reset-request");
    setError(null);
    setSuccess(null);
    const response = await fetch("/api/auth/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizeEmail(email) }),
    });
    const result = await response.json().catch(() => ({}));
    setPending(null);
    if (!response.ok) {
      setError(typeof result?.error === "string" ? result.error : "Unable to request a password reset.");
      return;
    }
    setSuccess(result.message ?? "If an account exists for that email, a password reset link is on its way.");
  };

  const updatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isStrongPassword(password)) {
      setError("Create a stronger password using every requirement below.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setPending("reset-update");
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(null);
    if (updateError) {
      setError(friendlyAuthError(updateError.message));
      return;
    }
    await supabase.auth.signOut();
    setRecoveryMode(null);
    setPassword("");
    setConfirmPassword("");
    setSuccess("Password updated. Sign in with your new password.");
    router.replace("/auth");
  };

  if (recoveryMode === "forgot") {
    return (
      <AuthFrame>
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-sky-400/25 bg-sky-400/10 text-sky-400"><Mail /></span>
            <CardTitle className="mt-4 text-2xl">Reset your password</CardTitle>
            <CardDescription>We’ll send a secure recovery link from notifications@krythiq.dev.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={requestPasswordReset} noValidate>
              <div className="space-y-2">
                <Label htmlFor="recovery-email">Email</Label>
                <Input id="recovery-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required />
              </div>
              {error ? <AuthError message={error} /> : null}
              {success ? <Alert><Mail /><AlertTitle>Check your email</AlertTitle><AlertDescription>{success}</AlertDescription></Alert> : null}
              <Button type="submit" className="w-full" disabled={pending !== null}>
                {pending === "reset-request" ? <Loader2 className="animate-spin" /> : <Mail />}
                {pending === "reset-request" ? "Sending…" : "Send reset link"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => { setRecoveryMode(null); setError(null); setSuccess(null); }}>Back to sign in</Button>
            </form>
          </CardContent>
        </Card>
      </AuthFrame>
    );
  }

  if (recoveryMode === "reset") {
    return (
      <AuthFrame>
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-sky-400/25 bg-sky-400/10 text-sky-400"><LockKeyhole /></span>
            <CardTitle className="mt-4 text-2xl">Choose a new password</CardTitle>
            <CardDescription>Use a strong password you do not use anywhere else.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={updatePassword}>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password-confirmation">Confirm new password</Label>
                <Input id="new-password-confirmation" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff /> : <Eye />}{showPassword ? "Hide passwords" : "Show passwords"}</Button>
              <ul className="grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
                {requirements.map((requirement) => <li key={requirement.id} className="flex items-center gap-1.5"><Check className={`h-3.5 w-3.5 ${requirement.met ? "text-emerald-500" : "text-muted-foreground/50"}`} />{requirement.label}</li>)}
              </ul>
              {error ? <AuthError message={error} /> : null}
              <Button type="submit" className="w-full" disabled={pending !== null}>
                {pending === "reset-update" ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                {pending === "reset-update" ? "Updating…" : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </AuthFrame>
    );
  }

  if (verificationEmail || searchParams.get("verification") === "required") {
    return (
      <AuthFrame>
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-sky-400/25 bg-sky-400/10 text-sky-400">
              <Mail />
            </span>
            <CardTitle className="mt-4 text-2xl">Check your email</CardTitle>
            <CardDescription className="leading-6">
              We sent a verification link{verificationEmail ? <> to <strong className="text-foreground">{verificationEmail}</strong></> : ""}. Verify your address before accessing the workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? <AuthError message={error} /> : null}
            <Button className="w-full" variant="outline" onClick={() => void resendVerification()} disabled={pending !== null}>
              {pending === "resend" ? <Loader2 className="animate-spin" /> : <Mail />}
              {pending === "resend" ? "Sending…" : "Resend verification email"}
            </Button>
            <Button className="w-full" variant="ghost" onClick={() => { setVerificationEmail(null); setMode("sign-in"); setError(null); }}>
              Back to sign in
            </Button>
          </CardContent>
        </Card>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <Button asChild variant="ghost" size="sm" className="absolute left-3 top-3 px-2">
            <Link href="/"><ArrowLeft /> Home</Link>
          </Button>
          <BrandLogo className="mx-auto h-12 w-12 rounded-xl" priority />
          <CardTitle className="pt-2 text-2xl">Welcome to Krythiq</CardTitle>
          <CardDescription>
            Sign in or create an account to secure your repositories.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Button variant="outline" className="w-full" onClick={() => void loginWithGitHub()} disabled={pending !== null}>
            {pending === "github" ? <Loader2 className="animate-spin" /> : <Github />}
            {pending === "github" ? "Connecting…" : "Continue with GitHub"}
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or use email
            <span className="h-px flex-1 bg-border" />
          </div>

          <Tabs value={mode} onValueChange={(value) => { setMode(value as Mode); setError(null); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sign-in">Sign in</TabsTrigger>
              <TabsTrigger value="sign-up">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value={mode}>
              <form className="mt-5 space-y-4" onSubmit={submitPassword} noValidate>
                <div className="space-y-2">
                  <Label htmlFor="auth-email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="auth-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} className="pl-9" placeholder="you@company.com" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auth-password">Password</Label>
                    {mode === "sign-in" ? <button type="button" className="text-xs font-medium text-sky-400 hover:text-sky-300" onClick={() => { setRecoveryMode("forgot"); setError(null); setSuccess(null); }}>Forgot password?</button> : null}
                  </div>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="px-9" required />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1.5 rounded-md p-1 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {mode === "sign-up" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm password</Label>
                      <Input id="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                    </div>
                    <ul className="grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
                      {requirements.map((requirement) => (
                        <li key={requirement.id} className="flex items-center gap-1.5">
                          <Check className={`h-3.5 w-3.5 ${requirement.met ? "text-emerald-500" : "text-muted-foreground/50"}`} />
                          {requirement.label}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}

                {error ? <AuthError message={error} /> : null}
                {success ? <Alert><Check /><AlertTitle>Success</AlertTitle><AlertDescription>{success}</AlertDescription></Alert> : null}

                <Button type="submit" className="w-full" disabled={pending !== null}>
                  {pending === "password" ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                  {pending === "password" ? "Please wait…" : mode === "sign-up" ? "Create account" : "Sign in"}
                </Button>
                {mode === "sign-in" ? (
                  <Button type="button" variant="outline" className="w-full" disabled={pending !== null} onClick={() => void loginWithMagicLink()}>
                    {pending === "magic-link" ? <Loader2 className="animate-spin" /> : <Mail />}
                    {pending === "magic-link" ? "Sending…" : "Email me a magic link"}
                  </Button>
                ) : null}
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-center text-xs leading-5 text-muted-foreground">
            Email accounts must be verified before workspace access. GitHub access remains read-only.
          </p>
        </CardContent>
      </Card>
    </AuthFrame>
  );
}

function AuthError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <LockKeyhole />
      <AlertTitle>Authentication failed</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(56,189,248,.12),transparent_35%),radial-gradient(circle_at_90%_80%,rgba(139,92,246,.1),transparent_30%)]" />
      <div className="relative flex w-full justify-center">{children}</div>
    </div>
  );
}
