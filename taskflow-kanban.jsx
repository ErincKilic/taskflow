import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";
import { GripVertical, Plus, X, Trash2, Edit3, Check, ArrowLeft, LogOut, LayoutDashboard, Clock, AlertCircle, Columns3, ChevronDown, MoreHorizontal, Search } from "lucide-react";

/* ══════════════════════════════════════════
   UTILITIES
   ══════════════════════════════════════════ */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const POS_GAP = 65536;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function calcPosition(siblings, dropIndex) {
  if (siblings.length === 0) return POS_GAP;
  if (dropIndex <= 0) return siblings[0].position / 2;
  if (dropIndex >= siblings.length) return siblings[siblings.length - 1].position + POS_GAP;
  const before = siblings[dropIndex - 1].position;
  const after = siblings[dropIndex].position;
  return (before + after) / 2;
}

/* ══════════════════════════════════════════
   STORAGE HELPERS
   ══════════════════════════════════════════ */
async function load(key) {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : null;
  } catch { return null; }
}
async function save(key, data) {
  try { await window.storage.set(key, JSON.stringify(data)); } catch (e) { console.error("save err", e); }
}
async function remove(key) {
  try { await window.storage.delete(key); } catch {}
}

/* ══════════════════════════════════════════
   GLOBAL STYLES
   ══════════════════════════════════════════ */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Space+Mono:wght@400;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; }
    ::-webkit-scrollbar { height: 6px; width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    .taskflow-col::-webkit-scrollbar-thumb { background: #94a3b8; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .ani-fade { animation: fadeIn 0.25s ease-out both; }
    .ani-scale { animation: scaleIn 0.2s ease-out both; }
    .ani-slide { animation: slideUp 0.3s ease-out both; }
    .drop-line { transition: opacity 0.15s, top 0.1s; }
  `}</style>
);

/* ══════════════════════════════════════════
   AUTH SCREEN
   ══════════════════════════════════════════ */
function AuthScreen({ onLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { setError("İsim gerekli"); return; }
    if (isSignup && !email.trim()) { setError("E-posta gerekli"); return; }
    setLoading(true);
    const userId = "u-" + name.trim().toLowerCase().replace(/\s+/g, "-");
    const existingUser = await load(`tf-user-${userId}`);
    if (isSignup && existingUser) { setError("Bu isimde hesap var. Giriş yapın."); setLoading(false); return; }
    if (!isSignup && !existingUser) { setError("Hesap bulunamadı. Kayıt olun."); setLoading(false); return; }
    const user = existingUser || { id: userId, name: name.trim(), email: email.trim(), createdAt: Date.now() };
    await save(`tf-user-${userId}`, user);
    onLogin(user);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
      <div className="ani-scale w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <Columns3 size={18} color="white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "'Space Mono', monospace" }}>TaskFlow</span>
          </div>
          <p className="text-slate-400 text-sm">Kanban proje yönetim tahtası</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {["Giriş", "Kayıt"].map((t, i) => (
              <button key={t} onClick={() => { setIsSignup(i === 1); setError(""); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${(i === 1) === isSignup ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}>
                {t}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">İsim</label>
            <input value={name} onChange={e => { setName(e.target.value); setError(""); }}
              placeholder="Adınız" onKeyDown={e => e.key === "Enter" && handleSubmit()}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition" />
          </div>
          {isSignup && (
            <div className="ani-fade">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">E-posta</label>
              <input value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                placeholder="ornek@email.com" type="email" onKeyDown={e => e.key === "Enter" && handleSubmit()}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition" />
            </div>
          )}
          {error && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            {loading ? "..." : isSignup ? "Hesap Oluştur" : "Giriş Yap"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════ */
function Dashboard({ user, onOpenBoard, onLogout }) {
  const [boards, setBoards] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      const b = await load(`tf-boards-${user.id}`);
      setBoards(b || []);
      setLoaded(true);
    })();
  }, [user.id]);

  useEffect(() => { if (creating && inputRef.current) inputRef.current.focus(); }, [creating]);

  const addBoard = async () => {
    if (!newTitle.trim()) return;
    const board = { id: uid(), title: newTitle.trim(), createdAt: Date.now() };
    const updated = [...boards, board];
    setBoards(updated);
    await save(`tf-boards-${user.id}`, updated);
    await save(`tf-board-${board.id}`, {
      columns: [
        { id: uid(), title: "Yapılacak", position: POS_GAP },
        { id: uid(), title: "Devam Ediyor", position: POS_GAP * 2 },
        { id: uid(), title: "Tamamlandı", position: POS_GAP * 3 },
      ],
      cards: []
    });
    setNewTitle("");
    setCreating(false);
    onOpenBoard(board);
  };

  const deleteBoard = async (e, boardId) => {
    e.stopPropagation();
    const updated = boards.filter(b => b.id !== boardId);
    setBoards(updated);
    await save(`tf-boards-${user.id}`, updated);
    await remove(`tf-board-${boardId}`);
  };

  const colors = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#f43f5e", "#8b5cf6"];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)" }}>
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <Columns3 size={16} color="white" />
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight" style={{ fontFamily: "'Space Mono', monospace" }}>TaskFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 hidden sm:block">Hoş geldin, <b className="text-slate-700">{user.name}</b></span>
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"><LogOut size={16} /></button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900">Board'larım</h1>
          {!creating && (
            <button onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white rounded-lg transition-all hover:shadow-lg hover:shadow-indigo-500/20"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <Plus size={15} />Yeni Board
            </button>
          )}
        </div>
        {creating && (
          <div className="ani-fade bg-white rounded-xl border border-slate-200 p-4 mb-6 flex gap-3 items-center shadow-sm">
            <input ref={inputRef} value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="Board adı..." onKeyDown={e => { if (e.key === "Enter") addBoard(); if (e.key === "Escape") setCreating(false); }}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
            <button onClick={addBoard} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"><Check size={16} /></button>
            <button onClick={() => { setCreating(false); setNewTitle(""); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"><X size={16} /></button>
          </div>
        )}
        {loaded && boards.length === 0 && !creating && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-slate-100"><LayoutDashboard size={28} className="text-slate-300" /></div>
            <p className="text-slate-500 text-sm mb-1">Henüz board yok</p>
            <p className="text-slate-400 text-xs">Yeni bir board oluşturarak başlayın</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((b, i) => (
            <button key={b.id} onClick={() => onOpenBoard(b)}
              className="ani-fade group text-left bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all relative overflow-hidden"
              style={{ animationDelay: `${i * 50}ms` }}>
              <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl" style={{ background: colors[i % colors.length] }} />
              <h3 className="font-semibold text-slate-800 text-sm mt-1 mb-1 pr-8">{b.title}</h3>
              <p className="text-xs text-slate-400">{new Date(b.createdAt).toLocaleDateString("tr-TR")}</p>
              <button onClick={e => deleteBoard(e, b.id)}
                className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 size={13} />
              </button>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

/* ══════════════════════════════════════════
   CARD MODAL
   ══════════════════════════════════════════ */
function CardModal({ card, columns, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(card.title);
  const [desc, setDesc] = useState(card.description || "");
  const [colId, setColId] = useState(card.columnId);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ ...card, title: title.trim(), description: desc.trim(), columnId: colId });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="ani-scale relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between">
            <h2 className="text-base font-bold text-slate-800">Kart Detayı</h2>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"><X size={16} /></button>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Başlık</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Açıklama</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} placeholder="Detay ekle..."
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Sütun</label>
            <select value={colId} onChange={e => setColId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition">
              {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => { onDelete(card.id); onClose(); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition">
              <Trash2 size={13} />Kartı Sil
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition">İptal</button>
              <button onClick={handleSave} className="px-4 py-2 text-xs font-medium text-white rounded-lg transition"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>Kaydet</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   KANBAN CARD
   ══════════════════════════════════════════ */
function KanbanCard({ card, isDragging, isOverlay, onEdit, registerRef, onPointerDown }) {
  return (
    <div
      ref={el => { if (registerRef) registerRef(card.id, el); }}
      data-card-id={card.id}
      className={`group relative bg-white rounded-lg border transition-all ${
        isDragging ? "opacity-30 border-dashed border-indigo-300 bg-indigo-50/40" :
        isOverlay ? "shadow-2xl border-indigo-400 rotate-[2deg] scale-[1.03]" :
        "border-slate-200 hover:border-slate-300 hover:shadow-sm"
      }`}
      style={isOverlay ? { cursor: "grabbing" } : {}}
    >
      <div className="flex items-start gap-1 p-2.5 sm:p-3">
        <button
          onPointerDown={onPointerDown}
          className="mt-0.5 p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing rounded touch-none shrink-0"
          style={{ touchAction: "none" }}
        >
          <GripVertical size={14} />
        </button>
        <div className="flex-1 min-w-0" onClick={() => !isDragging && onEdit && onEdit(card)}>
          <p className="text-sm font-medium text-slate-800 leading-snug cursor-pointer hover:text-indigo-700 transition">{card.title}</p>
          {card.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{card.description}</p>}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   KANBAN COLUMN
   ══════════════════════════════════════════ */
function KanbanColumn({ column, cards, onAddCard, onEditCard, onDeleteColumn, onRenameColumn, registerColRef, registerCardRef, onCardPointerDown, dropIndicator, isDragOver }) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editing, setEditing] = useState(false);
  const [colTitle, setColTitle] = useState(column.title);
  const addRef = useRef(null);

  useEffect(() => { if (adding && addRef.current) addRef.current.focus(); }, [adding]);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAddCard(column.id, newTitle.trim());
    setNewTitle("");
    setAdding(false);
  };

  const handleRename = () => {
    if (colTitle.trim() && colTitle.trim() !== column.title) {
      onRenameColumn(column.id, colTitle.trim());
    }
    setEditing(false);
  };

  const sorted = useMemo(() => [...cards].sort((a, b) => a.position - b.position), [cards]);
  const colColors = { "Yapılacak": "#6366f1", "Devam Ediyor": "#f59e0b", "Tamamlandı": "#10b981" };
  const dotColor = colColors[column.title] || "#94a3b8";

  return (
    <div
      ref={el => registerColRef(column.id, el)}
      data-column-id={column.id}
      className={`flex flex-col rounded-xl transition-colors shrink-0 ${isDragOver ? "bg-indigo-50/60" : "bg-slate-100/80"}`}
      style={{ width: 280, minWidth: 280, maxHeight: "calc(100vh - 140px)" }}
    >
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
          {editing ? (
            <input value={colTitle} onChange={e => setColTitle(e.target.value)} onBlur={handleRename} onKeyDown={e => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") { setColTitle(column.title); setEditing(false); } }}
              autoFocus className="flex-1 text-xs font-bold text-slate-700 uppercase tracking-wider bg-white border border-slate-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
          ) : (
            <h3 onDoubleClick={() => setEditing(true)} className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate cursor-default select-none">{column.title}</h3>
          )}
          <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 rounded-full px-1.5 py-0.5 shrink-0">{sorted.length}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setAdding(true)} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition"><Plus size={14} /></button>
          <button onClick={() => onDeleteColumn(column.id)} className="p-1 text-slate-300 hover:text-red-500 hover:bg-white rounded-md transition"><Trash2 size={12} /></button>
        </div>
      </div>

      {/* Cards */}
      <div className="taskflow-col flex-1 overflow-y-auto px-2 pb-2 space-y-1.5 relative" style={{ minHeight: 60 }}>
        {sorted.length === 0 && !adding && (
          <div className="py-6 text-center">
            <p className="text-xs text-slate-400">Kart eklemek için + tıklayın</p>
          </div>
        )}
        {sorted.map((card, i) => (
          <div key={card.id} className="relative">
            {dropIndicator && dropIndicator.columnId === column.id && dropIndicator.index === i && (
              <div className="drop-line h-0.5 bg-indigo-500 rounded-full -mt-0.5 mb-1 mx-1 transition-all" />
            )}
            <KanbanCard
              card={card}
              isDragging={dropIndicator?.dragCardId === card.id}
              onEdit={onEditCard}
              registerRef={registerCardRef}
              onPointerDown={e => onCardPointerDown(e, card)}
            />
          </div>
        ))}
        {dropIndicator && dropIndicator.columnId === column.id && dropIndicator.index === sorted.length && (
          <div className="drop-line h-0.5 bg-indigo-500 rounded-full mx-1 mt-0.5 transition-all" />
        )}
        {adding && (
          <div className="ani-fade bg-white rounded-lg border border-indigo-200 p-2.5 shadow-sm">
            <input ref={addRef} value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="Kart başlığı..." onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewTitle(""); } }}
              className="w-full text-sm border-0 focus:outline-none placeholder-slate-400" />
            <div className="flex items-center gap-1.5 mt-2">
              <button onClick={handleAdd} className="px-2.5 py-1 text-xs font-medium text-white rounded-md transition"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>Ekle</button>
              <button onClick={() => { setAdding(false); setNewTitle(""); }} className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-md transition">İptal</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   BOARD VIEW (main Kanban)
   ══════════════════════════════════════════ */
function BoardView({ board, user, onBack }) {
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState(null);
  const [addingCol, setAddingCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");

  // DnD state
  const [dragOverlay, setDragOverlay] = useState(null);
  const [dropIndicator, setDropIndicator] = useState(null);

  const colRefs = useRef(new Map());
  const cardRefs = useRef(new Map());
  const dragRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const addColRef = useRef(null);

  const registerColRef = useCallback((id, el) => { if (el) colRefs.current.set(id, el); else colRefs.current.delete(id); }, []);
  const registerCardRef = useCallback((id, el) => { if (el) cardRefs.current.set(id, el); else cardRefs.current.delete(id); }, []);

  // Load data
  useEffect(() => {
    (async () => {
      const data = await load(`tf-board-${board.id}`);
      if (data) {
        setColumns(data.columns || []);
        setCards(data.cards || []);
      }
      setLoading(false);
    })();
  }, [board.id]);

  // Persist
  const persist = useCallback(async (cols, cds) => {
    await save(`tf-board-${board.id}`, { columns: cols, cards: cds });
  }, [board.id]);

  useEffect(() => { if (!loading) persist(columns, cards); }, [columns, cards, loading, persist]);

  // Sorted columns
  const sortedColumns = useMemo(() => [...columns].sort((a, b) => a.position - b.position), [columns]);

  // ---- CARD CRUD ----
  const addCard = (columnId, title) => {
    const colCards = cards.filter(c => c.columnId === columnId).sort((a, b) => a.position - b.position);
    const position = colCards.length > 0 ? colCards[colCards.length - 1].position + POS_GAP : POS_GAP;
    setCards(prev => [...prev, { id: uid(), columnId, title, description: "", position, createdAt: Date.now() }]);
  };

  const updateCard = (updated) => {
    setCards(prev => {
      const newCards = prev.map(c => c.id === updated.id ? updated : c);
      // If column changed, recalc position
      if (updated.columnId !== prev.find(c => c.id === updated.id)?.columnId) {
        const colCards = newCards.filter(c => c.columnId === updated.columnId && c.id !== updated.id).sort((a, b) => a.position - b.position);
        const newPos = colCards.length > 0 ? colCards[colCards.length - 1].position + POS_GAP : POS_GAP;
        return newCards.map(c => c.id === updated.id ? { ...c, ...updated, position: newPos } : c);
      }
      return newCards;
    });
    setEditingCard(null);
  };

  const deleteCard = (cardId) => {
    setCards(prev => prev.filter(c => c.id !== cardId));
  };

  // ---- COLUMN CRUD ----
  const addColumn = () => {
    if (!newColTitle.trim()) return;
    const pos = sortedColumns.length > 0 ? sortedColumns[sortedColumns.length - 1].position + POS_GAP : POS_GAP;
    setColumns(prev => [...prev, { id: uid(), title: newColTitle.trim(), position: pos }]);
    setNewColTitle("");
    setAddingCol(false);
  };

  const deleteColumn = (colId) => {
    setColumns(prev => prev.filter(c => c.id !== colId));
    setCards(prev => prev.filter(c => c.columnId !== colId));
  };

  const renameColumn = (colId, newTitle) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, title: newTitle } : c));
  };

  // ---- DRAG & DROP ----
  const findDropTarget = useCallback((clientX, clientY, dragCardId) => {
    let targetCol = null;
    for (const [colId, colEl] of colRefs.current.entries()) {
      const r = colEl.getBoundingClientRect();
      if (clientX >= r.left - 10 && clientX <= r.right + 10 && clientY >= r.top && clientY <= r.bottom) {
        targetCol = colId;
        break;
      }
    }
    if (!targetCol) return null;

    const colCards = cards
      .filter(c => c.columnId === targetCol && c.id !== dragCardId)
      .sort((a, b) => a.position - b.position);

    let insertIndex = colCards.length;
    for (let i = 0; i < colCards.length; i++) {
      const cardEl = cardRefs.current.get(colCards[i].id);
      if (cardEl) {
        const cr = cardEl.getBoundingClientRect();
        const midY = cr.top + cr.height / 2;
        if (clientY < midY) {
          insertIndex = i;
          break;
        }
      }
    }
    return { columnId: targetCol, index: insertIndex, colCards };
  }, [cards]);

  const onCardPointerDown = useCallback((e, card) => {
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
    const isTouchDevice = e.pointerType === "touch";

    dragRef.current = {
      card, startX, startY, offsetX, offsetY,
      width: rect.width, height: rect.height,
      activated: false,
      activationTimer: null,
      pointerId: e.pointerId,
    };

    const activate = () => {
      if (!dragRef.current) return;
      dragRef.current.activated = true;
      setDragOverlay({
        card, x: startX - offsetX, y: startY - offsetY,
        width: rect.width, height: rect.height,
      });
      setDropIndicator({ columnId: card.columnId, index: cards.filter(c => c.columnId === card.columnId).sort((a, b) => a.position - b.position).findIndex(c => c.id === card.id), dragCardId: card.id });
    };

    if (isTouchDevice) {
      dragRef.current.activationTimer = setTimeout(activate, 200);
    }

    const onMove = (ev) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!dragRef.current.activated) {
        if (isTouchDevice) {
          if (dist > 8) {
            clearTimeout(dragRef.current.activationTimer);
            cleanup();
            return;
          }
        } else {
          if (dist > 5) activate();
          else return;
        }
      }

      if (!dragRef.current.activated) return;

      setDragOverlay(prev => prev ? { ...prev, x: ev.clientX - offsetX, y: ev.clientY - offsetY } : null);

      const target = findDropTarget(ev.clientX, ev.clientY, card.id);
      if (target) {
        setDropIndicator({ columnId: target.columnId, index: target.index, dragCardId: card.id });
      }

      // Auto-scroll horizontal
      if (scrollContainerRef.current) {
        const sr = scrollContainerRef.current.getBoundingClientRect();
        const scrollSpeed = 8;
        if (ev.clientX < sr.left + 50) scrollContainerRef.current.scrollLeft -= scrollSpeed;
        if (ev.clientX > sr.right - 50) scrollContainerRef.current.scrollLeft += scrollSpeed;
      }
    };

    const onUp = (ev) => {
      if (!dragRef.current) { cleanup(); return; }
      if (dragRef.current.activationTimer) clearTimeout(dragRef.current.activationTimer);

      if (dragRef.current.activated) {
        const target = findDropTarget(ev.clientX, ev.clientY, card.id);
        if (target) {
          setCards(prev => {
            const otherCards = prev.filter(c => c.id !== card.id);
            const colCards = otherCards.filter(c => c.columnId === target.columnId).sort((a, b) => a.position - b.position);
            const newPos = calcPosition(colCards, target.index);
            return otherCards.concat({ ...card, columnId: target.columnId, position: newPos });
          });
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
      if (dragRef.current?.activationTimer) clearTimeout(dragRef.current.activationTimer);
      dragRef.current = null;
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  }, [cards, findDropTarget]);

  useEffect(() => { if (addingCol && addColRef.current) addColRef.current.focus(); }, [addingCol]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-sm text-slate-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)" }}>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-5 py-2.5 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"><ArrowLeft size={18} /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-slate-900 truncate">{board.title}</h1>
          <p className="text-[10px] text-slate-400">{sortedColumns.length} sütun · {cards.length} kart</p>
        </div>
        <button onClick={() => setAddingCol(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition">
          <Plus size={13} />Sütun
        </button>
      </header>

      {/* Board */}
      <div ref={scrollContainerRef} className="flex-1 overflow-x-auto overflow-y-hidden p-4 sm:p-5">
        <div className="flex gap-4 h-full items-start" style={{ minHeight: "calc(100vh - 140px)" }}>
          {sortedColumns.map(col => (
            <KanbanColumn
              key={col.id}
              column={col}
              cards={cards.filter(c => c.columnId === col.id)}
              onAddCard={addCard}
              onEditCard={setEditingCard}
              onDeleteColumn={deleteColumn}
              onRenameColumn={renameColumn}
              registerColRef={registerColRef}
              registerCardRef={registerCardRef}
              onCardPointerDown={onCardPointerDown}
              dropIndicator={dropIndicator}
              isDragOver={dropIndicator?.columnId === col.id}
            />
          ))}

          {/* Add Column */}
          {addingCol ? (
            <div className="ani-fade shrink-0 bg-white rounded-xl border border-slate-200 p-3 shadow-sm" style={{ width: 280 }}>
              <input ref={addColRef} value={newColTitle} onChange={e => setNewColTitle(e.target.value)}
                placeholder="Sütun adı..." onKeyDown={e => { if (e.key === "Enter") addColumn(); if (e.key === "Escape") { setAddingCol(false); setNewColTitle(""); } }}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
              <div className="flex gap-1.5">
                <button onClick={addColumn} className="px-3 py-1.5 text-xs font-medium text-white rounded-lg"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>Ekle</button>
                <button onClick={() => { setAddingCol(false); setNewColTitle(""); }} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition">İptal</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingCol(true)}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-slate-400 bg-slate-100/50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl transition"
              style={{ width: 280 }}>
              <Plus size={14} />Sütun Ekle
            </button>
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      {dragOverlay && (
        <div
          className="fixed pointer-events-none z-50"
          style={{ left: dragOverlay.x, top: dragOverlay.y, width: dragOverlay.width }}
        >
          <KanbanCard card={dragOverlay.card} isOverlay={true} />
        </div>
      )}

      {/* Card Modal */}
      {editingCard && (
        <CardModal
          card={editingCard}
          columns={sortedColumns}
          onSave={updateCard}
          onDelete={deleteCard}
          onClose={() => setEditingCard(null)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN APP
   ══════════════════════════════════════════ */
export default function TaskFlow() {
  const [user, setUser] = useState(null);
  const [currentBoard, setCurrentBoard] = useState(null);
  const [view, setView] = useState("loading"); // loading, auth, dashboard, board
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    (async () => {
      try {
        const keys = await window.storage.list("tf-user-");
        if (keys && keys.keys && keys.keys.length > 0) {
          const userData = await load(keys.keys[0]);
          if (userData) { setUser(userData); setView("dashboard"); return; }
        }
      } catch {}
      setView("auth");
    })();
  }, []);

  const handleLogin = (u) => { setUser(u); setView("dashboard"); };
  const handleLogout = () => { setUser(null); setCurrentBoard(null); setView("auth"); };
  const handleOpenBoard = (b) => { setCurrentBoard(b); setView("board"); };
  const handleBack = () => { setCurrentBoard(null); setView("dashboard"); };

  if (!mounted || view === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f172a" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <Columns3 size={16} color="white" />
          </div>
          <span className="text-white font-bold animate-pulse" style={{ fontFamily: "'Space Mono', monospace" }}>TaskFlow</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <GlobalStyles />
      {view === "auth" && <AuthScreen onLogin={handleLogin} />}
      {view === "dashboard" && user && <Dashboard user={user} onOpenBoard={handleOpenBoard} onLogout={handleLogout} />}
      {view === "board" && user && currentBoard && <BoardView board={currentBoard} user={user} onBack={handleBack} />}
    </>
  );
}
