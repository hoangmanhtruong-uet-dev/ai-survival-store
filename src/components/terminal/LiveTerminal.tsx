'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LiveLog } from '@/types';
import { Terminal, Users, Sparkles, Filter } from 'lucide-react';

interface LiveTerminalProps {
  logs: LiveLog[];
  viewerCount?: number;
}

export const LiveTerminal: React.FC<LiveTerminalProps> = ({ logs, viewerCount = 18 }) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  const [currentTime, setCurrentTime] = useState<string>('00:00:00');

  useEffect(() => {
    setCurrentTime(new Date().toTimeString().split(' ')[0]);
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

  const getLogColor = (type: LiveLog['type']) => {
    switch (type) {
      case 'PAYMENT_SUCCESS':
        return 'text-amber-300 font-bold bg-amber-950/40 border-l-2 border-amber-400 pl-2 py-0.5';
      case 'ORDER_CREATED':
        return 'text-cyan-400 pl-2';
      case 'TASK_DONE':
        return 'text-rose-400 pl-2 font-medium';
      case 'CHAT':
        return 'text-zinc-300 pl-2';
      case 'SYSTEM':
      default:
        return 'text-emerald-400 pl-2';
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative font-mono text-xs">
      
      {/* MAC TERMINAL HEADER */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800/80 select-none">
        {/* 3 chấm màu MacOS */}
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          <span className="ml-2 text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            cat@server-50k:~ (pid: 1337)
          </span>
        </div>

        {/* Live Viewer Counter */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 text-[10px]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <Users className="w-3 h-3 ml-0.5" />
          <span className="font-bold">{viewerCount}</span> đang xem
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900/50 border-b border-zinc-800/40 text-[10px] overflow-x-auto">
        <Filter className="w-3 h-3 text-zinc-500 mr-1 shrink-0" />
        {[
          { id: 'ALL', label: 'Tất cả' },
          { id: 'ORDERS', label: 'Tiền về & Đơn' },
          { id: 'TASKS', label: 'Sấy CV & Bói' },
          { id: 'CHAT', label: 'Khách hỏi' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-2 py-0.5 rounded transition shrink-0 ${
              filterType === tab.id
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-bold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TERMINAL BODY */}
      <div
        ref={terminalContainerRef}
        className="flex-1 p-3 overflow-y-auto space-y-1.5 max-h-[360px] md:max-h-[440px] scrollbar-thin scrollbar-thumb-zinc-800"
      >
        {filteredLogs.map((log) => (
          <div key={log.id} className={`leading-relaxed transition-all ${getLogColor(log.type)}`}>
            <span className="text-zinc-600 select-none mr-1.5">[{formatTime(log.created_at)}]</span>
            <span>{log.message}</span>
          </div>
        ))}
        {/* Blinking cursor */}
        <div className="flex items-center gap-1 text-emerald-400 pl-2 pt-1">
          <span className="text-zinc-600 select-none">[{currentTime}]</span>
          <span>cat@server:~$</span>
          <span className="inline-block w-2 h-3.5 bg-emerald-400 animate-pulse ml-0.5" />
        </div>
      </div>

      {/* FOOTER TINH TẾ */}
      <div className="px-3 py-1.5 bg-zinc-900/40 border-t border-zinc-800/60 text-[10px] text-zinc-500 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Realtime WebSocket Stream
        </span>
        <span className="text-zinc-600">UTF-8 • VietQR Active</span>
      </div>

    </div>
  );
};
