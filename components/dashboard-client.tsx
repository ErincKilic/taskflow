"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createBoard, deleteBoard } from "@/actions/boards";
import type { Board } from "@/types/database";
import {
  Plus,
  X,
  Check,
  Trash2,
  LogOut,
  LayoutDashboard,
  Columns3,
} from "lucide-react";

interface Props {
  user: { id: string; name: string };
  initialBoards: Board[];
}

export default function DashboardClient({ user, initialBoards }: Props) {
  const [boards, setBoards] = useState(initialBoards);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const handleCreate = async () => {
    if (!newTitle.trim() || loading) return;
    setLoading(true);
    try {
      const board = await createBoard(newTitle.trim());
      setBoards((prev) => [board, ...prev]);
      setNewTitle("");
      setCreating(false);
      router.push(`/board/${board.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, boardId: string) => {
    e.stopPropagation();
    setBoards((prev) => prev.filter((b) => b.id !== boardId));
    await deleteBoard(boardId);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  const colors = [
    "#6366f1",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
    "#f43f5e",
    "#8b5cf6",
  ];

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
      }}
    >
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            }}
          >
            <Columns3 size={16} color="white" />
          </div>
          <span
            className="text-lg font-bold text-slate-900 tracking-tight"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            TaskFlow
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 hidden sm:block">
            Hoş geldin,{" "}
            <b className="text-slate-700">{user.name}</b>
          </span>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900">
            Board&apos;larım
          </h1>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white rounded-lg transition-all hover:shadow-lg hover:shadow-indigo-500/20"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              }}
            >
              <Plus size={15} />
              Yeni Board
            </button>
          )}
        </div>

        {/* Create form */}
        {creating && (
          <div className="ani-fade bg-white rounded-xl border border-slate-200 p-4 mb-6 flex gap-3 items-center shadow-sm">
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Board adı..."
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setCreating(false);
                  setNewTitle("");
                }
              }}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
            <button
              onClick={handleCreate}
              disabled={loading}
              className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setNewTitle("");
              }}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Empty state */}
        {boards.length === 0 && !creating && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-slate-100">
              <LayoutDashboard size={28} className="text-slate-300" />
            </div>
            <p className="text-slate-500 text-sm mb-1">Henüz board yok</p>
            <p className="text-slate-400 text-xs">
              Yeni bir board oluşturarak başlayın
            </p>
          </div>
        )}

        {/* Board grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((b, i) => (
            <div
              key={b.id}
              onClick={() => router.push(`/board/${b.id}`)}
              className="ani-fade group text-left bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all relative overflow-hidden"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl"
                style={{ background: colors[i % colors.length] }}
              />
              <h3 className="font-semibold text-slate-800 text-sm mt-1 mb-1 pr-8">
                {b.title}
              </h3>
              <p className="text-xs text-slate-400">
                {new Date(b.created_at).toLocaleDateString("tr-TR")}
              </p>
              <button
                onClick={(e) => handleDelete(e, b.id)}
                className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
