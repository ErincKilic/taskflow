"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Plus, X, Trash2, ArrowLeft, Columns3, Calendar } from "lucide-react";
import { calcPosition, POS_GAP } from "@/lib/utils";
import { createColumn, updateColumn, deleteColumn as deleteColumnAction } from "@/actions/columns";
import { createCard as createCardAction, updateCard as updateCardAction, moveCard, deleteCard as deleteCardAction } from "@/actions/cards";
import CardModal from "@/components/card-modal";
import type { Board, Column, Card } from "@/types/database";

/* ─── Types ─── */
interface DragOverlayState {
  card: Card;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DropIndicatorState {
  columnId: string;
  index: number;
  dragCardId: string;
}

interface DragRef {
  card: Card;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  activated: boolean;
  activationTimer: ReturnType<typeof setTimeout> | null;
}

const COL_PALETTE = [
  "#6366f1", "#f59e0b", "#10b981", "#ec4899", "#06b6d4",
  "#f43f5e", "#8b5cf6", "#14b8a6", "#f97316", "#3b82f6",
];

function getColColor(index: number): string {
  return COL_PALETTE[index % COL_PALETTE.length];
}

/* ═══════════════════════════════════════════
   KANBAN CARD
   ═══════════════════════════════════════════ */
function KanbanCard({
  card,
  isDragging,
  isOverlay,
  onEdit,
  registerRef,
  onPointerDown,
}: {
  card: Card;
  isDragging?: boolean;
  isOverlay?: boolean;
  onEdit?: (card: Card) => void;
  registerRef?: (id: string, el: HTMLDivElement | null) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      ref={(el) => registerRef?.(card.id, el)}
      data-card-id={card.id}
      className={`group relative bg-white rounded-lg border transition-all ${
        isDragging
          ? "opacity-30 border-dashed border-indigo-300 bg-indigo-50/40"
          : isOverlay
          ? "shadow-2xl border-indigo-400 rotate-[2deg] scale-[1.03]"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-1 p-2.5 sm:p-3">
        <button
          onPointerDown={onPointerDown}
          className="mt-0.5 p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing rounded touch-none shrink-0"
          style={{ touchAction: "none" }}
        >
          <GripVertical size={14} />
        </button>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => !isDragging && onEdit?.(card)}
        >
          <p className="text-sm font-medium text-slate-800 leading-snug hover:text-indigo-700 transition">
            {card.title}
          </p>
          {card.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {card.description}
            </p>
          )}
          {card.label && (() => {
            const colors: Record<string, string> = {
              red: "#ef4444", orange: "#f97316", yellow: "#eab308",
              green: "#22c55e", blue: "#3b82f6", purple: "#a855f7",
            };
            const names: Record<string, string> = {
              red: "Acil", orange: "Önemli", yellow: "Orta",
              green: "Düşük", blue: "Bilgi", purple: "Fikir",
            };
            const c = colors[card.label] || "#94a3b8";
            return (
              <div
                className="inline-flex items-center gap-1 mt-1.5 mr-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{ backgroundColor: c + "15", color: c }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                {names[card.label] || card.label}
              </div>
            );
          })()}
          {card.due_date && (
            <div className={`inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
              new Date(card.due_date) < new Date(new Date().toDateString())
                ? "bg-red-50 text-red-600"
                : new Date(card.due_date) <= new Date(Date.now() + 2 * 86400000)
                ? "bg-amber-50 text-amber-600"
                : "bg-slate-100 text-slate-500"
            }`}>
              <Calendar size={10} />
              {new Date(card.due_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   KANBAN COLUMN
   ═══════════════════════════════════════════ */
function KanbanColumn({
  column,
  cards,
  onAddCard,
  onEditCard,
  onDeleteColumn,
  onRenameColumn,
  registerColRef,
  registerCardRef,
  onCardPointerDown,
  dropIndicator,
  isDragOver,
  colorIndex,
}: {
  column: Column;
  cards: Card[];
  onAddCard: (colId: string, title: string) => void;
  onEditCard: (card: Card) => void;
  onDeleteColumn: (id: string) => void;
  onRenameColumn: (id: string, title: string) => void;
  registerColRef: (id: string, el: HTMLDivElement | null) => void;
  registerCardRef: (id: string, el: HTMLDivElement | null) => void;
  onCardPointerDown: (e: React.PointerEvent, card: Card) => void;
  dropIndicator: DropIndicatorState | null;
  isDragOver: boolean;
  colorIndex: number;
}) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editing, setEditing] = useState(false);
  const [colTitle, setColTitle] = useState(column.title);
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) addRef.current?.focus();
  }, [adding]);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAddCard(column.id, newTitle.trim());
    setNewTitle("");
    setAdding(false);
  };

  const handleRename = () => {
    if (colTitle.trim() && colTitle.trim() !== column.title) {
      onRenameColumn(column.id, colTitle.trim());
    } else {
      setColTitle(column.title);
    }
    setEditing(false);
  };

  const sorted = useMemo(
    () => [...cards].sort((a, b) => a.position - b.position),
    [cards]
  );

  const dotColor = getColColor(colorIndex);

  return (
    <div
      ref={(el) => registerColRef(column.id, el)}
      data-column-id={column.id}
      className={`flex flex-col rounded-xl transition-colors shrink-0 ${
        isDragOver ? "bg-indigo-50/60" : "bg-slate-100/80"
      }`}
      style={{ width: 280, minWidth: 280, maxHeight: "calc(100vh - 140px)" }}
    >
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: dotColor }}
          />
          {editing ? (
            <input
              value={colTitle}
              onChange={(e) => setColTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") {
                  setColTitle(column.title);
                  setEditing(false);
                }
              }}
              autoFocus
              className="flex-1 text-xs font-bold text-slate-700 uppercase tracking-wider bg-white border border-slate-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          ) : (
            <h3
              onDoubleClick={() => setEditing(true)}
              className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate cursor-default select-none"
            >
              {column.title}
            </h3>
          )}
          <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 rounded-full px-1.5 py-0.5 shrink-0">
            {sorted.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setAdding(true)}
            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => onDeleteColumn(column.id)}
            className="p-1 text-slate-300 hover:text-red-500 hover:bg-white rounded-md transition"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Cards list */}
      <div
        className="col-scroll flex-1 overflow-y-auto px-2 pb-2 space-y-1.5 relative"
        style={{ minHeight: 60 }}
      >
        {sorted.length === 0 && !adding && (
          <div className="py-6 text-center">
            <p className="text-xs text-slate-400">Kart eklemek için + tıklayın</p>
          </div>
        )}
        {sorted.map((card, i) => (
          <div key={card.id} className="relative">
            {dropIndicator &&
              dropIndicator.columnId === column.id &&
              dropIndicator.index === i && (
                <div className="h-0.5 bg-indigo-500 rounded-full -mt-0.5 mb-1 mx-1" />
              )}
            <KanbanCard
              card={card}
              isDragging={dropIndicator?.dragCardId === card.id}
              onEdit={onEditCard}
              registerRef={registerCardRef}
              onPointerDown={(e) => onCardPointerDown(e, card)}
            />
          </div>
        ))}
        {dropIndicator &&
          dropIndicator.columnId === column.id &&
          dropIndicator.index === sorted.length && (
            <div className="h-0.5 bg-indigo-500 rounded-full mx-1 mt-0.5" />
          )}

        {/* Add card form */}
        {adding && (
          <div className="ani-fade bg-white rounded-lg border border-indigo-200 p-2.5 shadow-sm">
            <input
              ref={addRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Kart başlığı..."
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") {
                  setAdding(false);
                  setNewTitle("");
                }
              }}
              className="w-full text-sm border-0 focus:outline-none placeholder-slate-400"
            />
            <div className="flex items-center gap-1.5 mt-2">
              <button
                onClick={handleAdd}
                className="px-2.5 py-1 text-xs font-medium text-white rounded-md"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                }}
              >
                Ekle
              </button>
              <button
                onClick={() => {
                  setAdding(false);
                  setNewTitle("");
                }}
                className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-md transition"
              >
                İptal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   KANBAN BOARD (main)
   ═══════════════════════════════════════════ */
export default function KanbanBoard({
  board,
  initialColumns,
  initialCards,
}: {
  board: Board;
  initialColumns: Column[];
  initialCards: Card[];
}) {
  const router = useRouter();
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [addingCol, setAddingCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");

  // DnD
  const [dragOverlay, setDragOverlay] = useState<DragOverlayState | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicatorState | null>(null);

  const colRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragRefObj = useRef<DragRef | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const addColRef = useRef<HTMLInputElement>(null);

  const registerColRef = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      if (el) colRefs.current.set(id, el);
      else colRefs.current.delete(id);
    },
    []
  );
  const registerCardRef = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      if (el) cardRefs.current.set(id, el);
      else cardRefs.current.delete(id);
    },
    []
  );

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.position - b.position),
    [columns]
  );

  useEffect(() => {
    if (addingCol) addColRef.current?.focus();
  }, [addingCol]);

  /* ──── Card CRUD ──── */
  const handleAddCard = async (columnId: string, title: string) => {
    const colCards = cards
      .filter((c) => c.column_id === columnId)
      .sort((a, b) => a.position - b.position);
    const position =
      colCards.length > 0
        ? colCards[colCards.length - 1].position + POS_GAP
        : POS_GAP;

    // Optimistic
    const tempId = "temp-" + Date.now();
    const tempCard: Card = {
      id: tempId,
      column_id: columnId,
      title,
      description: "",
      position,
      due_date: null,
      label: null,
      created_at: new Date().toISOString(),
    };
    setCards((prev) => [...prev, tempCard]);

    try {
      const realCard = await createCardAction(columnId, title, position);
      setCards((prev) =>
        prev.map((c) => (c.id === tempId ? realCard : c))
      );
    } catch {
      setCards((prev) => prev.filter((c) => c.id !== tempId));
    }
  };

  const handleUpdateCard = async (updated: Card) => {
    const original = cards.find((c) => c.id === updated.id);
    if (!original) return;

    // If column changed, recalc position
    let finalCard = updated;
    if (updated.column_id !== original.column_id) {
      const colCards = cards
        .filter(
          (c) => c.column_id === updated.column_id && c.id !== updated.id
        )
        .sort((a, b) => a.position - b.position);
      const newPos =
        colCards.length > 0
          ? colCards[colCards.length - 1].position + POS_GAP
          : POS_GAP;
      finalCard = { ...updated, position: newPos };
    }

    setCards((prev) =>
      prev.map((c) => (c.id === finalCard.id ? finalCard : c))
    );
    setEditingCard(null);

    await updateCardAction(finalCard.id, {
      title: finalCard.title,
      description: finalCard.description,
      column_id: finalCard.column_id,
      position: finalCard.position,
      due_date: finalCard.due_date,
      label: finalCard.label,
    });
  };

  const handleDeleteCard = async (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    await deleteCardAction(id);
  };

  /* ──── Column CRUD ──── */
  const handleAddColumn = async () => {
    if (!newColTitle.trim()) return;
    const pos =
      sortedColumns.length > 0
        ? sortedColumns[sortedColumns.length - 1].position + POS_GAP
        : POS_GAP;

    const tempId = "temp-col-" + Date.now();
    const tempCol: Column = {
      id: tempId,
      board_id: board.id,
      title: newColTitle.trim(),
      position: pos,
      created_at: new Date().toISOString(),
    };
    setColumns((prev) => [...prev, tempCol]);
    setNewColTitle("");
    setAddingCol(false);

    try {
      const realCol = await createColumn(board.id, tempCol.title, pos);
      setColumns((prev) =>
        prev.map((c) => (c.id === tempId ? realCol : c))
      );
    } catch {
      setColumns((prev) => prev.filter((c) => c.id !== tempId));
    }
  };

  const handleDeleteColumn = async (id: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== id));
    setCards((prev) => prev.filter((c) => c.column_id !== id));
    await deleteColumnAction(id);
  };

  const handleRenameColumn = async (id: string, title: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
    await updateColumn(id, { title });
  };

  /* ──── Drag & Drop ──── */
  const findDropTarget = useCallback(
    (clientX: number, clientY: number, dragCardId: string) => {
      let targetCol: string | null = null;
      for (const [colId, colEl] of colRefs.current.entries()) {
        const r = colEl.getBoundingClientRect();
        if (
          clientX >= r.left - 10 &&
          clientX <= r.right + 10 &&
          clientY >= r.top &&
          clientY <= r.bottom
        ) {
          targetCol = colId;
          break;
        }
      }
      if (!targetCol) return null;

      const colCards = cards
        .filter((c) => c.column_id === targetCol && c.id !== dragCardId)
        .sort((a, b) => a.position - b.position);

      let insertIndex = colCards.length;
      for (let i = 0; i < colCards.length; i++) {
        const cardEl = cardRefs.current.get(colCards[i].id);
        if (cardEl) {
          const cr = cardEl.getBoundingClientRect();
          if (clientY < cr.top + cr.height / 2) {
            insertIndex = i;
            break;
          }
        }
      }
      return { columnId: targetCol, index: insertIndex, colCards };
    },
    [cards]
  );

  const onCardPointerDown = useCallback(
    (e: React.PointerEvent, card: Card) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      e.preventDefault();
      e.stopPropagation();

      const cardEl = cardRefs.current.get(card.id);
      if (!cardEl) return;
      const rect = cardEl.getBoundingClientRect();

      const startX = e.clientX;
      const startY = e.clientY;
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      const isTouch = e.pointerType === "touch";

      dragRefObj.current = {
        card,
        startX,
        startY,
        offsetX,
        offsetY,
        activated: false,
        activationTimer: null,
      };

      const activate = () => {
        if (!dragRefObj.current) return;
        dragRefObj.current.activated = true;
        setDragOverlay({
          card,
          x: startX - offsetX,
          y: startY - offsetY,
          width: rect.width,
          height: rect.height,
        });

        const currentColCards = cards
          .filter((c) => c.column_id === card.column_id)
          .sort((a, b) => a.position - b.position);
        const idx = currentColCards.findIndex((c) => c.id === card.id);

        setDropIndicator({
          columnId: card.column_id,
          index: idx >= 0 ? idx : 0,
          dragCardId: card.id,
        });
      };

      if (isTouch) {
        dragRefObj.current.activationTimer = setTimeout(activate, 200);
      }

      const onMove = (ev: PointerEvent) => {
        if (!dragRefObj.current) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (!dragRefObj.current.activated) {
          if (isTouch) {
            if (dist > 8) {
              if (dragRefObj.current.activationTimer)
                clearTimeout(dragRefObj.current.activationTimer);
              cleanup();
              return;
            }
          } else {
            if (dist > 5) activate();
            else return;
          }
        }
        if (!dragRefObj.current.activated) return;

        setDragOverlay((prev) =>
          prev
            ? { ...prev, x: ev.clientX - offsetX, y: ev.clientY - offsetY }
            : null
        );

        const target = findDropTarget(ev.clientX, ev.clientY, card.id);
        if (target) {
          setDropIndicator({
            columnId: target.columnId,
            index: target.index,
            dragCardId: card.id,
          });
        }

        // Auto-scroll
        if (scrollRef.current) {
          const sr = scrollRef.current.getBoundingClientRect();
          if (ev.clientX < sr.left + 50)
            scrollRef.current.scrollLeft -= 8;
          if (ev.clientX > sr.right - 50)
            scrollRef.current.scrollLeft += 8;
        }
      };

      const onUp = async (ev: PointerEvent) => {
        if (!dragRefObj.current) {
          cleanup();
          return;
        }
        if (dragRefObj.current.activationTimer)
          clearTimeout(dragRefObj.current.activationTimer);

        if (dragRefObj.current.activated) {
          const target = findDropTarget(ev.clientX, ev.clientY, card.id);
          if (target) {
            const newPos = calcPosition(target.colCards, target.index);
            // Optimistic update
            setCards((prev) =>
              prev.map((c) =>
                c.id === card.id
                  ? { ...c, column_id: target.columnId, position: newPos }
                  : c
              )
            );
            // Server sync (fire-and-forget)
            moveCard(card.id, target.columnId, newPos).catch(console.error);
          }
        }

        setDragOverlay(null);
        setDropIndicator(null);
        cleanup();
      };

      const cleanup = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
        if (dragRefObj.current?.activationTimer)
          clearTimeout(dragRefObj.current.activationTimer);
        dragRefObj.current = null;
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    },
    [cards, findDropTarget]
  );

  /* ──── Render ──── */
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
      }}
    >
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-5 py-2.5 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push("/dashboard")}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            }}
          >
            <Columns3 size={12} color="white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 truncate">
              {board.title}
            </h1>
            <p className="text-[10px] text-slate-400">
              {sortedColumns.length} sütun · {cards.length} kart
            </p>
          </div>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setAddingCol(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition"
        >
          <Plus size={13} />
          Sütun
        </button>
      </header>

      {/* Board area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden p-4 sm:p-5"
      >
        <div
          className="flex gap-4 h-full items-start"
          style={{ minHeight: "calc(100vh - 140px)" }}
        >
          {sortedColumns.map((col,index) => (
            <KanbanColumn
              key={col.id}
              column={col}
              colorIndex={index}
              cards={cards.filter((c) => c.column_id === col.id)}
              onAddCard={handleAddCard}
              onEditCard={setEditingCard}
              onDeleteColumn={handleDeleteColumn}
              onRenameColumn={handleRenameColumn}
              registerColRef={registerColRef}
              registerCardRef={registerCardRef}
              onCardPointerDown={onCardPointerDown}
              dropIndicator={dropIndicator}
              isDragOver={dropIndicator?.columnId === col.id}
            />
          ))}

          {/* Add column */}
          {addingCol ? (
            <div
              className="ani-fade shrink-0 bg-white rounded-xl border border-slate-200 p-3 shadow-sm"
              style={{ width: 280 }}
            >
              <input
                ref={addColRef}
                value={newColTitle}
                onChange={(e) => setNewColTitle(e.target.value)}
                placeholder="Sütun adı..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddColumn();
                  if (e.key === "Escape") {
                    setAddingCol(false);
                    setNewColTitle("");
                  }
                }}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={handleAddColumn}
                  className="px-3 py-1.5 text-xs font-medium text-white rounded-lg"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  }}
                >
                  Ekle
                </button>
                <button
                  onClick={() => {
                    setAddingCol(false);
                    setNewColTitle("");
                  }}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition"
                >
                  İptal
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingCol(true)}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-slate-400 bg-slate-100/50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl transition"
              style={{ width: 280 }}
            >
              <Plus size={14} />
              Sütun Ekle
            </button>
          )}
        </div>
      </div>

      {/* Drag overlay */}
      {dragOverlay && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragOverlay.x,
            top: dragOverlay.y,
            width: dragOverlay.width,
          }}
        >
          <KanbanCard card={dragOverlay.card} isOverlay />
        </div>
      )}

      {/* Card modal */}
      {editingCard && (
        <CardModal
          card={editingCard}
          columns={sortedColumns}
          onSave={handleUpdateCard}
          onDelete={handleDeleteCard}
          onClose={() => setEditingCard(null)}
        />
      )}
    </div>
  );
}
