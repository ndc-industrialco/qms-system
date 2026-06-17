"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CarFormDrawer from "./CarFormDrawer";

export default function CarFormDrawerTrigger() {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-1.5" />
        {t("car.form.btnCreate")}
      </Button>
      <CarFormDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
