"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationProps = {
  total: number;
  pageSize: number;
  currentPage: number;
  onPageChange?: (page: number) => void;
  hrefBuilder?: (page: number) => string;
  isLoading?: boolean;
};

export function Pagination({
  total,
  pageSize,
  currentPage,
  onPageChange,
  hrefBuilder,
  isLoading = false,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const canChangePage = typeof onPageChange === "function";
  const hasHref = typeof hrefBuilder === "function";

  const goToPage = (page: number) => {
    const target = Math.max(1, Math.min(totalPages, page));
    if (!canChangePage || target === currentPage) {
      return;
    }
    onPageChange(target);
  };

  const disablePrev = currentPage === 1 || isLoading;
  const disableNext = currentPage === totalPages || isLoading;

  const linkClasses = cn(
    "inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2",
    "hover:bg-slate-100",
    "disabled:pointer-events-none disabled:opacity-60"
  );

  const buildHref = (page: number) => {
    if (!hasHref) return "#";
    return hrefBuilder(page);
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm">
      <span className="text-slate-600">Page {currentPage} of {totalPages}</span>
      <div className="flex gap-2">
        {hasHref && !canChangePage ? (
          <Link
            href={buildHref(currentPage - 1)}
            className={cn(linkClasses, disablePrev && "pointer-events-none opacity-60")}
            aria-disabled={disablePrev}
            tabIndex={disablePrev ? -1 : 0}
          >
            Previous
          </Link>
        ) : (
          <Button type="button" variant="outline" disabled={disablePrev} onClick={() => goToPage(currentPage - 1)}>
            Previous
          </Button>
        )}
        {hasHref && !canChangePage ? (
          <Link
            href={buildHref(currentPage + 1)}
            className={cn(linkClasses, disableNext && "pointer-events-none opacity-60")}
            aria-disabled={disableNext}
            tabIndex={disableNext ? -1 : 0}
          >
            Next
          </Link>
        ) : (
          <Button type="button" variant="outline" disabled={disableNext} onClick={() => goToPage(currentPage + 1)}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
