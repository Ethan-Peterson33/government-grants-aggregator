"use client";

import { Button } from "@/components/ui/button";

type PaginationProps = {
  total: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
};

export function Pagination({ total, pageSize, currentPage, onPageChange, isLoading = false }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const goToPage = (page: number) => {
    const target = Math.max(1, Math.min(totalPages, page));
    if (target !== currentPage) {
      onPageChange(target);
    }
  };

  const disablePrev = currentPage === 1 || isLoading;
  const disableNext = currentPage === totalPages || isLoading;

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm">
      <span className="text-slate-600">Page {currentPage} of {totalPages}</span>
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={disablePrev} onClick={() => goToPage(currentPage - 1)}>
          Previous
        </Button>
        <Button type="button" variant="outline" disabled={disableNext} onClick={() => goToPage(currentPage + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
