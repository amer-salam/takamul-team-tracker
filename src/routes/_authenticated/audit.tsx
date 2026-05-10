import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Printer, CheckCircle2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

export const Route = createFileRoute("/_authenticated/audit")({ component: AuditPage });

function AuditPage() {
  const { t, lang } = useI18n();
  const { isManager, roles, user, loading } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const allowed = isManager || roles.includes("auditor");

  useEffect(() => { if (!loading && !allowed) navigate({ to: "/dashboard" }); }, [loading, allowed, navigate]);

  const { data: orders } = useQuery({
    queryKey: ["audit-orders"],
    enabled: allowed,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .in("status", ["new", "pending_audit"])
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const updateOrder = async (id: string, patch: any) => {
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  const markAudited = async (o: any) => {
    const ok = await updateOrder(o.id, { status: "audited_printed", assigned_auditor: user?.id });
    if (!ok) return;
    if (user) {
      await supabase.from("tasks").insert({
        order_id: o.id, employee_id: user.id, task_type: "audit_done",
        description: `#${o.order_number} ${o.customer_name}`,
      });
    }
    toast.success(t("saved"));
    qc.invalidateQueries({ queryKey: ["audit-orders"] });
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const printReceipt = (o: any) => {
    const doc = new jsPDF({ unit: "mm", format: "a5" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Rawan Crop", 105, 15, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Receipt / Order #${o.order_number}`, 105, 23, { align: "center" });
    doc.line(15, 28, 195, 28);
    let y = 36;
    const rows: [string, string][] = [
      ["Order #", String(o.order_number)],
      ["Date", new Date(o.created_at).toLocaleString("en")],
      ["Customer", o.customer_name],
      ["Phone", o.customer_phone],
      ["Address", o.address ?? "-"],
      ["Device", o.device_name ?? o.product ?? "-"],
      ["Price", String(o.price ?? 0)],
      ["Notes", o.notes ?? "-"],
    ];
    rows.forEach(([k, v]) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${k}:`, 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(v), 55, y, { maxWidth: 130 });
      y += 9;
    });
    doc.save(`order-${o.order_number}.pdf`);
  };

  if (!allowed) return null;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold">{t("audit")}</h1>
      <div className="grid gap-3">
        {(orders ?? []).length === 0 && (
          <Card className="p-10 text-center text-muted-foreground">{t("noData")}</Card>
        )}
        {(orders ?? []).map((o: any) => (
          <AuditCard key={o.id} order={o} onMark={markAudited} onPrint={printReceipt} onSave={async (patch: any) => {
            const ok = await updateOrder(o.id, patch);
            if (ok) { toast.success(t("saved")); qc.invalidateQueries({ queryKey: ["audit-orders"] }); }
          }} />
        ))}
      </div>
    </div>
  );
}

function AuditCard({ order, onMark, onPrint, onSave }: any) {
  const { t, lang } = useI18n();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    device_name: order.device_name ?? "",
    price: order.price ?? 0,
    address: order.address ?? "",
    notes: order.notes ?? "",
  });

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">#{order.order_number}</Badge>
          <Badge>{t(order.status as never)}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
            <Pencil className="h-4 w-4 me-1" />{t("edit")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onPrint(order)}>
            <Printer className="h-4 w-4 me-1" />{t("print")}
          </Button>
          <Button size="sm" onClick={() => onMark(order)}>
            <CheckCircle2 className="h-4 w-4 me-1" />{t("markAudited")}
          </Button>
        </div>
      </div>
      {editing ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {(["customer_name", "customer_phone", "device_name", "address"] as const).map((k) => (
            <div key={k}><Label>{t(k === "customer_name" ? "customerName" : k === "customer_phone" ? "customerPhone" : k === "device_name" ? "deviceName" : "address")}</Label><Input value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
          ))}
          <div><Label>{t("price")}</Label><Input type="number" value={String(form.price)} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
          <div className="sm:col-span-2"><Label>{t("notes")}</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>{t("cancel")}</Button>
            <Button size="sm" onClick={async () => { await onSave(form); setEditing(false); }}>{t("save")}</Button>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <div><span className="text-muted-foreground">{t("customerName")}:</span> {order.customer_name}</div>
          <div dir="ltr"><span className="text-muted-foreground">{t("customerPhone")}:</span> {order.customer_phone}</div>
          <div><span className="text-muted-foreground">{t("deviceName")}:</span> {order.device_name ?? "—"}</div>
          <div><span className="text-muted-foreground">{t("price")}:</span> {Number(order.price ?? 0).toLocaleString(lang === "ar" ? "ar" : "en")}</div>
          <div className="sm:col-span-2"><span className="text-muted-foreground">{t("address")}:</span> {order.address ?? "—"}</div>
          {order.notes && <div className="sm:col-span-2"><span className="text-muted-foreground">{t("notes")}:</span> {order.notes}</div>}
        </div>
      )}
    </Card>
  );
}
