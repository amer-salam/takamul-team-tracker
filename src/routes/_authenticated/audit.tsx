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
import { Printer, CheckCircle2, Pencil, Truck, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { fmtIQD } from "@/lib/format";

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

  const sendToDelivery = async (o: any) => {
    const ok = await updateOrder(o.id, { status: "in_delivery", assigned_auditor: user?.id });
    if (!ok) return;
    toast.success(t("saved"));
    qc.invalidateQueries({ queryKey: ["audit-orders"] });
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["delivery-all-orders"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const printReceipt = (o: any) => {
    const isAr = lang === "ar";
    const labels = isAr
      ? { receipt: "وصل استلام", company: "روان كروب", orderNo: "رقم الطلب", date: "التاريخ", customer: "اسم الزبون", phone: "رقم الهاتف", address: "العنوان", device: "اسم الجهاز", price: "السعر", notes: "ملاحظات", thanks: "شكراً لتعاملكم معنا" }
      : { receipt: "Receipt", company: "Rawan Crop", orderNo: "Order #", date: "Date", customer: "Customer", phone: "Phone", address: "Address", device: "Device", price: "Price", notes: "Notes", thanks: "Thank you for your business" };
    const priceStr = fmtIQD(o.price ?? 0, lang);
    const dateStr = new Date(o.created_at).toLocaleString(isAr ? "ar-IQ" : "en-US");
    const rows = [
      [labels.orderNo, `#${o.order_number}`],
      [labels.date, dateStr],
      [labels.customer, o.customer_name ?? "-"],
      [labels.phone, o.customer_phone ?? "-"],
      [labels.address, o.address ?? "-"],
      [labels.device, o.device_name ?? o.product ?? "-"],
      [labels.price, priceStr],
      [labels.notes, o.notes ?? "-"],
    ];
    const html = `<!DOCTYPE html>
<html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8">
<title>${labels.receipt} #${o.order_number}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 24px; color: #111; background: #fff; }
  .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #1e3a8a; border-radius: 12px; padding: 24px; }
  .head { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 12px; margin-bottom: 16px; }
  .brand { font-size: 28px; font-weight: 700; color: #1e3a8a; }
  .sub { font-size: 14px; color: #475569; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 15px; vertical-align: top; }
  td.k { font-weight: 600; color: #475569; width: 38%; white-space: nowrap; }
  td.v { font-weight: 500; color: #0f172a; }
  .foot { text-align: center; margin-top: 20px; padding-top: 12px; border-top: 2px dashed #cbd5e1; font-size: 13px; color: #64748b; }
  @media print { body { padding: 0; } .receipt { border: none; } @page { margin: 12mm; } }
</style>
</head>
<body>
  <div class="receipt">
    <div class="head">
      <div class="brand">${labels.company}</div>
      <div class="sub">${labels.receipt}</div>
    </div>
    <table>
      ${rows.map(([k, v]) => `<tr><td class="k">${k}</td><td class="v">${String(v).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))}</td></tr>`).join("")}
    </table>
    <div class="foot">${labels.thanks}</div>
  </div>
  <script>window.addEventListener('load', () => setTimeout(() => { window.print(); }, 400));</script>
</body>
</html>`;
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) { toast.error(t("error")); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
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
          <AuditCard key={o.id} order={o} onMark={markAudited} onPrint={printReceipt} onSendDelivery={sendToDelivery} onSave={async (patch: any) => {
            const ok = await updateOrder(o.id, patch);
            if (ok) { toast.success(t("saved")); qc.invalidateQueries({ queryKey: ["audit-orders"] }); }
          }} />
        ))}
      </div>
    </div>
  );
}

function AuditCard({ order, onMark, onPrint, onSendDelivery, onSave }: any) {
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
          <Button size="sm" variant="outline" onClick={() => onMark(order)}>
            <CheckCircle2 className="h-4 w-4 me-1" />{t("markAudited")}
          </Button>
          <Button size="sm" onClick={() => onSendDelivery(order)}>
            <Truck className="h-4 w-4 me-1" />{t("markInDelivery")}
          </Button>
        </div>
      </div>
      {order.image_url && (
        <a href={order.image_url} target="_blank" rel="noreferrer" className="inline-block mb-3">
          <img src={order.image_url} alt="" className="max-h-64 rounded-lg border object-contain" />
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1"><ImageIcon className="h-3 w-3" />{t("viewImage")}</span>
        </a>
      )}
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
          <div><span className="text-muted-foreground">{t("price")}:</span> {fmtIQD(order.price ?? 0, lang)}</div>
          <div className="sm:col-span-2"><span className="text-muted-foreground">{t("address")}:</span> {order.address ?? "—"}</div>
          {order.notes && <div className="sm:col-span-2"><span className="text-muted-foreground">{t("notes")}:</span> {order.notes}</div>}
        </div>
      )}
    </Card>
  );
}
