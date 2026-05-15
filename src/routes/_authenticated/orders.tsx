import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { Plus, Search, ImagePlus, Users, ArrowLeft, Package, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { fmtIQD } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/orders")({ component: OrdersPage });

const IN_PROGRESS_STATUSES = ["new", "pending_audit", "audited_printed", "in_delivery", "processing"];
const COMPLETED_STATUSES = ["delivered", "completed", "activated"];

function OrdersPage() {
  const { isManager } = useAuth();
  return isManager ? <ManagerOrdersView /> : <EmployeeOrdersView />;
}

/* ============================================================
   MANAGER VIEW — list of employees, click for details
   ============================================================ */
function ManagerOrdersView() {
  const { t } = useI18n();
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

  const { data: employees } = useQuery({
    queryKey: ["manager-employees-with-stats"],
    queryFn: async () => {
      const [{ data: orders }, { data: profiles }] = await Promise.all([
        supabase.from("orders").select("created_by, price, is_image_order, device_name"),
        supabase.from("profiles").select("id, full_name"),
      ]);
      const map = new Map<string, { id: string; name: string; orders: number; devices: number; total: number }>();
      for (const p of profiles ?? []) {
        map.set(p.id, { id: p.id, name: p.full_name ?? "—", orders: 0, devices: 0, total: 0 });
      }
      for (const o of orders ?? []) {
        const id = (o as any).created_by;
        if (!id) continue;
        const cur = map.get(id) ?? { id, name: "—", orders: 0, devices: 0, total: 0 };
        cur.orders += 1;
        if ((o as any).device_name && !(o as any).is_image_order) cur.devices += 1;
        cur.total += Number((o as any).price ?? 0);
        map.set(id, cur);
      }
      return Array.from(map.values()).sort((a, b) => b.orders - a.orders);
    },
  });

  if (selected) {
    return (
      <EmployeeDetail
        employeeId={selected.id}
        employeeName={selected.name}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />{t("orders")}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(employees ?? []).length === 0 && (
          <Card className="p-10 text-center text-muted-foreground col-span-full">{t("noData")}</Card>
        )}
        {(employees ?? []).map((e) => (
          <Card
            key={e.id}
            className="p-5 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
            onClick={() => setSelected({ id: e.id, name: e.name })}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-lg truncate">{e.name}</h3>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("ordersReceivedCount")}</p>
                    <p className="text-xl font-bold">{e.orders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("devicesEnteredCount")}</p>
                    <p className="text-xl font-bold">{e.devices}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("ordersPriceSum")}</p>
                    <p className="text-sm font-bold">{e.total.toLocaleString("en-US")}</p>
                  </div>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EmployeeDetail({ employeeId, employeeName, onBack }: { employeeId: string; employeeName: string; onBack: () => void }) {
  const { t, lang } = useI18n();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customDate, setCustomDate] = useState<string>("");

  const { data: orders } = useQuery({
    queryKey: ["manager-employee-orders", employeeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("created_by", employeeId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const list = orders ?? [];
    const now = new Date();
    const startOf = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
    let from: Date | null = null, to: Date | null = null;
    if (dateFilter === "today") { from = startOf(now); to = new Date(from); to.setDate(to.getDate()+1); }
    else if (dateFilter === "yesterday") { to = startOf(now); from = new Date(to); from.setDate(from.getDate()-1); }
    else if (dateFilter === "dayBefore") { const t1 = startOf(now); t1.setDate(t1.getDate()-1); to = t1; from = new Date(to); from.setDate(from.getDate()-1); }
    else if (dateFilter === "week") { from = startOf(now); from.setDate(from.getDate()-7); to = new Date(now); }
    else if (dateFilter === "custom" && customDate) { from = new Date(customDate); from.setHours(0,0,0,0); to = new Date(from); to.setDate(to.getDate()+1); }

    return list.filter((o: any) => {
      if (from && to) {
        const c = new Date(o.created_at);
        if (c < from || c >= to) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (!`${o.device_name ?? ""} ${o.customer_name ?? ""}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [orders, dateFilter, customDate, search]);

  const deviceBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; count: number; price: number; total: number }>();
    for (const o of filtered) {
      const name = (o as any).device_name ?? "—";
      const price = Number((o as any).price ?? 0);
      const cur = map.get(name) ?? { name, count: 0, price, total: 0 };
      cur.count += 1;
      cur.total += price;
      cur.price = price;
      map.set(name, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const grandTotal = filtered.reduce((s, o: any) => s + Number(o.price ?? 0), 0);
  const devicesEntered = filtered.filter((o: any) => o.device_name && !o.is_image_order).length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 me-1" />{t("backToList")}
          </Button>
          <h1 className="text-xl md:text-2xl font-bold">{employeeName}</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{t("ordersReceivedCount")}</p>
          <p className="text-2xl font-bold mt-1">{filtered.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{t("devicesEnteredCount")}</p>
          <p className="text-2xl font-bold mt-1">{devicesEntered}</p>
        </Card>
        <Card className="p-4 col-span-2 lg:col-span-1">
          <p className="text-sm text-muted-foreground">{t("grandTotal")}</p>
          <p className="text-2xl font-bold mt-1">{fmtIQD(grandTotal, lang)}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
            <Input className="ps-9" placeholder={t("searchByDevice")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allDates")}</SelectItem>
              <SelectItem value="today">{t("today")}</SelectItem>
              <SelectItem value="yesterday">{t("yesterday")}</SelectItem>
              <SelectItem value="dayBefore">{t("dayBeforeYesterday")}</SelectItem>
              <SelectItem value="week">{t("thisWeek")}</SelectItem>
              <SelectItem value="custom">{t("customDate")}</SelectItem>
            </SelectContent>
          </Select>
          {dateFilter === "custom" && (
            <Input type="date" className="w-[170px]" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
          )}
        </div>
      </Card>

      {/* Device breakdown */}
      <Card className="p-5">
        <h2 className="font-semibold text-lg mb-3">{t("devicesBreakdown")}</h2>
        {deviceBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{t("noData")}</p>
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
                {deviceBreakdown.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.count}</TableCell>
                    <TableCell>{fmtIQD(d.price, lang)}</TableCell>
                    <TableCell className="font-semibold">{fmtIQD(d.total, lang)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Orders list */}
      <Card className="p-5">
        <h2 className="font-semibold text-lg mb-3">{t("employeeOrders")}</h2>
        <div className="grid gap-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t("noData")}</p>
          ) : (
            filtered.map((o: any) => (
              <div key={o.id} className="flex flex-wrap items-start gap-3 p-3 rounded-lg border">
                {o.image_url && (
                  <a href={o.image_url} target="_blank" rel="noreferrer" className="shrink-0">
                    <img src={o.image_url} alt="" className="h-20 w-20 object-cover rounded-md border" />
                  </a>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono">#{o.order_number}</Badge>
                    {o.device_name && <span className="font-semibold">{o.device_name}</span>}
                    {Number(o.price) > 0 && <span className="text-sm font-semibold">{fmtIQD(o.price, lang)}</span>}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {o.customer_name && <span>{t("customer")}: {o.customer_name}</span>}
                    <span>{new Date(o.created_at).toLocaleString(lang === "ar" ? "ar-IQ" : "en-US")}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   EMPLOYEE VIEW — Add buttons + 3 status tabs
   ============================================================ */
function EmployeeOrdersView() {
  const { t, lang } = useI18n();
  const { user, roles } = useAuth();
  const [open, setOpen] = useState(false);
  const [imgOpen, setImgOpen] = useState(false);
  const [view, setView] = useState<"today" | "inProgress" | "completed" | null>(null);
  const canAdd = roles.includes("receptionist");

  const { data: orders } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const list = orders ?? [];
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayCount = list.filter((o: any) => new Date(o.created_at) >= todayStart).length;
  const inProgressCount = list.filter((o: any) => IN_PROGRESS_STATUSES.includes(o.status)).length;
  const completedCount = list.filter((o: any) => COMPLETED_STATUSES.includes(o.status)).length;

  const filtered = list.filter((o: any) => {
    if (view === "today") return new Date(o.created_at) >= todayStart;
    if (view === "inProgress") return IN_PROGRESS_STATUSES.includes(o.status);
    if (view === "completed") return COMPLETED_STATUSES.includes(o.status);
    return false;
  });

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">{t("orders")}</h1>
        {canAdd && (
          <div className="flex flex-wrap gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 me-1" />{t("addOrder")}</Button>
              </DialogTrigger>
              <NewOrderDialog onClose={() => setOpen(false)} />
            </Dialog>
            <Dialog open={imgOpen} onOpenChange={setImgOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary"><ImagePlus className="h-4 w-4 me-1" />{t("addImage")}</Button>
              </DialogTrigger>
              <NewImageDialog onClose={() => setImgOpen(false)} userId={user?.id} />
            </Dialog>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <TabCard
          icon={Package} active={view === "today"} label={t("todaysOrders")}
          value={todayCount} onClick={() => setView(view === "today" ? null : "today")}
        />
        <TabCard
          icon={Clock} active={view === "inProgress"} label={t("inProgress")}
          value={inProgressCount} onClick={() => setView(view === "inProgress" ? null : "inProgress")}
        />
        <TabCard
          icon={CheckCircle2} active={view === "completed"} label={t("completedOrders")}
          value={completedCount} onClick={() => setView(view === "completed" ? null : "completed")}
        />
      </div>

      {view && (
        <div className="grid gap-3">
          {filtered.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">{t("noData")}</Card>
          ) : (
            filtered.map((o: any) => (
              <Card key={o.id} className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  {o.image_url && (
                    <a href={o.image_url} target="_blank" rel="noreferrer" className="shrink-0">
                      <img src={o.image_url} alt="" className="h-20 w-20 object-cover rounded-md border" />
                    </a>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono">#{o.order_number}</Badge>
                      {o.device_name && <span className="font-semibold">{o.device_name}</span>}
                      {Number(o.price) > 0 && <span className="text-sm font-semibold">{fmtIQD(o.price, lang)}</span>}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {o.customer_name && <span>{t("customer")}: {o.customer_name}</span>}
                      {o.customer_phone && o.customer_phone !== "-" && <span dir="ltr">{o.customer_phone}</span>}
                      <span>{new Date(o.created_at).toLocaleString(lang === "ar" ? "ar-IQ" : "en-US")}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TabCard({
  icon: Icon, label, value, active, onClick,
}: { icon: any; label: string; value: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-start p-4 rounded-xl border transition-all ${
        active ? "border-primary bg-primary/5 shadow-sm" : "bg-card hover:border-primary/40"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-xs md:text-sm text-muted-foreground mt-2">{label}</p>
    </button>
  );
}

/* ============================================================
   Dialogs (unchanged)
   ============================================================ */
function NewOrderDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deviceName, setDeviceName] = useState("جهاز ستلايت");
  const [price, setPrice] = useState("");
  const [address, setAddress] = useState("");
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
        device_name: deviceName,
        product: deviceName,
        price: price ? Number(price) : 0,
        address: address || null,
        source,
        notes: notes || null,
        status: "pending_audit",
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
    qc.invalidateQueries({ queryKey: ["my-orders"] });
    qc.invalidateQueries({ queryKey: ["audit-orders"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    setBusy(false);
    onClose();
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{t("addOrder")}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div><Label>{t("deviceName")}</Label><Input required value={deviceName} onChange={(e) => setDeviceName(e.target.value)} /></div>
        <div><Label>{t("price")}</Label><Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        <div><Label>{t("customerName")}</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>{t("customerPhone")}</Label><Input required value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div><Label>{t("address")}</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
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

function NewImageDialog({ onClose, userId }: { onClose: () => void; userId?: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !userId) return;
    setBusy(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await supabase.storage.from("order-images").upload(path, file, { contentType: file.type });
    if (up.error) { toast.error(up.error.message); setBusy(false); return; }
    const { data: pub } = supabase.storage.from("order-images").getPublicUrl(path);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_name: t("imageOrder"),
        customer_phone: "-",
        device_name: t("imageOrder"),
        product: "image",
        price: 0,
        source: "image",
        notes: notes || null,
        status: "pending_audit",
        image_url: pub.publicUrl,
        is_image_order: true,
        created_by: userId,
      })
      .select()
      .single();
    if (error) { toast.error(error.message); setBusy(false); return; }
    if (data) {
      await supabase.from("tasks").insert({
        order_id: data.id, employee_id: userId, task_type: "order_received",
        description: `image #${data.order_number}`,
      });
    }
    toast.success(t("saved"));
    qc.invalidateQueries({ queryKey: ["my-orders"] });
    qc.invalidateQueries({ queryKey: ["audit-orders"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    setBusy(false);
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{t("addImage")}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label>{t("image")}</Label>
          <Input
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div><Label>{t("notes")}</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
          <Button type="submit" disabled={busy || !file}>{t("save")}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}