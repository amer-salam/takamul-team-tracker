import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Package, Clock, CheckCircle2, Users, Plus, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number | string; tone: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: tone }}>
          <Icon className="h-5 w-5 text-primary-foreground" />
        </div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const { t, lang } = useI18n();
  const { isManager, user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data: orders } = await supabase.from("orders").select("status");
      const list = orders ?? [];
      return {
        total: list.length,
        new: list.filter((o) => o.status === "new").length,
        processing: list.filter((o) => o.status === "processing").length,
        completed: list.filter((o) => o.status === "completed" || o.status === "activated").length,
      };
    },
  });

  const { data: employeeCount } = useQuery({
    queryKey: ["employee-count"],
    enabled: isManager,
    queryFn: async () => {
      const { count } = await supabase.from("user_roles").select("user_id", { count: "exact", head: true });
      return count ?? 0;
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
        problemsResolved: list.filter((x) => x.task_type === "problem_resolved").length,
        codesActivated: list.filter((x) => x.task_type === "code_activated").length,
      };
    },
  });

  const locale = lang === "ar" ? ar : enUS;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t("dashboard")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("tagline")}</p>
        </div>
        <Link to="/orders">
          <Button><Plus className="h-4 w-4 me-1" />{t("addOrder")}</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label={t("totalOrders")} value={stats?.total ?? 0} tone="var(--gradient-hero)" />
        <StatCard icon={Clock} label={t("newOrders")} value={stats?.new ?? 0} tone="oklch(0.6 0.18 250)" />
        <StatCard icon={Activity} label={t("processingOrders")} value={stats?.processing ?? 0} tone="var(--gradient-gold)" />
        <StatCard icon={CheckCircle2} label={t("completedOrders")} value={stats?.completed ?? 0} tone="oklch(0.6 0.16 155)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />{t("recentActivity")}
          </h2>
          {!recent || recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("noData")}</p>
          ) : (
            <ul className="space-y-3">
              {recent.map((task: any) => (
                <li key={task.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <Activity className="h-4 w-4" />
                  </div>
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
          <h2 className="font-semibold text-lg mb-4">{isManager ? t("activeEmployees") : t("tasksHandled")}</h2>
          {isManager ? (
            <div className="text-center py-6">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-4xl font-bold">{employeeCount ?? 0}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("activeEmployees")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Row label={t("ordersReceived")} value={myStats?.ordersReceived ?? 0} />
              <Row label={t("problemsResolved")} value={myStats?.problemsResolved ?? 0} />
              <Row label={t("codesActivated")} value={myStats?.codesActivated ?? 0} />
            </div>
          )}
        </Card>
      </div>
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