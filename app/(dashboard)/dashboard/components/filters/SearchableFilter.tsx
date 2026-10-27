"use client";

import clsx from "clsx";
import { IconChevronDown, IconSearch, IconX } from "@tabler/icons-react";
import FilterPopover from "./FilterPopover";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  parseDashboardSearchParams,
  searchParamsFromURLSearchParams,
  serializeDashboardFilters,
  type DashboardFilterParam,
  type DashboardGroupBy,
} from "@/lib/queries/dashboardSearchParams";
import { MAX_FILTER_VALUES } from "@/lib/queries/constants";
import { formatCompact } from "../chart/chartAxis";
import VirtualList from "../VirtualList";
import useFilterOptions from "./useFilterOptions";
import useValueFilter from "./useValueFilter";

type Props = {
  /** Query-string key the selection is written to. */
  param: DashboardFilterParam;
  /** Dimension the options are ranked by, and the groupBy this rules out. */
  dimension: DashboardGroupBy;
  name: string;
  menuLabel: string;
  formatLabel: (value: string) => string;
};

/** Typing has to pause this long before the options are searched again. */
const SEARCH_DEBOUNCE_MS = 300;
const ROW_HEIGHT = 40;
const VISIBLE_ROWS = 8;

/**
 * Multi-select over every value of one dimension in the window: searchable,
 * scrolled in pages, and virtualised, so a dimension with tens of thousands
 * of values (pages) costs no more than one with five (event types).
 */
export default function SearchableFilter({
  param,
  dimension,
  name,
  menuLabel,
  formatLabel,
}: Props) {
  const rawSearchParams = useSearchParams();
  const params = useMemo(
    () =>
      parseDashboardSearchParams(
        searchParamsFromURLSearchParams(rawSearchParams),
      ),
    [rawSearchParams],
  );
  const {
    selected,
    setSelected: writeSelection,
    toggle: toggleValue,
    isAtLimit,
  } = useValueFilter(dimension);
  // Without this filter's own selection, which the faceted options ignore:
  // picking a value must not refetch, dim and remount the list under the cursor.
  const filtersQueryString = useMemo(
    () => serializeDashboardFilters({ ...params, [param]: [] }),
    [params, param],
  );

  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    const timer = setTimeout(
      () => setSearch(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [searchInput]);

  const options = useFilterOptions(
    dimension,
    filtersQueryString,
    search,
    isOpen,
  );

  // A new result set starts with nothing highlighted. Reset during render, so
  // a stale index never points past the end of the new rows.
  const [activeIndexKey, setActiveIndexKey] = useState(options.requestKey);
  if (activeIndexKey !== options.requestKey) {
    setActiveIndexKey(options.requestKey);
    setActiveIndex(-1);
  }

  useEffect(() => {
    if (!isOpen) return;

    function dismiss(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    }

    document.addEventListener("mousedown", dismiss);
    return () => document.removeEventListener("mousedown", dismiss);
  }, [isOpen]);

  function close(restoreFocus: boolean) {
    setIsOpen(false);
    setSearchInput("");
    setSearch("");
    if (restoreFocus) triggerRef.current?.focus();
  }

  const optionId = (index: number) => `${listId}-option-${index}`;

  let summary = dimension === "event" ? "All types" : "All";
  if (selected.length) {
    summary = formatLabel(selected[0]);
    if (selected.length > 1) summary += ` +${selected.length - 1}`;
  }

  let footer = null;
  if (options.hasError && !options.isStale) {
    footer = (
      <RetryButton onClick={options.retry}>
        couldn’t load more — retry
      </RetryButton>
    );
  } else if (options.hasMore) {
    footer = (
      <p className="flex h-full items-center px-2 text-[12px] text-ink-3">
        {options.isLoadingMore ? "loading…" : ""}
      </p>
    );
  }

  let status = null;
  if (options.hasError && (options.isStale || !options.rows.length)) {
    status = (
      <RetryButton onClick={options.retry}>
        couldn’t load options — retry
      </RetryButton>
    );
  } else if (!options.rows.length) {
    // Only before anything has loaded: afterwards the previous message stays,
    // dimmed, rather than flashing "loading…" between keystrokes.
    if (options.isLoading && options.requestKey === null) status = "loading…";
    else if (search) status = `nothing matches “${search}”`;
    else status = "no values in this window";
  }

  return (
    <div ref={rootRef} className="relative flex">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => (isOpen ? close(false) : setIsOpen(true))}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        className={clsx("flex min-h-11 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm whitespace-nowrap outline-none transition-[background-color,border-color,box-shadow] hover:border-[#b9c9ec] hover:bg-[#eef3fd] aria-expanded:border-signal/40 aria-expanded:bg-[#eef3fd] aria-expanded:shadow-[0_0_0_3px_#2b59e80d] focus-visible:ring-2 focus-visible:ring-signal/30 focus-visible:ring-offset-2", selected.length ? "rounded-r-none border-signal/25 bg-[#eef3fd]" : "border-[#dce4f0] bg-[#f8fafd]")}
      >
        <span className="text-[13px] text-ink-3">{name}</span>
        <span
          className="max-w-[min(11rem,30vw)] truncate font-medium"
          title={selected.map(formatLabel).join(", ")}
        >
          {summary}
        </span>
        <IconChevronDown size={15} aria-hidden className={clsx("ml-0.5 shrink-0 text-ink-3 transition-transform motion-reduce:transition-none", isOpen && "rotate-180")} />
      </button>
      {selected.length ? (
        <button
          type="button"
          aria-label={`Reset ${name} filter`}
          title="Reset"
          onClick={() => writeSelection([])}
          className="-ml-px rounded-r-xl border border-signal/25 bg-[#eef3fd] px-2.5 text-signal outline-none transition-colors hover:bg-[#e0e9ff] focus-visible:ring-2 focus-visible:ring-signal/30 focus-visible:ring-offset-2"
        >
          <IconX size={14} aria-hidden />
        </button>
      ) : null}

      {isOpen ? (
        <FilterPopover width={384}>
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-hair bg-[#f8fafd] px-3 py-2.5 focus-within:border-signal/40 focus-within:ring-2 focus-within:ring-signal/10">
            <IconSearch size={16} className="shrink-0 text-ink-3" aria-hidden />
            <input
              type="text"
              role="combobox"
              aria-label={`Search ${menuLabel.toLowerCase()}`}
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                activeIndex >= 0 ? optionId(activeIndex) : undefined
              }
              autoFocus
              value={searchInput}
              placeholder={`Search ${menuLabel.toLowerCase()}…`}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                const last = options.rows.length - 1;
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveIndex((index) => Math.min(last, index + 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex((index) => Math.max(0, index - 1));
                } else if (event.key === "Enter" && activeIndex >= 0) {
                  event.preventDefault();
                  const row = options.rows[activeIndex];
                  if (row) toggleValue(row.value);
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  if (searchInput) setSearchInput("");
                  else close(true);
                }
              }}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-3/70"
            />
            {searchInput ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchInput("")}
                className="rounded-md px-1 py-0.5 text-sm text-ink-3 hover:bg-paper-deep hover:text-ink"
              >
                ×
              </button>
            ) : null}
          </div>

          {selected.length ? (
            <div className="mx-1 mb-2 border-b border-hair pb-3 pt-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] text-ink-3">
                  {selected.length} selected
                  {isAtLimit ? ` · limit ${MAX_FILTER_VALUES}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => writeSelection([])}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-signal hover:bg-[#eef3fd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/30"
                >
                  Reset
                </button>
              </div>
              <ul
                aria-label={`Selected ${menuLabel.toLowerCase()}`}
                className="mt-1.5 flex max-h-16 flex-wrap gap-1 overflow-y-auto"
              >
                {selected.map((value) => (
                  <li key={value} className="min-w-0">
                    <button
                      type="button"
                      aria-label={`Remove ${formatLabel(value)}`}
                      onClick={() => toggleValue(value)}
                      className="flex max-w-56 items-center gap-1.5 rounded-lg bg-[#eaf0ff] px-2 py-1 text-xs font-medium text-signal hover:bg-[#dce6ff]"
                    >
                      <span className="truncate">{formatLabel(value)}</span>
                      <span aria-hidden="true">×</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {status ? (
            <p
              role="status"
              className={clsx(
                "flex items-center justify-center px-2 text-[12.5px] text-ink-3 transition-opacity",
                options.isLoading && options.requestKey !== null
                  ? "opacity-45 delay-200"
                  : "delay-0",
              )}
              style={{ height: ROW_HEIGHT * 3 }}
            >
              {status}
            </p>
          ) : (
            <div
              className={clsx(
                "transition-opacity",
                // Delayed, so a quick response never flashes the list.
                options.isLoading ? "opacity-45 delay-200" : "delay-0",
              )}
            >
              <VirtualList
                key={options.requestKey}
                listRole="listbox"
                listId={listId}
                multiselectable
                label={menuLabel}
                count={options.rows.length}
                rowHeight={ROW_HEIGHT}
                visibleRows={Math.min(
                  VISIBLE_ROWS,
                  options.rows.length + (footer ? 1 : 0),
                )}
                activeIndex={activeIndex}
                onEndReached={options.loadMore}
                footer={footer}
                renderRow={(index) => {
                  const { value, count } = options.rows[index];
                  const isSelected = selected.includes(value);
                  const isDisabled = !isSelected && isAtLimit;
                  const label = formatLabel(value);

                  return (
                    <div
                      id={optionId(index)}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={isDisabled || undefined}
                      title={label}
                      // Keeps focus in the search box, so typing carries on.
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseMove={() => setActiveIndex(index)}
                      onClick={() => !isDisabled && toggleValue(value)}
                      className={clsx(
                        "flex h-full cursor-pointer items-center gap-2.5 rounded-xl border border-transparent px-3 text-sm transition-colors hover:bg-paper",
                        index === activeIndex
                          ? "bg-[#eef3fd]"
                          : isSelected ? "bg-[#f4f7ff]" : "bg-white",
                        isDisabled && "cursor-not-allowed opacity-45",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={clsx(
                          "flex size-4 shrink-0 items-center justify-center rounded-[5px] border border-rule text-[10px] leading-none",
                          isSelected && "border-signal bg-signal text-white",
                        )}
                      >
                        {isSelected ? "✓" : ""}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      <span className="shrink-0 text-[12px] text-ink-3 tabular-nums">
                        {formatCompact(count)}
                      </span>
                    </div>
                  );
                }}
              />
            </div>
          )}
        </FilterPopover>
      ) : null}
    </div>
  );
}

function RetryButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full w-full items-center justify-center text-[12px] text-brand hover:underline"
    >
      {children}
    </button>
  );
}
