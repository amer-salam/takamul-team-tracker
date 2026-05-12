import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";
import { useAuth, type AppRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, UserX } from "lucide-react";

export const Route = createFileRoute("/_authenticated/employees")({ component: EmployeesPage });

const ROLES: AppRole[] = ["manager", "receptionist", "auditor", "delivery"];

function EmployeesPage() {
  const { t } = useI18n();
  const { isManager, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => { if (!loading && !isManager) navigate({ to: "/dashboard" }); }, [loading, isManager, navigate]);

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    enabled: isManager,
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, phone, created_at");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const { data: tasks } = await supabase.from("tasks").select("employee_id, task_type");
      return (profiles ?? []).map((p) => {
        const userRoles = (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role) as AppRole[];
        const userTasks = (tasks ?? []).filter((tk) => tk.employee_id === p.id);
        return {
          ...p,
          roles: userRoles,
          stats: {
            ordersReceived: userTasks.filter((tk) => tk.task_type === "order_received").length,
            auditsDone: userTasks.filter((tk) => tk.task_type === "audit_done").length,
            deliveriesDone: userTasks.filter((tk) => tk.task_type === "delivery_done").length,
          },
        };
      });
    },
  });

  const addRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) toast.error(error.message);
    else { toast.success(t("saved")); qc.invalidateQueries({ queryKey: ["employees"] }); }
  };

  const removeRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) toast.error(error.message);
    else { toast.success(t("saved")); qc.invalidateQueries({ queryKey: ["employees"] }); }
  };

  const disableEmployee = async (userId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (error) toast.error(error.message);
    else { toast.success(t("employeeDeleted")); qc.invalidateQueries({ queryKey: ["employees"] }); }
  };

  if (!isManager) return null;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold">{t("employees")}</h1>
      <div className="grid gap-3">
        {(employees ?? []).map((emp) => {
          const available = ROLES.filter((r) => !emp.roles.includes(r));
          return (
            <Card key={emp.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-lg">{emp.full_name ?? "—"}</h3>
                  <p className="text-sm text-muted-foreground" dir="ltr">{emp.phone ?? ""}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {emp.roles.length === 0 && <Badge variant="outline">{t("none")}</Badge>}
                    {emp.roles.map((r) => (
                      <Badge key={r} className="gap-1">
                        {t(r as never)}
                        <button onClick={() => removeRole(emp.id, r)} className="ms-1 hover:opacity-70">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <Stat label={t("ordersReceived")} v={emp.stats.ordersReceived} />
                  <Stat label={t("audit_done")} v={emp.stats.auditsDone} />
                  <Stat label={t("delivery_done")} v={emp.stats.deliveriesDone} />
                </div>
                {available.length > 0 && (
                  <Select onValueChange={(v) => addRole(emp.id, v as AppRole)}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder={t("assignRole")} /></SelectTrigger>
                    <SelectContent>
                      {available.map((r) => <SelectItem key={r} value={r}>{t(r as never)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <UserX className="h-4 w-4 me-1" />{t("disableEmployee")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
                      <AlertDialogDescription>{t("confirmDeleteEmp")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => disableEmployee(emp.id)}>{t("delete")}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="px-3">
      <p className="text-2xl font-bold">{v}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}