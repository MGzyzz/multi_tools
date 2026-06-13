import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  Navigate,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";

import appCss from "../styles.css?url";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lectern — Teacher workspace" },
      {
        name: "description",
        content:
          "A calm, professional workspace for teachers: schedule, attendance, groups, students, and analytics.",
      },
      { name: "author", content: "Lectern" },
      { property: "og:title", content: "Lectern — Teacher workspace" },
      {
        property: "og:description",
        content: "Schedule, attendance, groups, and analytics for educators.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <Navigate to="/error" search={{ code: "404", message: undefined }} replace />
  ),
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var root=document.documentElement;var t=localStorage.getItem('theme');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark')root.classList.add('dark');else root.classList.remove('dark');var l=localStorage.getItem('lang');if(l!=='en'&&l!=='ru'&&l!=='kk'){var b=(navigator.language||'en').slice(0,2).toLowerCase();l=b==='ru'?'ru':(b==='kk'||b==='kz'?'kk':'en');}root.lang=l;}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <BootstrapBoundary />
      </I18nProvider>
    </ThemeProvider>
  );
}

const BARE_ROUTES = new Set(["/", "/docs", "/login", "/signup", "/error"]);
const isBareRoute = (pathname: string) => BARE_ROUTES.has(pathname);

function BootstrapBoundary() {
  const [hydrated, setHydrated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Bare routes (login / signup / error / landing / docs) have no app chrome and
  // don't depend on client-only state, so render them immediately instead of
  // flashing the boot splash on first load.
  if (!hydrated && !isBareRoute(location.pathname)) return <AppBootSplash />;

  return (
    <>
      <ChromeOrOutlet />
      <Toaster />
    </>
  );
}

function AppBootSplash() {
  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen place-items-center px-6">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card/80 p-6 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-primary/15" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-2.5 w-36 animate-pulse rounded bg-muted/70" />
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <div className="h-10 animate-pulse rounded-xl bg-muted/80" />
            <div className="h-10 animate-pulse rounded-xl bg-muted/60" />
            <div className="h-10 animate-pulse rounded-xl bg-muted/40" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChromeOrOutlet() {
  const location = useLocation();
  if (isBareRoute(location.pathname)) return <Outlet />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
