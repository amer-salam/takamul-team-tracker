import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Satellite, Users, BarChart3, Languages } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: "radial-gradient(circle at 20% 20%, oklch(0.78 0.15 75 / 0.4), transparent 40%), radial-gradient(circle at 80% 70%, oklch(0.55 0.2 280 / 0.4), transparent 40%)"
      }} />
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary-foreground">
            <Satellite className="h-7 w-7" style={{ color: "var(--accent)" }} />
            <span className="text-xl font-bold">{t("appName")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-white/10"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            >
              <Languages className="h-4 w-4 me-1" />
              {lang === "ar" ? "EN" : "AR"}
            </Button>
            <Link to="/auth">
              <Button variant="secondary" size="sm">{t("login")}</Button>
            </Link>
          </div>
        </header>

        <main className="mt-20 md:mt-28 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-primary-foreground leading-tight">
            {t("heroTitle")}
          </h1>
          <p className="mt-6 text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            {t("heroSub")}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="text-base h-12 px-8" style={{ background: "var(--gradient-gold)", color: "var(--accent-foreground)" }}>
                {t("getStarted")}
              </Button>
            </Link>
          </div>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 text-start">
            {[
              { icon: Satellite, title: t("orders"), sub: t("tagline") },
              { icon: Users, title: t("employees"), sub: t("employeePerformance") },
              { icon: BarChart3, title: t("reports"), sub: t("activityLog") },
            ].map((f, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 text-primary-foreground">
                <f.icon className="h-8 w-8 mb-3" style={{ color: "var(--accent)" }} />
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-primary-foreground/70 mt-1">{f.sub}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
