import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Satellite, Languages } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const { signIn, signUp, user } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) toast.error(error); else toast.success(t("loginSuccess"));
    } else {
      const { error } = await signUp(email, password, fullName, phone);
      if (error) toast.error(error); else toast.success(t("signupSuccess"));
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "var(--gradient-hero)" }}>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="flex items-center gap-2 text-primary-foreground">
            <Satellite className="h-6 w-6" style={{ color: "var(--accent)" }} />
            <span className="font-bold">{t("appName")}</span>
          </Link>
          <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10"
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
            <Languages className="h-4 w-4 me-1" />{lang === "ar" ? "EN" : "AR"}
          </Button>
        </div>

        <Card className="p-6 md:p-8">
          <h1 className="text-2xl font-bold">{mode === "login" ? t("welcome") : t("signup")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? t("tagline") : t("createAccount")}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-1.5">
                  <Label>{t("fullName")}</Label>
                  <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("phone")}</Label>
                  <Input required value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label>{t("email")}</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("enterEmail")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("password")}</Label>
              <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("enterPassword")} />
            </div>

            <Button type="submit" className="w-full h-11" disabled={busy}>
              {mode === "login" ? t("login") : t("signup")}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground w-full text-center"
          >
            {mode === "login" ? t("noAccount") + " " + t("signup") : t("haveAccount") + " " + t("login")}
          </button>
        </Card>
      </div>
    </div>
  );
}
