import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { User, Lock, ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, login } from "@/lib/auth";
import { redirectIfAuthenticated, sanitizeRedirectTarget } from "@/lib/route-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: redirectIfAuthenticated,
  head: () => ({
    meta: [
      { title: "Sign in - Lectern" },
      { name: "description", content: "Sign in to your Lectern teacher workspace." },
    ],
  }),
  component: LoginPage,
});

type FieldErrors = { username?: string; password?: string };

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");

  const validate = (u: string, p: string): FieldErrors => {
    const next: FieldErrors = {};

    if (!u.trim()) {
      next.username = "Username is required";
    } else if (u.trim().length > 64) {
      next.username = "Username must be less than 64 characters";
    }

    if (!p) {
      next.password = "Password is required";
    }

    return next;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    const next = validate(username, password);
    setErrors(next);
    setSubmitError("");

    if (Object.keys(next).length > 0) return;

    setLoading(true);

    try {
      await login(username.trim(), password);
      await navigate({ to: sanitizeRedirectTarget(redirect) });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setSubmitError("Incorrect username or password.");
        } else if (error.status === 400) {
          setSubmitError("Please check the entered credentials.");
        } else {
          setSubmitError(error.message);
        }
      } else {
        setSubmitError("Unable to connect to the server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary font-semibold text-primary-foreground">
            L
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Lectern</div>
            <div className="text-[11px] leading-tight text-muted-foreground">
              Academic operations
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your username and password to continue.
          </p>

          {(submitError || errors.username || errors.password) && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{submitError || "Please fix the highlighted fields below."}</span>
            </div>
          )}

          <form onSubmit={submit} noValidate className="mt-5 space-y-3.5">
            <div>
              <Label htmlFor="username">Username</Label>
              <div className="relative mt-1.5">
                <User className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  placeholder="e.g. elena.wright"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errors.username) setErrors((prev) => ({ ...prev, username: undefined }));
                    if (submitError) setSubmitError("");
                  }}
                  disabled={loading}
                  aria-invalid={!!errors.username}
                  aria-describedby={errors.username ? "username-error" : undefined}
                  className={cn(
                    "pl-8",
                    errors.username && "border-destructive focus-visible:ring-destructive",
                  )}
                />
              </div>
              {errors.username && (
                <p id="username-error" className="mt-1.5 text-xs text-destructive">
                  {errors.username}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a className="text-xs text-muted-foreground hover:text-foreground" href="#">
                  Forgot?
                </a>
              </div>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="........"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    if (submitError) setSubmitError("");
                  }}
                  disabled={loading}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className={cn(
                    "pl-8 pr-9",
                    errors.password && "border-destructive focus-visible:ring-destructive",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1.5 text-xs text-destructive">
                  {errors.password}
                </p>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                defaultChecked
                disabled={loading}
                className="h-3.5 w-3.5 rounded border-input accent-primary"
              />
              Keep me signed in for 30 days
            </label>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                "Signing in..."
              ) : (
                <>
                  Sign in <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Need access?{" "}
          <Link to="/" className="text-primary hover:underline">
            Contact your administrator
          </Link>
        </p>
      </div>
    </div>
  );
}
