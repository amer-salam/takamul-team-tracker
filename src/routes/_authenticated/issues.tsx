import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/issues")({ component: IssuesPage });

function IssuesPage() {
  const { t } = useI18n();
  const { isManager, roles, user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const allowed = isManager || roles.includes("support") || roles.includes("receptionist");

  useEffect(() => { if (!loading && !allowed) navigate({ to: "/dashboard" }); }, [loading, allowed, navigate]);

  const [open, setOpen] = useState(false);

  const { data: issues } = useQuery({
    queryKey: ["issues"],
    enabled: allowed,
    queryFn: async () => {
      const { data } = await supabase.from("issues").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const resolve = async (id: string) => {
    const note = window.prompt(t("resolutionNotes")) ?? null;
    const { error } = await supabase
      .from("issues")
      .update({ status: "resolved", resolution_notes: note, resolved_by: user?.id, resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (user) {
      await supabase.from("tasks").insert({ employee_id: user.id, task_type: "issue_resolved", description: note ?? undefined });
    }
    toast.success(t("saved"));
    qc.invalidateQueries({ queryKey: ["issues"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  if (!allowed) return null;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">{t("issuesAndProblems")}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 me-1" />{t("addIssue")}</Button>
          </DialogTrigger>
          <NewIssueDialog onClose={() => setOpen(false)} />
        </Dialog>
      </div>

      <div className="grid gap-3">
        {(issues ?? []).length === 0 && <Card className="p-10 text-center text-muted-foreground">{t("noData")}</Card>}
        {(issues ?? []).map((i: any) => (
          <Card key={i.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <AlertCircle className="h-4 w-4 text-warning-foreground" />
                  <h3 className="font-semibold">{i.title}</h3>
                  <Badge variant={i.status === "resolved" ? "secondary" : "outline"} className={i.status === "open" ? "bg-warning/20 border-warning/40" : ""}>
                    {t(i.status as never)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {i.customer_name} {i.customer_phone && <span dir="ltr"> — {i.customer_phone}</span>}
                </div>
                {i.description && <p className="text-sm mt-2">{i.description}</p>}
                {i.resolution_notes && (
                  <p className="text-sm mt-2 p-2 bg-success/10 rounded border border-success/30">
                    <CheckCircle2 className="inline h-4 w-4 me-1 text-success" />
                    {i.resolution_notes}
                  </p>
                )}
              </div>
              {i.status === "open" && (isManager || roles.includes("support")) && (
                <Button size="sm" onClick={() => resolve(i.id)}>
                  <CheckCircle2 className="h-4 w-4 me-1" />{t("markResolved")}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NewIssueDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", title: "", description: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.from("issues").insert({ ...form, created_by: user?.id });
    if (error) { toast.error(error.message); setBusy(false); return; }
    if (user) await supabase.from("tasks").insert({ employee_id: user.id, task_type: "issue_received", description: form.title });
    toast.success(t("saved"));
    qc.invalidateQueries({ queryKey: ["issues"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    setBusy(false); onClose();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{t("addIssue")}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div><Label>{t("customerName")}</Label><Input required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
        <div><Label>{t("customerPhone")}</Label><Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></div>
        <div><Label>{t("issueTitle")}</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label>{t("issueDesc")}</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
          <Button type="submit" disabled={busy}>{t("save")}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
