import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Package, Users, BarChart3, LogOut, Satellite, Languages, ClipboardCheck, Truck, AlertCircle } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, isManager, roles } = useAuth();
  const { t, lang, setLang } = useI18n();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const items = [
    { to: "/dashboard", label: t("dashboard"), icon: LayoutDashboard, show: true },
    { to: "/orders", label: t("orders"), icon: Package, show: true },
    { to: "/audit", label: t("audit"), icon: ClipboardCheck, show: isManager || roles.includes("auditor") },
    { to: "/delivery", label: t("delivery"), icon: Truck, show: isManager || roles.includes("delivery") },
    { to: "/issues", label: t("issues"), icon: AlertCircle, show: isManager || roles.includes("support") || roles.includes("receptionist") },
    { to: "/employees", label: t("employees"), icon: Users, show: isManager },
    { to: "/reports", label: t("reports"), icon: BarChart3, show: isManager },
  ].filter((i) => i.show);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-gold)" }}>
            <Satellite className="h-4 w-4" style={{ color: "var(--accent-foreground)" }} />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sidebar-foreground truncate">{t("appName")}</div>
              <div className="text-xs text-sidebar-foreground/60 truncate">{t("tagline")}</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={path === item.to}>
                    <Link to={item.to} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex flex-col gap-2 p-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-sidebar-foreground hover:bg-sidebar-accent justify-start"
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          >
            <Languages className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="ms-2">{lang === "ar" ? "English" : "العربية"}</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-sidebar-foreground hover:bg-sidebar-accent justify-start"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="ms-2">{t("logout")}</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}