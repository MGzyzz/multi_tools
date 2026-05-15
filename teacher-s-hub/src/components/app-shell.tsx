import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarCheck2,
  Users,
  GraduationCap,
  CalendarDays,
  BarChart3,
  UserCircle2,
  Sun,
  Moon,
  Menu,
  ChevronRight,
  LogOut,
  ScanFace,
  Settings2,
  Send,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import {
  AUTH_USER_UPDATED_EVENT,
  getStoredUser,
  getUserDisplayName,
  getUserInitials,
  logout,
  type AuthUser,
} from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationsButton } from "@/components/notifications-button";
import { LanguageSwitcher } from "@/components/language-switcher";

type GroupKey = "Workspace" | "Attendance" | "Teaching" | "Account";

type NavItem = {
  to: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  group: GroupKey;
  badge?: string;
};

const nav: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, group: "Workspace" },
  { to: "/schedule", labelKey: "nav.schedule", icon: CalendarDays, group: "Workspace" },
  { to: "/attendance", labelKey: "nav.attendance", icon: CalendarCheck2, group: "Attendance" },
  { to: "/scan", labelKey: "nav.scan", icon: ScanFace, group: "Attendance", badge: "AI" },
  { to: "/groups", labelKey: "nav.groups", icon: Users, group: "Teaching" },
  { to: "/students", labelKey: "nav.students", icon: GraduationCap, group: "Teaching" },
  { to: "/analytics", labelKey: "nav.analytics", icon: BarChart3, group: "Teaching" },
  { to: "/broadcast", labelKey: "nav.broadcast", icon: Send, group: "Account" },
  { to: "/settings", labelKey: "nav.settings", icon: Settings2, group: "Account" },
  { to: "/profile", labelKey: "nav.profile", icon: UserCircle2, group: "Account" },
];

const groupOrder: GroupKey[] = ["Workspace", "Attendance", "Teaching", "Account"];

const groupKeyMap: Record<GroupKey, string> = {
  Workspace: "nav.group.workspace",
  Attendance: "nav.group.attendance",
  Teaching: "nav.group.teaching",
  Account: "nav.group.account",
};

function Brand() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5 px-2 py-1">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[13px] font-semibold text-primary-foreground">
        L
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-[13px] font-semibold tracking-tight">Lectern</span>
        <span className="text-[10px] text-muted-foreground">Academic operations</span>
      </div>
    </Link>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { t } = useI18n();

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
      {groupOrder.map((group) => (
        <div key={group} className="mb-3">
          <div className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
            {t(groupKeyMap[group])}
          </div>
          <ul className="space-y-px">
            {nav
              .filter((item) => item.group === group)
              .map((item) => {
                const active = location.pathname.startsWith(item.to);
                const Icon = item.icon;

                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/85 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <span className="flex-1 truncate">{t(item.labelKey)}</span>
                      {item.badge && (
                        <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-primary">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserCard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const displayName = getUserDisplayName(user);
  const subtitle = user?.role || user?.email || "Teacher account";

  useEffect(() => {
    setUser(getStoredUser());

    const syncUser = () => {
      setUser(getStoredUser());
    };

    window.addEventListener("storage", syncUser);
    window.addEventListener(AUTH_USER_UPDATED_EVENT, syncUser);
    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener(AUTH_USER_UPDATED_EVENT, syncUser);
    };
  }, []);

  const handleLogout = async () => {
    logout();
    await navigate({ to: "/login", search: { redirect: undefined } });
  };

  return (
    <div className="border-t border-sidebar-border p-2">
      <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-sidebar-accent/60">
        <Link to="/profile" className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
            {getUserInitials(user)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium">{displayName}</div>
            <div className="truncate text-[11px] capitalize text-muted-foreground">{subtitle}</div>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  const location = useLocation();
  const current = nav.find((item) =>
    location.pathname.startsWith(item.to),
  );

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 lg:hidden"
        onClick={onMenu}
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-muted-foreground">
          {current ? t(groupKeyMap[current.group]) : t("nav.group.workspace")}
        </span>
        <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
        <span className="font-medium">{current ? t(current.labelKey) : ""}</span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <NotificationsButton />
        <LanguageSwitcher />
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("topbar.toggleTheme")}
          onClick={toggle}
          className="h-8 w-8"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="px-3 py-3">
          <Brand />
        </div>
        <SidebarNav />
        <UserCard />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-sidebar-border bg-sidebar">
            <div className="px-3 py-3">
              <Brand />
            </div>
            <SidebarNav onNavigate={() => setOpen(false)} />
            <UserCard />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-background px-4 py-4 sm:flex-row sm:items-end sm:justify-between lg:px-6">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h1>
        {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="px-4 py-5 lg:px-6">{children}</div>;
}
