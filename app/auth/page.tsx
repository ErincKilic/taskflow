"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Columns3, AlertCircle } from "lucide-react";

export default function AuthPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("E-posta ve şifre gerekli");
      return;
    }
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalı");
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name || email.split("@")[0] } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      }}
    >
      <div className="ani-scale w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              }}
            >
              <Columns3 size={18} color="white" />
            </div>
            <span
              className="text-2xl font-bold text-white tracking-tight"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              TaskFlow
            </span>
          </div>
          <p className="text-slate-400 text-sm">
            Kanban proje yönetim tahtası
          </p>
        </div>

        {/* Form */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {["Giriş", "Kayıt"].map((t, i) => (
              <button
                key={t}
                onClick={() => {
                  setIsSignup(i === 1);
                  setError("");
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  (i === 1) === isSignup
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {isSignup && (
            <div className="ani-fade">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                İsim
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Adınız"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              E-posta
            </label>
            <input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              type="email"
              placeholder="ornek@email.com"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Şifre
            </label>
            <input
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              type="password"
              placeholder="En az 6 karakter"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs flex items-center gap-1">
              <AlertCircle size={12} />
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            }}
          >
            {loading ? "..." : isSignup ? "Hesap Oluştur" : "Giriş Yap"}
          </button>
        </div>
      </div>
    </div>
  );
}
