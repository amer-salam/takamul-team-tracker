import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Package, Clock, CheckCircle2, Users, Plus, Activity, RotateCcw, DollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { fmtIQD, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number | string; tone: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl md:text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: tone }}>
          <Icon className="h-5 w-5 text-primary-foreground" />
        </div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const { isManager } = useAuth();
  return isManager ? <ManagerDashboard /> : <EmployeeDashboard />;
}

function ManagerDashboard() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [{ data: orders }, { data: todayOrders }] = await Promise.all([
        supabase.from("orders").select("status, price"),
        supabase.from("orders").select("id, price, status").gte("created_at", todayStart.toISOString()),
      ]);
      const list = orders ?? [];
      const inProgress = list.filter((o) => ["pending_audit","audited_printed","in_delivery","processing","new"].includes(o.status as string)).length;
      const completed = list.filter((o) => ["delivered","completed","activated"].includes(o.status as string)).length;
      const returned = list.filter((o) => o.status === "returned").length;
      const revenue = list
        .filter((o) => ["delivered","completed","activated"].includes(o.status as string))
        .reduce((s, o: any) => s + Number(o.price ?? 0), 0);
      return {
        total: list.length,
        inProgress,
        completed,
        returned,
        revenue,
        todayCount: (todayOrders ?? []).length,
      };
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["recent-tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, task_type, description, created_at, employee_id, profiles:employee_id(full_name)")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const { data: myStats } = useQuery({
    queryKey: ["my-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("task_type").eq("employee_id", user!.id);
      const list = data ?? [];
      return {
        ordersReceived: list.filter((x) => x.task_type === "order_received").length,
        auditsDone: list.filter((x) => x.task_type === "audit_done").length,
        deliveriesDone: list.filter((x) => x.task_type === "delivery_done").length,
      };
    },
  });

  const locale = lang === "ar" ? ar : enUS;
  const fmt = (n: number) => fmtNum(n);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t("dashboard")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("tagline")}</p>
        </div>
        <Link to="/orders"><Button><Plus className="h-4 w-4 me-1" />{t("addOrder")}</Button></Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Package} label={t("todaysOrders")} value={fmt(stats?.todayCount ?? 0)} tone="var(--gradient-hero)" />
        <StatCard icon={Clock} label={t("inProgress")} value={fmt(stats?.inProgress ?? 0)} tone="oklch(0.6 0.18 250)" />
        <StatCard icon={CheckCircle2} label={t("completedOrders")} value={fmt(stats?.completed ?? 0)} tone="oklch(0.6 0.16 155)" />
        <StatCard icon={RotateCcw} label={t("returnedOrders")} value={fmt(stats?.returned ?? 0)} tone="oklch(0.6 0.22 25)" />
        <StatCard icon={DollarSign} label={t("revenue")} value={fmtIQD(stats?.revenue ?? 0, lang)} tone="var(--gradient-gold)" />
        <StatCard icon={Package} label={t("totalOrders")} value={fmt(stats?.total ?? 0)} tone="oklch(0.55 0.16 255)" />
        <StatCard icon={Activity} label={t("activityLog")} value={fmt(recent?.length ?? 0)} tone="oklch(0.5 0.05 270)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><Activity className="h-5 w-5" />{t("recentActivity")}</h2>
          {!recent || recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("noData")}</p>
          ) : (
            <ul className="space-y-3">
              {recent.map((task: any) => (
                <li key={task.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0"><Activity className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.profiles?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t(task.task_type as never)}
                      {task.description ? ` — ${task.description}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(task.created_at), { addSuffix: true, locale })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-lg mb-4">{t("activeEmployees")}</h2>
          <ManagerEmpBlock />
        </Card>
      </div>
    </div>
  );
}

function EmployeeDashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);

  const { data: stats } = useQuery({
    queryKey: ["my-dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("status, created_at")
        .eq("created_by", user!.id);
      const list = data ?? [];
      const today = list.filter((o: any) => new Date(o.created_at) >= todayStart).length;
      const inProgress = list.filter((o: any) =>
        ["new","pending_audit","audited_printed","in_delivery","processing"].includes(o.status as string)
      ).length;
      const completed = list.filter((o: any) =>
        ["delivered","completed","activated"].includes(o.status as string)
      ).length;
      return { today, inProgress, completed };
    },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t("dashboard")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("tagline")}</p>
        </div>
        <Link to="/orders"><Button><Plus className="h-4 w-4 me-1" />{t("addOrder")}</Button></Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={Package} label={t("todaysOrders")} value={fmtNum(stats?.today ?? 0)} tone="var(--gradient-hero)" />
        <StatCard icon={Clock} label={t("inProgress")} value={fmtNum(stats?.inProgress ?? 0)} tone="oklch(0.6 0.18 250)" />
        <StatCard icon={CheckCircle2} label={t("completedOrders")} value={fmtNum(stats?.completed ?? 0)} tone="oklch(0.6 0.16 155)" />
      </div>
    </div>
  );
}

function ManagerEmpBlock() {
  const { t } = useI18n();
  const { data: count } = useQuery({
    queryKey: ["employee-count"],
    queryFn: async () => {
      const { count } = await supabase.from("user_roles").select("user_id", { count: "exact", head: true });
      return count ?? 0;
    },
  });
  return (
    <div className="text-center py-6">
      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
      <p className="text-4xl font-bold">{count ?? 0}</p>
      <p className="text-sm text-muted-foreground mt-1">{t("activeEmployees")}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}
