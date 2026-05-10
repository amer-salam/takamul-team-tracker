import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Truck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/delivery")({ component: DeliveryPage });

function DeliveryPage() {
  const { t, lang } = useI18n();
  const { isManager, roles, user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const allowed = isManager || roles.includes("delivery");

  useEffect(() => { if (!loading && !allowed) navigate({ to: "/dashboard" }); }, [loading, allowed, navigate]);

  const [company, setCompany] = useState("");
  const [count, setCount] = useState("");
  const [pricePer, setPricePer] = useState("");
  const [returned, setReturned] = useState("");

  const { data: ready } = useQuery({
    queryKey: ["delivery-ready"],
    enabled: allowed,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .in("status", ["audited_printed", "in_delivery"])
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: history } = useQuery({
    queryKey: ["delivery-history"],
    enabled: allowed,
    queryFn: async () => {
      const { data } = await supabase
        .from("deliveries")
        .select("*")
        .order("delivery_date", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  const total = useMemo(() => {
    const c = Number(count || 0); const p = Number(pricePer || 0); const r = Number(returned || 0);
    return Math.max(0, (c - r) * p);
  }, [count, pricePer, returned]);

  const submit = async () => {
    if (!company || !count || !pricePer || !user) { toast.error(t("error")); return; }
    const { error } = await supabase.from("deliveries").insert({
      employee_id: user.id,
      company,
      orders_count: Number(count),
      price_per_order: Number(pricePer),
      returned_count: Number(returned || 0),
      total,
    });
    if (error) { toast.error(error.message); return; }
    if (user) {
      await supabase.from("tasks").insert({
        employee_id: user.id, task_type: "delivery_done",
        description: `${company} — ${count} × ${pricePer}`,
      });
    }
    toast.success(t("saved"));
    setCompany(""); setCount(""); setPricePer(""); setReturned("");
    qc.invalidateQueries({ queryKey: ["delivery-history"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const setOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any, assigned_delivery: user?.id }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("saved"));
    qc.invalidateQueries({ queryKey: ["delivery-ready"] });
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  if (!allowed) return null;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold">{t("delivery")}</h1>

      <Card className="p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Truck className="h-5 w-5" />{t("todayDelivery")}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div><Label>{t("deliveryCompany")}</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
          <div><Label>{t("ordersCount")}</Label><Input type="number" value={count} onChange={(e) => setCount(e.target.value)} /></div>
          <div><Label>{t("pricePerOrder")}</Label><Input type="number" step="0.01" value={pricePer} onChange={(e) => setPricePer(e.target.value)} /></div>
          <div><Label>{t("returnedCount")}</Label><Input type="number" value={returned} onChange={(e) => setReturned(e.target.value)} /></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-lg"><span className="text-muted-foreground">{t("total")}: </span><span className="font-bold">{total.toLocaleString(lang === "ar" ? "ar" : "en")}</span></div>
          <Button onClick={submit}><CheckCircle2 className="h-4 w-4 me-1" />{t("submitDelivery")}</Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">{t("orders")} — {t("audited_printed")}</h2>
        <div className="grid gap-2">
          {(ready ?? []).length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">{t("noData")}</p>}
          {(ready ?? []).map((o: any) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="font-mono">#{o.order_number}</Badge>
                <span className="font-medium">{o.customer_name}</span>
                <span className="text-muted-foreground" dir="ltr">{o.customer_phone}</span>
                {o.address && <span className="text-muted-foreground">📍 {o.address}</span>}
                <Badge className="text-xs">{t(o.status as never)}</Badge>
              </div>
              <div className="flex gap-2">
                {o.status === "audited_printed" && <Button size="sm" variant="outline" onClick={() => setOrderStatus(o.id, "in_delivery")}>{t("markInDelivery")}</Button>}
                <Button size="sm" onClick={() => setOrderStatus(o.id, "delivered")}>{t("markDelivered")}</Button>
                <Button size="sm" variant="destructive" onClick={() => setOrderStatus(o.id, "returned")}>{t("markReturned")}</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">{t("deliveryHistory")}</h2>
        <div className="grid gap-2">
          {(history ?? []).length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">{t("noData")}</p>}
          {(history ?? []).map((d: any) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border text-sm">
              <span className="text-muted-foreground">{new Date(d.delivery_date).toLocaleDateString(lang === "ar" ? "ar" : "en")}</span>
              <Badge variant="secondary">{d.company}</Badge>
              <span>{t("ordersCount")}: <b>{d.orders_count}</b></span>
              <span>{t("returnedCount")}: <b>{d.returned_count}</b></span>
              <span>{t("total")}: <b>{Number(d.total).toLocaleString(lang === "ar" ? "ar" : "en")}</b></span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
