"use client";

import clsx from "clsx";
import { useEffect, useId, useRef, useState } from "react";

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
}: FilterBaseButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

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
        type="button"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setIsOpen(true);
            requestAnimationFrame(() => {
              const selectedIndex = options.findIndex((option) =>
                selectedValues.includes(option.value),
              );
              optionRefs.current[
                selectedIndex >= 0 ? selectedIndex : 0
              ]?.focus();
            });
          }
        }}
        className="flex items-center gap-2 border border-ink bg-white px-2.75 py-1.25 text-[13px] whitespace-nowrap outline-none transition-colors hover:bg-paper-deep focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2"
      >
        <span className="text-ink-3">{name ?? "+"}</span>
        <span>{value}</span>
        <span aria-hidden="true" className="text-ink-3">
          ▾
        </span>
      </button>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label={menuLabel ?? `${name ?? value} options`}
          className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-60 overflow-hidden border border-ink bg-white p-1 shadow-[3px_3px_0_var(--color-ink)]"
        >
          {menuHeader ? (
            <p className="px-2 py-1 text-[11px] tracking-wide text-ink-3">
              {menuHeader}
            </p>
          ) : null}
          {multiple ? (
            <div className="flex gap-1 px-1 pb-1">
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
                className="flex-1 border border-ink px-2 py-1 text-[12px] hover:bg-paper-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
              >
                Select all
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => onValueChange([])}
                className="flex-1 border border-ink px-2 py-1 text-[12px] hover:bg-paper-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
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
                  <div role="separator" className="my-1 border-t border-ink" />
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
                    "group flex w-full items-start justify-between gap-5 px-2 py-1.5 text-left text-[13px] outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-inherit border border-transparent ",
                    {
                      ["hover:bg-ink hover:text-white focus-visible:bg-ink focus-visible:text-white"]:
                        !isSelected && !option.disabled && !multiple,
                      ["border border-transparent hover:border-ink"]:
                        multiple && !isSelected && !option.disabled,
                      ["bg-ink text-white cursor-auto"]: isSelected,
                    },
                  )}
                >
                  <div className="flex justify-between w-full">
                    <span>{option.label}</span>
                    {option.description ? (
                      <span
                        className={clsx(
                          "block text-[12px] text-ink-3 text-end",
                          {
                            ["group-hover:text-white group-focus-visible:text-white"]:
                              !isSelected && !option.disabled,
                            ["text-white"]: isSelected,
                          },
                        )}
                      >
                        {option.description}
                      </span>
                    ) : null}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
