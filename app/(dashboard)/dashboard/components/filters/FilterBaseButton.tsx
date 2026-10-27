"use client";

import clsx from "clsx";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import FilterPopover from "./FilterPopover";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type FilterOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  separatorBefore?: boolean;
};

type FilterBaseButtonProps = {
  name?: string;
  value: string;
  selectedValues: readonly string[];
  options: readonly FilterOption[];
  onValueChange: (values: string[]) => void;
  multiple?: boolean;
  menuLabel?: string;
  menuHeader?: string;
  optionContent?: {
    value: string;
    render: (close: () => void, showOptions: () => void) => ReactNode;
  };
};

export default function FilterBaseButton({
  name,
  value,
  selectedValues,
  options,
  onValueChange,
  multiple = false,
  menuLabel,
  menuHeader,
  optionContent,
}: FilterBaseButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showOptionContent, setShowOptionContent] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function closeMenu() {
    setIsOpen(false);
    document.getElementById(`${menuId}-trigger`)?.focus();
  }

  function openMenu() {
    setShowOptionContent(Boolean(optionContent && selectedValues.includes(optionContent.value)));
    setIsOpen(true);
  }

  useEffect(() => {
    if (!isOpen) return;

    function dismissMenu(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", dismissMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", dismissMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  function moveFocus(currentIndex: number, direction: 1 | -1) {
    const enabledIndices = options.reduce<number[]>(
      (indices, option, index) => {
        if (!option.disabled) indices.push(index);
        return indices;
      },
      [],
    );
    const currentEnabledIndex = enabledIndices.indexOf(currentIndex);
    const nextIndex =
      enabledIndices[
        (currentEnabledIndex + direction + enabledIndices.length) %
          enabledIndices.length
      ];

    optionRefs.current[nextIndex]?.focus();
  }

  function selectOption(optionValue: string) {
    if (optionContent?.value === optionValue) {
      setShowOptionContent(true);
      requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>("input, form button")?.focus());
      return;
    }
    if (!multiple) {
      onValueChange([optionValue]);
      setIsOpen(false);
      return;
    }

    onValueChange(
      selectedValues.includes(optionValue)
        ? selectedValues.filter((value) => value !== optionValue)
        : [...selectedValues, optionValue],
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        id={`${menuId}-trigger`}
        type="button"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-haspopup={optionContent ? "dialog" : "menu"}
        onClick={() => isOpen ? closeMenu() : openMenu()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu();
            requestAnimationFrame(() => {
              if (optionContent && selectedValues.includes(optionContent.value)) {
                rootRef.current?.querySelector<HTMLElement>("input, form button")?.focus();
                return;
              }
              const selectedIndex = options.findIndex((option) =>
                selectedValues.includes(option.value),
              );
              optionRefs.current[
                selectedIndex >= 0 ? selectedIndex : 0
              ]?.focus();
            });
          }
        }}
        className="flex min-h-11 items-center gap-2.5 rounded-xl border border-[#dce4f0] bg-[#f8fafd] px-3.5 py-2.5 text-sm whitespace-nowrap outline-none transition-[background-color,border-color,box-shadow] hover:border-[#b9c9ec] hover:bg-[#eef3fd] aria-expanded:border-signal/40 aria-expanded:bg-[#eef3fd] aria-expanded:shadow-[0_0_0_3px_#2b59e80d] focus-visible:ring-2 focus-visible:ring-signal/30 focus-visible:ring-offset-2"
      >
        <span className="text-[13px] text-ink-3">{name ?? "+"}</span>
        <span className="max-w-[min(13rem,35vw)] truncate font-medium" title={value}>{value}</span>
        <IconChevronDown size={15} aria-hidden className={clsx("ml-0.5 shrink-0 text-ink-3 transition-transform motion-reduce:transition-none", isOpen && "rotate-180")} />
      </button>

      {isOpen ? (
        <FilterPopover id={menuId} role={optionContent ? "dialog" : "menu"} label={menuLabel ?? `${name ?? value} options`} width={showOptionContent && optionContent ? 352 : 256}>
          {showOptionContent && optionContent ? optionContent.render(closeMenu, () => {
            setShowOptionContent(false);
            requestAnimationFrame(() => {
              document.getElementById(menuId)?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
            });
          }) : (
          <div role={optionContent ? "menu" : undefined} aria-label={optionContent ? menuLabel : undefined}>
          {menuHeader ? (
            <p className="px-3 pt-2 pb-2.5 text-[11px] font-semibold tracking-[0.08em] text-ink-3">
              {menuHeader}
            </p>
          ) : null}
          {multiple ? (
            <div className="flex gap-2 border-b border-hair px-1 pt-1 pb-2 mb-1">
              <button
                type="button"
                role="menuitem"
                onClick={() =>
                  onValueChange(
                    options
                      .filter((option) => !option.disabled)
                      .map((option) => option.value),
                  )
                }
                className="flex-1 rounded-lg border border-hair bg-paper px-3 py-2 text-xs font-medium hover:bg-[#e6ecfd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/30"
              >
                Select all
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => onValueChange([])}
                className="flex-1 rounded-lg border border-hair bg-paper px-3 py-2 text-xs font-medium hover:bg-[#e6ecfd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/30"
              >
                Clear
              </button>
            </div>
          ) : null}
          {options.map((option, index) => {
            const isSelected = selectedValues.includes(option.value);

            return (
              <div key={option.value}>
                {option.separatorBefore ? (
                  <div role="separator" className="my-2 border-t border-hair" />
                ) : null}
                <button
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  role={multiple ? "menuitemcheckbox" : "menuitemradio"}
                  aria-checked={isSelected}
                  disabled={option.disabled}
                  onClick={() => {
                    selectOption(option.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      moveFocus(index, 1);
                    }
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      moveFocus(index, -1);
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setIsOpen(false);
                      triggerRef.current?.focus();
                    }
                  }}
                  className={clsx(
                    "group flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-signal/30 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-40",
                    isSelected ? "bg-[#eaf0ff] font-medium text-signal" : "text-ink-soft hover:bg-paper focus-visible:bg-paper",
                  )}
                >
                  <span className="min-w-0 flex-1">{option.label}</span>
                  {option.description && <span className="text-xs text-ink-3">{option.description}</span>}
                  <IconCheck size={16} aria-hidden className={isSelected ? "shrink-0 text-signal" : "shrink-0 invisible"} />
                </button>
              </div>
            );
          })}
          </div>
          )}
        </FilterPopover>
      ) : null}
    </div>
  );
}
