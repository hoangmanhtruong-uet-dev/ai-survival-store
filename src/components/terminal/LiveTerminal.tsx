'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LiveLog } from '@/types';
import { Terminal, Users, Sparkles, Filter, ShieldCheck } from 'lucide-react';

interface LiveTerminalProps {
  logs: LiveLog[];
  viewerCount?: number;
}

export const LiveTerminal: React.FC<LiveTerminalProps> = ({ logs, viewerCount = 18 }) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [currentTime, setCurrentTime] = useState<string>(() =>
    typeof window !== 'undefined' ? new Date().toTimeString().split(' ')[0] : '00:00:00'
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toTimeString().split(' ')[0]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Chỉ cuộn nội bộ bên trong khung terminal, không làm cuộn màn hình trang web
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs = logs.filter((log) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'ORDERS') return log.type === 'ORDER_CREATED' || log.type === 'PAYMENT_SUCCESS';
    if (filterType === 'TASKS') return log.type === 'TASK_DONE';
    if (filterType === 'CHAT') return log.type === 'CHAT';
    return true;
  });

  const formatTime = (isoString?: string) => {
    if (!isoString) return '00:00:00';
    try {
      const date = new Date(isoString);
      return date.toTimeString().split(' ')[0];
    } catch {
      return '00:00:00';
    }
  };

  const getLogBadge = (type: LiveLog['type']) => {
    switch (type) {
      case 'PAYMENT_SUCCESS':
        return (
          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
            TING TING
          </span>
        );
      case 'ORDER_CREATED':
        return (
          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            ORDER
          </span>
        );
      case 'TASK_DONE':
        return (
          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            TASK
          </span>
        );
      case 'CHAT':
        return (
          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
            CHAT
          </span>
        );
      case 'SYSTEM':
      default:
        return (
          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            SYS
          </span>
        );
    }
  };

  const getLogItemStyle = (type: LiveLog['type']) => {
    switch (type) {
      case 'PAYMENT_SUCCESS':
        return 'bg-gradient-to-r from-amber-950/70 via-amber-950/30 to-transparent border-l-2 border-amber-400 text-amber-100 shadow-sm';
      case 'ORDER_CREATED':
        return 'border-l-2 border-cyan-500/60 bg-zinc-900/30 text-cyan-200';
      case 'TASK_DONE':
        return 'border-l-2 border-rose-500/60 bg-zinc-900/30 text-rose-200';
      case 'CHAT':
        return 'border-l-2 border-violet-500/40 bg-zinc-900/20 text-zinc-300';
      case 'SYSTEM':
      default:
        return 'border-l-2 border-emerald-500/50 bg-zinc-900/20 text-emerald-300';
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-700/80 rounded-2xl overflow-hidden shadow-2xl relative font-mono ring-1 ring-emerald-500/10">
      
      {/* MAC TERMINAL HEADER */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-900/90 border-b border-zinc-800 select-none backdrop-blur-sm">
        {/* 3 chấm màu MacOS + Tên console */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80 shadow-xs" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80 shadow-xs" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-xs" />
          </div>
          <span className="ml-2 text-xs text-zinc-300 flex items-center gap-1.5 font-mono font-medium">
            <Terminal className="w-4 h-4 text-emerald-400" />
            cat@survival-server:~ <span className="text-zinc-500 hidden sm:inline">(PID: 1337)</span>
          </span>
        </div>

        {/* Live Viewer Counter */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs shadow-inner">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Users className="w-3.5 h-3.5 ml-0.5 text-emerald-400" />
          <span className="font-bold">{viewerCount}</span>
          <span className="hidden sm:inline text-emerald-400/80">đang xem</span>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900/60 border-b border-zinc-800/80 text-xs overflow-x-auto scrollbar-none">
        <Filter className="w-3.5 h-3.5 text-zinc-400 mr-1 shrink-0" />
        {[
          { id: 'ALL', label: 'Tất cả log' },
          { id: 'ORDERS', label: 'Tiền về & Đơn' },
          { id: 'TASKS', label: 'Sấy CV & Bói quẻ' },
          { id: 'CHAT', label: 'Khách hỏi AI' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all shrink-0 ${
              filterType === tab.id
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/80 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TERMINAL BODY */}
      <div
        ref={terminalContainerRef}
        className="flex-1 min-h-0 p-3.5 md:p-4 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-950"
      >
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className={`flex items-start gap-2.5 px-3 py-1.5 rounded-lg transition-all text-xs md:text-[13px] leading-relaxed ${getLogItemStyle(
              log.type
            )}`}
          >
            <span className="text-zinc-500 font-mono text-[11px] select-none shrink-0 pt-0.5">
              [{formatTime(log.created_at)}]
            </span>
            <div className="pt-0.5">{getLogBadge(log.type)}</div>
            <span className="flex-1 break-words font-mono">{log.message}</span>
          </div>
        ))}

        {/* Blinking interactive prompt cursor */}
        <div className="flex items-center gap-2 text-emerald-400 px-3 pt-2 text-xs md:text-[13px]">
          <span className="text-zinc-500 select-none text-[11px]">[{currentTime}]</span>
          <span className="font-bold text-emerald-400">cat@survival-server:~$</span>
          <span className="inline-block w-2.5 h-4 bg-emerald-400 animate-pulse ml-0.5 shadow-sm shadow-emerald-400" />
        </div>
      </div>

      {/* FOOTER TINH TẾ */}
      <div className="px-3.5 py-2 bg-zinc-900/60 border-t border-zinc-800/80 text-[11px] text-zinc-400 flex items-center justify-between select-none">
        <span className="flex items-center gap-1.5 text-zinc-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-emerald-400">Realtime Feed</span> • 60 Days Survival
        </span>
        <span className="flex items-center gap-1 text-zinc-500 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80" />
          UTF-8 • VietQR Active
        </span>
      </div>

    </div>
  );
};
