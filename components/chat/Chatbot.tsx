"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Maximize2,
  Minimize2,
  RotateCcw,
  Copy,
  Check,
  Download,
  Sparkles,
} from "lucide-react";
import { usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SUGGESTIONS = [
  "Tampilkan biodata & profil saya",
  "Berapa IPK kumulatif saya sekarang?",
  "Lihat KHS semester 1",
  "Apa saja mata kuliah KRS semester aktif?",
  "Berapa total SKS yang sudah lulus?",
  "Predikat kelulusan & syarat yudisium",
  "Cari mata kuliah Algoritma",
  "Informasi statistik kampus STMIK IKMI",
];

const ADMIN_SUGGESTIONS = [
  "Tampilkan statistik umum SIAKAD IKMI",
  "Cari 5 mahasiswa dengan IPK tertinggi",
  "Berapa jumlah mahasiswa per prodi?",
  "Daftar program studi & jenjangnya",
  "Cari mahasiswa berdasarkan NIM",
  "Cari dosen berdasarkan NIDN",
  "Informasi tahun akademik & semester",
  "Cari mata kuliah di database",
];

const DOSEN_SUGGESTIONS = [
  "Tampilkan profil & NIDN saya",
  "Tampilkan statistik umum SIAKAD",
  "Berapa jumlah mahasiswa per prodi?",
  "Cari mahasiswa bernama Ahmad",
  "Siapa mahasiswa dengan IPK tertinggi?",
  "Daftar seluruh program studi IKMI",
  "Cari mata kuliah Sistem Informasi",
  "Informasi tahun akademik aktif",
];

function TypewriterMarkdown({ text, isLatest }: { text: string; isLatest: boolean }) {
  const [displayedText, setDisplayedText] = useState(() => (isLatest ? "" : text));
  const indexRef = useRef(isLatest ? 0 : text.length);

  useEffect(() => {
    if (!isLatest) {
      setDisplayedText(text);
      return;
    }

    const timer = setInterval(() => {
      if (indexRef.current < text.length) {
        indexRef.current = Math.min(indexRef.current + 3, text.length);
        setDisplayedText(text.slice(0, indexRef.current));
      } else {
        clearInterval(timer);
      }
    }, 12);

    return () => clearInterval(timer);
  }, [text, isLatest]);

  return (
    <div className="chatbot-markdown max-w-full break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ ...props }) => (
            <div className="my-2 overflow-x-auto rounded-lg border border-border bg-background shadow-xs">
              <table className="w-full text-left text-[12px] border-collapse" {...props} />
            </div>
          ),
          thead: ({ ...props }) => (
            <thead className="bg-muted/80 font-semibold text-foreground border-b border-border" {...props} />
          ),
          th: ({ ...props }) => (
            <th className="px-3 py-1.5 font-semibold text-foreground border-r border-border last:border-r-0 whitespace-nowrap" {...props} />
          ),
          td: ({ ...props }) => (
            <td className="px-3 py-1.5 border-t border-r border-border last:border-r-0 whitespace-nowrap" {...props} />
          ),
          tr: ({ ...props }) => (
            <tr className="even:bg-muted/30 hover:bg-muted/50 transition-colors" {...props} />
          ),
          p: ({ ...props }) => (
            <p className="mb-2 last:mb-0 leading-relaxed" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="my-1.5 ml-4 list-disc space-y-1 text-xs" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="my-1.5 ml-4 list-decimal space-y-1 text-xs" {...props} />
          ),
          li: ({ ...props }) => (
            <li className="leading-normal" {...props} />
          ),
          code: ({ ...props }) => (
            <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono text-primary border border-border/50" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="font-semibold text-sm text-foreground mt-3 mb-1.5 flex items-center gap-1.5" {...props} />
          ),
        }}
      >
        {displayedText}
      </ReactMarkdown>
    </div>
  );
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  const { messages, sendMessage, status, setMessages } = useChat({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();

  const isLoading = status !== "ready" && status !== "error";

  // Fetch user role untuk saran chat
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        setUserRole(data?.user?.role || 'mahasiswa');
      } catch {
        setUserRole('mahasiswa');
      }
    };
    if (isOpen) fetchRole();
  }, [isOpen]);

  // Dynamic suggestions based on role
  const suggestions = userRole === 'admin' || userRole === 'superuser' 
    ? ADMIN_SUGGESTIONS 
    : userRole === 'dosen' 
    ? DOSEN_SUGGESTIONS 
    : SUGGESTIONS;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "0px";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 96) + "px";
    }
  }, [inputValue]);

  // Focus pada input saat chatbot dibuka
  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => textareaRef.current?.focus(), 250);
  }, [isOpen]);

  const handleSend = useCallback((text: string) => {
    if (!text.trim() || isLoading) return;
    setInputValue("");

    sendMessage({ text });
  }, [isLoading, sendMessage]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSend(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* fallback */ }
  };

  const exportChat = () => {
    const chatText = messages
      .map((m) => {
        const text = getMessageText(m);
        const role = m.role === 'user' ? 'Anda' : 'Bot';
        return `${role}: ${text}`;
      })
      .join('\n\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-siakad-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getMessageText = (m: any) => {
    if (!m) return "";
    if (typeof m.content === "string" && m.content.trim()) return m.content;
    if (m.parts && Array.isArray(m.parts)) {
      return m.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("");
    }
    return "";
  };

  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(date);

  if (pathname === "/login" || pathname?.startsWith("/login/")) return null;

  // Floating button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-3.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 z-50"
        aria-label="Buka Chatbot"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    );
  }

  const size = isExpanded
    ? "w-[90vw] sm:w-[560px] h-[80vh] sm:h-[680px]"
    : "w-[340px] sm:w-[420px] h-[520px]";

  return (
    <div className={`chatbot-container fixed bottom-6 right-6 ${size} bg-background border rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden transition-all duration-300`}>

      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div className="leading-tight">
            <h3 className="font-semibold text-[13px]">SIAKAD Bot</h3>
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-emerald-400/15 text-emerald-300">
              <span className={`w-1 h-1 rounded-full ${isLoading ? "bg-blue-400 animate-pulse" : "bg-emerald-400"}`} />
              {isLoading ? "Mengetik..." : "Online"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {messages.length > 0 && (
            <>
              <button onClick={exportChat} className="p-1.5 rounded-lg text-primary-foreground/50 hover:text-primary-foreground hover:bg-white/10 transition-colors" title="Export chat">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setMessages([])} className="p-1.5 rounded-lg text-primary-foreground/50 hover:text-primary-foreground hover:bg-white/10 transition-colors" title="Reset chat">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 rounded-lg text-primary-foreground/50 hover:text-primary-foreground hover:bg-white/10 transition-colors" title={isExpanded ? "Perkecil" : "Perbesar"}>
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg text-primary-foreground/50 hover:text-primary-foreground hover:bg-white/10 transition-colors" aria-label="Tutup">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 chatbot-messages">
        {messages.length === 0 ? (
          <div className="flex flex-col h-full justify-center items-center gap-5">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Halo! Saya SIAKAD Bot 👋</p>
              <p className="text-xs text-muted-foreground mt-1">
                {userRole === 'admin' || userRole === 'superuser' 
                  ? 'Tanyakan statistik atau cari data akademik'
                  : userRole === 'dosen'
                  ? 'Tanyakan data mahasiswa atau statistik'
                  : 'Tanyakan seputar akademik Anda'}
              </p>
            </div>
            <div className="w-full flex flex-col gap-1.5">
              {suggestions.slice(0, 4).map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="w-full text-left px-3 py-2 text-xs rounded-lg border bg-background hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, index) => {
            const text = getMessageText(m);
            if (!text) return null;
            const isUser = m.role === "user";
            const isLatestAssistant = !isUser && index === messages.length - 1;

            return (
              <div key={m.id} className={`chatbot-message flex items-end gap-2 ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`} style={{ maxWidth: isUser ? "85%" : "95%" }}>
                <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center mb-5 ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                </div>
                <div className="flex flex-col gap-0.5 max-w-full">
                  <div className={`px-3.5 py-2.5 text-[13px] leading-relaxed overflow-hidden ${isUser ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm" : "bg-muted/40 border rounded-2xl rounded-bl-sm"}`}>
                    {isUser ? (
                      <div className="break-words whitespace-pre-wrap">{text}</div>
                    ) : (
                      <TypewriterMarkdown text={text} isLatest={isLatestAssistant} />
                    )}
                  </div>
                  <div className={`flex items-center gap-1.5 px-1 ${isUser ? "justify-end" : "justify-start"}`}>
                    <span className="text-[10px] text-muted-foreground/50">
                      {(m as any).createdAt ? formatTime(new Date((m as any).createdAt)) : ""}
                    </span>
                    {!isUser && text && (
                      <button onClick={() => copyToClipboard(text, m.id)} className="p-0.5 text-muted-foreground/30 hover:text-muted-foreground transition-colors" title="Salin">
                        {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="chatbot-message flex items-end gap-2 mr-auto" style={{ maxWidth: "85%" }}>
            <div className="w-6 h-6 rounded-full shrink-0 bg-muted text-muted-foreground flex items-center justify-center mb-5">
              <Bot className="w-3 h-3" />
            </div>
            <div className="px-4 py-3 bg-muted/50 border rounded-2xl rounded-bl-sm">
              <div className="flex gap-1 items-center">
                <span className="chatbot-dot w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" />
                <span className="chatbot-dot w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0.15s" }} />
                <span className="chatbot-dot w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0.3s" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t">
        {/* Quick Actions Popup */}
        {showQuickActions && (
          <div className="mb-2 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 border rounded-lg bg-background/95 backdrop-blur-xs">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => { handleSend(s); setShowQuickActions(false); }}
                className="text-[10px] px-2 py-1 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-left"
              >
                <Sparkles className="w-2.5 h-2.5 shrink-0 text-primary" />
                {s}
              </button>
            ))}
          </div>
        )}
        
        <form onSubmit={handleFormSubmit} className="flex items-end bg-muted/40 rounded-xl border focus-within:border-primary/30 transition-colors">
          <button
            type="button"
            onClick={() => setShowQuickActions(!showQuickActions)}
            className={`p-2 m-1 transition-colors shrink-0 ${showQuickActions ? "text-primary bg-primary/10 rounded-lg" : "text-muted-foreground hover:text-foreground"}`}
            title="Saran pesan / Quick actions"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <textarea
            ref={textareaRef}
            className="flex-1 bg-transparent px-3 py-2 outline-none text-sm placeholder:text-muted-foreground/60 resize-none min-h-[36px] max-h-[96px] leading-snug"
            value={inputValue}
            placeholder="Ketik pesan..."
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="p-2 m-1 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
