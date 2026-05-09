import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/reports")({ component: ReportsPage });

const COLORS = ["oklch(0.55 0.16 255)", "oklch(0.78 0.15 75)", "oklch(0.65 0.16 155)", "oklch(0.6 0.22 25)", "oklch(0.5 0.05 270)"];

function ReportsPage() {
  const { t } = useI18n();
  const { isManager, loading } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState("7");

  useEffect(() => { if (!loading && !isManager) navigate({ to: "/dashboard" }); }, [loading, isManager, navigate]);

  const since = new Date(Date.now() - parseInt(range) * 24 * 3600 * 1000).toISOString();

  const { data } = useQuery({
    queryKey: ["reports", range],
    enabled: isManager,
    queryFn: async () => {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("task_type, created_at, employee_id, profiles:employee_id(full_name)")
        .gte("created_at", since);
      const { data: orders } = await supabase.from("orders").select("status, created_at").gte("created_at", since);
      const byEmp: Record<string, { name: string; total: number }> = {};
      (tasks ?? []).forEach((task: any) => {
        const name = task.profiles?.full_name ?? "—";
        if (!byEmp[task.employee_id]) byEmp[task.employee_id] = { name, total: 0 };
        byEmp[task.employee_id].total += 1;
      });
      const byStatus: Record<string, number> = {};
      (orders ?? []).forEach((o) => { byStatus[o.status] = (byStatus[o.status] ?? 0) + 1; });
      return {
        empData: Object.values(byEmp),
        statusData: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
        totalTasks: tasks?.length ?? 0,
        totalOrders: orders?.length ?? 0,
      };
    },
  });

  if (!isManager) return null;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">{t("reports")}</h1>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">{t("today")}</SelectItem>
            <SelectItem value="7">{t("last7days")}</SelectItem>
            <SelectItem value="30">{t("last30days")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">{t("totalOrders")}</p>
          <p className="text-3xl font-bold mt-2">{data?.totalOrders ?? 0}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">{t("tasksHandled")}</p>
          <p className="text-3xl font-bold mt-2">{data?.totalTasks ?? 0}</p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">{t("employeePerformance")}</h2>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={data?.empData ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="oklch(0.55 0.16 255)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">{t("status")}</h2>
        <div className="h-72">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data?.statusData ?? []} dataKey="value" nameKey="name" outerRadius={100} label={(e: any) => t(e.name as never)}>
                {(data?.statusData ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend formatter={(v: string) => t(v as never)} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
