import { Languages, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n, languages, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  const current = languages.find((l) => l.code === lang) ?? languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t("topbar.language")}
          className="h-8 gap-1.5 px-2 text-[12px] font-medium"
        >
          <Languages className="h-4 w-4" />
          <span className="hidden font-mono text-[10px] font-semibold tracking-wider text-muted-foreground sm:inline">
            {current.flag}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("topbar.language")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {languages.map((l) => {
          const active = l.code === lang;
          return (
            <DropdownMenuItem
              key={l.code}
              onClick={() => setLang(l.code as Lang)}
              className="cursor-pointer gap-2 text-[13px]"
            >
              <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground">
                {l.flag}
              </span>
              <span className="flex-1">{l.native}</span>
              <Check
                className={cn(
                  "h-3.5 w-3.5 text-primary transition-opacity",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
