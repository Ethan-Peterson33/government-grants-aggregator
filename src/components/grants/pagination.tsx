// src/components/grants/pagination.tsx

"use client";

import Link from "next/link";
import React from "react";

interface PaginationProps {
  total: number;
  pageSize: number;
  currentPage: number;
  basePath: string;       // e.g. "/grants/federal"
  rawCategory?: string;    // optional category slug, e.g. "Education"
}

const Pagination: React.FC<PaginationProps> = ({
  total,
  pageSize,
  currentPage,
  basePath,
  rawCategory,
}) => {
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) {
    return null; // no pagination needed
  }

  // helper to build query string
  const buildHref = (page: number) => {
    const params = new URLSearchParams();
    if (page > 1) {
      params.set("page", String(page));
    }
    if (pageSize !== pageSize) {
      // if you allow custom pageSize and want to include only when not default
      params.set("pageSize", String(pageSize));
    }
    if (rawCategory) {
      params.set("category", rawCategory);
    }
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="Pagination" className="flex space-x-2 justify-center mt-6">
      {pageNumbers.map((pageNum) => {
        const href = buildHref(pageNum);
        const isActive = pageNum === currentPage;
        return (
          <Link
            key={pageNum}
            href={href}
            className={`px-3 py-1 border rounded ${
              isActive
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-900 hover:bg-slate-100"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {pageNum}
          </Link>
        );
      })}
    </nav>
  );
};

export { Pagination };
