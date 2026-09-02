import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  sortValue?: (row: T) => string | number;
  render: (row: T) => ReactNode;
  className?: string;
};

export function DataTable<T>({
  rows,
  columns,
  loading,
  emptyLabel = "No records.",
  searchable,
  rowKey,
  rowTone,
  toolbar,
}: {
  rows: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyLabel?: string;
  searchable?: (row: T) => string;
  rowKey: (row: T, index: number) => string;
  rowTone?: (row: T) => "alert" | "warn" | "ok" | null;
  toolbar?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const visible = useMemo(() => {
    let out = rows;
    if (query && searchable) {
      const q = query.toLowerCase();
      out = out.filter((r) => searchable(r).toLowerCase().includes(q));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        out = [...out].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          const cmp = typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv));
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, query, sort, columns, searchable]);

  function toggleSort(key: string) {
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  return (
    <div className="panel overflow-hidden">
      {(searchable || toolbar) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
          {searchable ? (
            <label className="flex min-w-48 flex-1 items-center gap-2 rounded-md border border-input px-3">
              <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                aria-label="Search table"
                className="touch-target w-full bg-transparent outline-none"
              />
            </label>
          ) : null}
          {toolbar}
        </div>
      )}

      {loading ? (
        <p className="p-8 text-center text-muted-foreground">Loading from VPS bridge…</p>
      ) : visible.length === 0 ? (
        <p className="p-8 text-center text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border-strong">
                {columns.map((col) => (
                  <th key={col.key} scope="col" className={cn("p-3", col.className)}>
                    {col.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="label-caps flex items-center gap-1 hover:text-foreground"
                      >
                        {col.header}
                        {sort?.key === col.key ? (
                          sort.dir === "asc" ? (
                            <ArrowUp aria-hidden className="size-3" />
                          ) : (
                            <ArrowDown aria-hidden className="size-3" />
                          )
                        ) : (
                          <ArrowUpDown aria-hidden className="size-3 opacity-50" />
                        )}
                      </button>
                    ) : (
                      <span className="label-caps">{col.header}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, i) => {
                const tone = rowTone?.(row) ?? null;
                return (
                  <tr
                    key={rowKey(row, i)}
                    className={cn(
                      "border-b border-border last:border-0 hover:bg-accent/60",
                      tone === "alert" && "border-l-4 border-l-alert",
                      tone === "warn" && "border-l-4 border-l-warn",
                      tone === "ok" && "border-l-4 border-l-ok",
                    )}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={cn("p-3 align-middle", col.className)}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
