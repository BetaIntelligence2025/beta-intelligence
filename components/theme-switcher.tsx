"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const { setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
    // Forçar o tema claro
    setTheme("light");
  }, [setTheme]);

  if (!mounted) {
    return null;
  }

  const ICON_SIZE = 16;

  return (
    <Button variant="ghost" size={"sm"} disabled>
      <Sun
        key="light"
        size={ICON_SIZE}
        className={"text-muted-foreground"}
      />
    </Button>
  );
};

export { ThemeSwitcher };
