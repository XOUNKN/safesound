"use client";

import { useCallback, useRef, useState } from "react";

type DragState = { from: number; to: number; dy: number; height: number };

/**
 * Pointer-based list reordering. Works with touch, mouse and pen from one code
 * path, and exposes arrow-key handling so the same list is reorderable from
 * the keyboard.
 *
 * `onMove` is called exactly once, on drop, with the final indices. The live
 * drag lives in a ref as well as state: state drives the transforms, the ref
 * is what the drop handler reads, so no side effect ever runs inside a state
 * updater (React may invoke those more than once).
 */
export function useReorder(onMove: (from: number, to: number) => void) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const rects = useRef<{ top: number; height: number }[]>([]);
  const startY = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return false;
    const items = Array.from(list.querySelectorAll<HTMLElement>("[data-reorder-item]"));
    rects.current = items.map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, height: r.height };
    });
    return rects.current.length > 0;
  }, []);

  const onPointerDown = useCallback(
    (index: number) => (e: React.PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      if (!measure()) return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      startY.current = e.clientY;
      const next = { from: index, to: index, dy: 0, height: rects.current[index]?.height ?? 0 };
      dragRef.current = next;
      setDrag(next);
    },
    [measure],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dy = e.clientY - startY.current;
    const self = rects.current[d.from];
    let to = d.to;
    if (self) {
      const center = self.top + self.height / 2 + dy;
      const found = rects.current.findIndex((r) => center < r.top + r.height / 2);
      to = found === -1 ? rects.current.length - 1 : found;
    }
    const next = { ...d, dy, to };
    dragRef.current = next;
    setDrag(next);
  }, []);

  const finish = useCallback(() => {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (d && d.from !== d.to) onMove(d.from, d.to);
  }, [onMove]);

  /** Props for the scroll container that holds the rows. */
  const listProps = { ref: listRef };

  /** Props for each row wrapper. Supplies the drag transform. */
  const itemProps = (index: number) => {
    let translate = 0;
    if (drag) {
      if (index === drag.from) translate = drag.dy;
      else if (drag.from < drag.to && index > drag.from && index <= drag.to) translate = -drag.height;
      else if (drag.from > drag.to && index < drag.from && index >= drag.to) translate = drag.height;
    }
    const isDragging = drag?.from === index;
    return {
      "data-reorder-item": "",
      style: {
        transform: translate ? `translateY(${translate}px)` : undefined,
        transition: isDragging ? "none" : "transform 180ms var(--ease)",
        zIndex: isDragging ? 20 : undefined,
        position: "relative" as const,
        touchAction: isDragging ? ("none" as const) : undefined,
      },
      className: isDragging ? "shadow-[var(--shadow-lg)]" : "",
    };
  };

  /** Props for the grab handle inside each row. */
  const handleProps = (index: number, total: number) => ({
    onPointerDown: onPointerDown(index),
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: finish,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "ArrowUp" && index > 0) {
        e.preventDefault();
        onMove(index, index - 1);
      } else if (e.key === "ArrowDown" && index < total - 1) {
        e.preventDefault();
        onMove(index, index + 1);
      }
    },
  });

  return { listProps, itemProps, handleProps, dragging: drag !== null, dragFrom: drag?.from ?? -1 };
}
