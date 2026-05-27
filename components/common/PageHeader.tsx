import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  /** Primary heading displayed on the left */
  title: string;
  /** Optional secondary line below the title (e.g. record count, breadcrumb) */
  subtitle?: string;
  /** Buttons / controls rendered on the right */
  actions?: ReactNode;
  className?: string;
};

/**
 * Standard page header — title + optional subtitle on the left, action buttons on the right.
 *
 * @example
 * <PageHeader
 *   title="User Management"
 *   subtitle="42 users"
 *   actions={<Button onClick={openCreate}>Add User</Button>}
 * />
 */
export default function PageHeader({ title, subtitle, actions, className }: Props) {
  return (
    <div
      className={cn(
        "card-premium border border-base-300 rounded-xl shadow-sm px-5 py-4 mb-6",
        "flex items-center justify-between gap-4",
        className,
      )}
    >
      <div className="flex flex-col min-w-0">
        <h1 className="text-base md:text-lg font-bold text-primary leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] md:text-xs text-neutral mt-0.5">{subtitle}</p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
