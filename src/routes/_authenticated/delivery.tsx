import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Truck, RotateCcw, DollarSign, Package, Wallet, CalendarDays, BarChart3 } from "lucide-react";
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

  if (!allowed) return null;
  if (isManager) return <ManagerDeliveryView />;

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

type DateRangeKey = "today" | "yesterday" | "dayBeforeYesterday" | "thisWeek" | "custom";

function getRange(key: DateRangeKey, custom?: string): { from: Date; to: Date } {
  const now = new Date();
  const startOf = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const endOf = (d: Date) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };
  if (key === "today") return { from: startOf(now), to: endOf(now) };
  if (key === "yesterday") {
    const d = new Date(now); d.setDate(d.getDate() - 1);
    return { from: startOf(d), to: endOf(d) };
  }
  if (key === "dayBeforeYesterday") {
    const d = new Date(now); d.setDate(d.getDate() - 2);
    return { from: startOf(d), to: endOf(d) };
  }
  if (key === "thisWeek") {
    const d = new Date(now);
    const day = d.getDay(); // 0 = Sunday
    d.setDate(d.getDate() - day);
    return { from: startOf(d), to: endOf(now) };
  }
  // custom
  const c = custom ? new Date(custom) : now;
  return { from: startOf(c), to: endOf(c) };
}

function ManagerDeliveryView() {
  const { t, lang } = useI18n();
  const [rangeKey, setRangeKey] = useState<DateRangeKey>("today");
  const [customDate, setCustomDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const range = useMemo(() => getRange(rangeKey, customDate), [rangeKey, customDate]);

  const { data: orders } = useQuery({
    queryKey: ["mgr-delivery-orders", range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, device_name, price, status, created_at")
        .gte("created_at", range.from.toISOString())
        .lte("created_at", range.to.toISOString());
      return data ?? [];
    },
  });

  const { devices, totals } = useMemo(() => {
    const list = orders ?? [];
    const map = new Map<string, { name: string; count: number; price: number; total: number }>();
    let devicesSum = 0;
    let returnsSum = 0;
    for (const o of list as any[]) {
      const name = (o.device_name || "—").trim();
      const price = Number(o.price ?? 0);
      if (o.status === "returned") {
        returnsSum += price;
        continue;
      }
      devicesSum += price;
      const cur = map.get(name) ?? { name, count: 0, price, total: 0 };
      cur.count += 1;
      cur.total += price;
      cur.price = price; // last seen unit price
      map.set(name, cur);
    }
    return {
      devices: Array.from(map.values()).sort((a, b) => b.total - a.total),
      totals: { devicesSum, returnsSum, net: devicesSum - returnsSum },
    };
  }, [orders]);

  const ranges: { key: DateRangeKey; label: string }[] = [
    { key: "today", label: t("today") },
    { key: "yesterday", label: t("yesterday") },
    { key: "dayBeforeYesterday", label: t("dayBeforeYesterday") },
    { key: "thisWeek", label: t("thisWeek") },
    { key: "custom", label: t("customDate") },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold">{t("delivery")}</h1>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 font-semibold">
            <CalendarDays className="h-5 w-5" />{t("dateFilter")}
          </div>
          <ToggleGroup
            type="single"
            value={rangeKey}
            onValueChange={(v) => v && setRangeKey(v as DateRangeKey)}
            className="flex-wrap"
          >
            {ranges.map((r) => (
              <ToggleGroupItem key={r.key} value={r.key} className="text-sm">
                {r.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {rangeKey === "custom" && (
            <div className="flex items-center gap-2">
              <Label className="text-sm">{t("customDate")}</Label>
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />{t("deviceStats")}
        </h2>
        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t("noData")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("deviceName")}</TableHead>
                  <TableHead>{t("deviceCount")}</TableHead>
                  <TableHead>{t("devicePrice")}</TableHead>
                  <TableHead>{t("deviceTotal")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{fmtNum(d.count)}</TableCell>
                    <TableCell>{fmtIQD(d.price, lang)}</TableCell>
                    <TableCell className="font-semibold">{fmtIQD(d.total, lang)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <div>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Wallet className="h-5 w-5" />{t("grandTotal")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard icon={DollarSign} label={t("devicesSum")} value={fmtIQD(totals.devicesSum, lang)} tone="oklch(0.55 0.16 255)" />
          <StatCard icon={RotateCcw} label={t("returnsSum")} value={fmtIQD(totals.returnsSum, lang)} tone="oklch(0.6 0.22 25)" />
          <StatCard icon={Wallet} label={t("netTotal")} value={fmtIQD(totals.net, lang)} tone="var(--gradient-gold)" />
        </div>
      </div>
    </div>
  );
}
