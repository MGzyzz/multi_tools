import { redirect } from "@tanstack/react-router";
import { isAuthenticated } from "@/lib/auth";

type RouteLocation = {
  href: string;
};

export const requireAuth = ({ location }: { location: RouteLocation }) => {
  if (typeof window === "undefined") return;

  if (!isAuthenticated()) {
    throw redirect({
      to: "/login",
      search: { redirect: location.href },
    });
  }
};

export const redirectIfAuthenticated = () => {
  if (typeof window === "undefined") return;

  if (isAuthenticated()) {
    throw redirect({ to: "/dashboard" });
  }
};

export const sanitizeRedirectTarget = (target?: string) => {
  if (!target) return "/dashboard";
  if (!target.startsWith("/")) return "/dashboard";
  if (target.startsWith("//")) return "/dashboard";
  if (target.startsWith("/login")) return "/dashboard";
  if (target === "/") return "/dashboard";
  return target;
};
