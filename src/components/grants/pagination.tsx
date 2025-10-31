"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type PaginationProps = {
  total: number;
  pageSize: number;
  currentPage: number;
};

export function Pagination({ total, pageSize, currentPage }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const params = useMemo(() => new URLSearchParams(searchParams?.toString()), [searchParams]);

  if (totalPages <= 1) return null;

  const goToPage = (page: number) => {
    if (!params) return;
    params.set("page", String(page));
    startTransition(() => {
      const next = params.toString();
      router.push(next ? `${pathname}?${next}` : pathname, { scroll: false });
    });
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm">
      <span className="text-slate-600">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={currentPage === 1 || isPending}
          onClick={() => goToPage(Math.max(1, currentPage - 1))}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={currentPage === totalPages || isPending}
          onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
