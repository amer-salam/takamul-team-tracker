import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Phone, MessageCircle, Search, KeyRound, CheckCircle2, StickyNote } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/orders")({ component: OrdersPage });

const STATUSES = ["new", "processing", "activated", "completed", "cancelled"] as const;

function statusTone(s: string) {
  switch (s) {
    case "new": return "bg-primary/15 text-primary border-primary/30";
    case "processing": return "bg-warning/20 text-warning-foreground border-warning/40";
    case "activated":
    case "completed": return "bg-success/20 text-success border-success/40";
    case "cancelled": return "bg-destructive/15 text-destructive border-destructive/30";
    default: return "";
  }
}

function OrdersPage() {
  const { t } = useI18n();
  const { user, isManager, roles } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const { data: orders } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = (orders ?? []).filter((o: any) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (search && !`${o.customer_name} ${o.customer_phone} ${o.device_code ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const canAdd = isManager || roles.includes("receptionist");

  const updateStatus = async (orderId: string, status: string, taskType?: "problem_resolved" | "code_activated", desc?: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) { toast.error(error.message); return; }
    if (taskType && user) {
      await supabase.from("tasks").insert({
        order_id: orderId,
        employee_id: user.id,
        task_type: taskType,
        description: desc,
      });
    }
    toast.success(t("saved"));
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    qc.invalidateQueries({ queryKey: ["recent-tasks"] });
    qc.invalidateQueries({ queryKey: ["my-stats"] });
  };

  const activateCode = async (orderId: string) => {
    const code = window.prompt(t("deviceCode"));
    if (!code) return;
    const { error } = await supabase.from("orders").update({ device_code: code, status: "activated" }).eq("id", orderId);
    if (error) { toast.error(error.message); return; }
    if (user) {
      await supabase.from("tasks").insert({
        order_id: orderId, employee_id: user.id, task_type: "code_activated", description: code,
      });
    }
    toast.success(t("saved"));
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["recent-tasks"] });
    qc.invalidateQueries({ queryKey: ["my-stats"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">{t("orders")}</h1>
        {canAdd && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 me-1" />{t("addOrder")}</Button>
            </DialogTrigger>
            <NewOrderDialog onClose={() => setOpen(false)} />
          </Dialog>
        )}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
            <Input className="ps-9" placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allStatuses")}</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(s as never)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="grid gap-3">
        {filtered.length === 0 && (
          <Card className="p-10 text-center text-muted-foreground">{t("noData")}</Card>
        )}
        {filtered.map((o: any) => (
          <Card key={o.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg">{o.customer_name}</h3>
                  <Badge variant="outline" className={statusTone(o.status)}>{t(o.status as never)}</Badge>
                  {o.source === "whatsapp" && <Badge variant="secondary"><MessageCircle className="h-3 w-3 me-1" />{t("whatsapp")}</Badge>}
                  {o.source === "call" && <Badge variant="secondary"><Phone className="h-3 w-3 me-1" />{t("call")}</Badge>}
                </div>
                <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  <span dir="ltr">{o.customer_phone}</span>
                  {o.device_code && <span><KeyRound className="inline h-3 w-3 me-1" />{o.device_code}</span>}
                </div>
                {o.notes && <p className="text-sm mt-2 text-foreground/80">{o.notes}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(roles.includes("support") || isManager) && o.status !== "completed" && (
                  <Button size="sm" variant="outline" onClick={() => {
                    const note = window.prompt(t("addNote")) ?? undefined;
                    updateStatus(o.id, "processing", "problem_resolved", note);
                  }}>
                    <CheckCircle2 className="h-4 w-4 me-1" />{t("markProblemResolved")}
                  </Button>
                )}
                {(roles.includes("activator") || isManager) && o.status !== "activated" && o.status !== "completed" && (
                  <Button size="sm" onClick={() => activateCode(o.id)}>
                    <KeyRound className="h-4 w-4 me-1" />{t("activateCode")}
                  </Button>
                )}
                <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                  <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(s as never)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NewOrderDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [product, setProduct] = useState("جهاز ستلايت");
  const [source, setSource] = useState("call");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_name: name,
        customer_phone: phone,
        product,
        source,
        notes: notes || null,
        created_by: user?.id,
      })
      .select()
      .single();
    if (error) { toast.error(error.message); setBusy(false); return; }
    if (user && data) {
      await supabase.from("tasks").insert({
        order_id: data.id, employee_id: user.id, task_type: "order_received",
        description: `${name} — ${source}`,
      });
    }
    toast.success(t("saved"));
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    qc.invalidateQueries({ queryKey: ["recent-tasks"] });
    qc.invalidateQueries({ queryKey: ["my-stats"] });
    setBusy(false);
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{t("addOrder")}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div><Label>{t("customerName")}</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>{t("customerPhone")}</Label><Input required value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div><Label>{t("product")}</Label><Input value={product} onChange={(e) => setProduct(e.target.value)} /></div>
        <div>
          <Label>{t("source")}</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="call">{t("call")}</SelectItem>
              <SelectItem value="whatsapp">{t("whatsapp")}</SelectItem>
              <SelectItem value="other">{t("other")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>{t("notes")}</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
          <Button type="submit" disabled={busy}>{t("save")}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}