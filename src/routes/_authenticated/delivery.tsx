import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Truck, CheckCircle2, RotateCcw, DollarSign, Package, Wallet } from "lucide-react";
import { toast } from "sonner";
import { fmtIQD, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/delivery")({ component: DeliveryPage });

function DeliveryPage() {
  const { t, lang } = useI18n();
  const { isManager, roles, user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const allowed = isManager || roles.includes("delivery");

  useEffect(() => { if (!loading && !allowed) navigate({ to: "/dashboard" }); }, [loading, allowed, navigate]);

  const { data: allOrders } = useQuery({
    queryKey: ["delivery-all-orders"],
    enabled: allowed,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, customer_phone, address, price, status, created_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const list = allOrders ?? [];
    const delivered = list.filter((o: any) => ["delivered", "completed", "activated"].includes(o.status));
    const returned = list.filter((o: any) => o.status === "returned");
    const deliveredCount = delivered.length;
    const returnedCount = returned.length;
    const totalRevenue = delivered.reduce((s, o: any) => s + Number(o.price ?? 0), 0);
    const returnedValue = returned.reduce((s, o: any) => s + Number(o.price ?? 0), 0);
    return {
      deliveredCount,
      returnedCount,
      totalRevenue,
      returnedValue,
      finalTotal: totalRevenue - returnedValue,
    };
  }, [allOrders]);

  const ready = useMemo(
    () => (allOrders ?? []).filter((o: any) => ["audited_printed", "in_delivery"].includes(o.status)),
    [allOrders],
  );

  const setOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any, assigned_delivery: user?.id }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("tasks").insert({
      employee_id: user!.id, task_type: "delivery_done",
      description: `#${id.slice(0, 8)} → ${status}`,
    });
    toast.success(t("saved"));
    qc.invalidateQueries({ queryKey: ["delivery-all-orders"] });
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  if (!allowed) return null;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold">{t("delivery")}</h1>

      <div>
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Truck className="h-5 w-5" />{t("deliveryStats")}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard icon={Package} label={t("deliveredCount")} value={fmtNum(stats.deliveredCount)} tone="oklch(0.6 0.16 155)" />
          <StatCard icon={DollarSign} label={t("totalRevenue")} value={fmtIQD(stats.totalRevenue, lang)} tone="oklch(0.55 0.16 255)" />
          <StatCard icon={RotateCcw} label={t("returnedCount")} value={fmtNum(stats.returnedCount)} tone="oklch(0.6 0.22 25)" />
          <StatCard icon={RotateCcw} label={t("returnedValue")} value={fmtIQD(stats.returnedValue, lang)} tone="oklch(0.65 0.2 30)" />
          <StatCard icon={Wallet} label={t("finalTotal")} value={fmtIQD(stats.finalTotal, lang)} tone="var(--gradient-gold)" />
        </div>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">{t("orders")} — {t("audited_printed")}</h2>
        <div className="grid gap-2">
          {ready.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">{t("noData")}</p>}
          {ready.map((o: any) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border">
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <Badge variant="outline" className="font-mono">#{o.order_number}</Badge>
                <span className="font-medium">{o.customer_name}</span>
                <span className="text-muted-foreground" dir="ltr">{o.customer_phone}</span>
                {o.address && <span className="text-muted-foreground">📍 {o.address}</span>}
                {Number(o.price) > 0 && <span className="font-semibold">{fmtIQD(o.price, lang)}</span>}
                <Badge className="text-xs">{t(o.status as never)}</Badge>
              </div>
              <div className="flex gap-2 flex-wrap">
                {o.status === "audited_printed" && <Button size="sm" variant="outline" onClick={() => setOrderStatus(o.id, "in_delivery")}>{t("markInDelivery")}</Button>}
                <Button size="sm" onClick={() => setOrderStatus(o.id, "delivered")}>{t("markDelivered")}</Button>
                <Button size="sm" variant="destructive" onClick={() => setOrderStatus(o.id, "returned")}>{t("markReturned")}</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg md:text-xl font-bold mt-1 truncate">{value}</p>
        </div>
        <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: tone }}>
          <Icon className="h-4 w-4 text-primary-foreground" />
        </div>
      </div>
    </Card>
  );
}
