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
    throw redirect({ to: "/" });
  }
};

export const sanitizeRedirectTarget = (target?: string) => {
  if (!target) return "/";
  if (!target.startsWith("/")) return "/";
  if (target.startsWith("//")) return "/";
  if (target.startsWith("/login")) return "/";
  return target;
};
