import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Layers,
  Calculator,
  AlertTriangle,
  BookOpen,
  FileCheck,
  Cpu,
  Database,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { SystemHealth } from '../../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  systemHealth: SystemHealth | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, systemHealth }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'viewer', label: 'Blueprint Viewer', icon: Layers },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
    { id: 'reports', label: 'Analysis Reports', icon: FileCheck },
  ];

  return (
    <aside className="w-64 bg-panel border-r border-borderline flex flex-col justify-between select-none h-screen">
      {/* Brand Header */}
      <div>
        <div className="p-4 border-b border-borderline">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-accent flex items-center justify-center text-white font-mono font-bold text-sm tracking-wider shadow-sm">
              BIQ
            </div>
            <div>
              <h1 className="font-bold text-base text-textPrimary tracking-tight leading-none">
                Blueprint<span className="text-accent">IQ</span>
              </h1>
              <p className="text-[9px] uppercase tracking-wider text-textSecondary font-medium mt-1">
                Uncertainty-Aware BOQ
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-textSecondary uppercase tracking-wider">
            Workstation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-accent-subtle text-accent border border-accent/20'
                    : 'text-textPrimary hover:bg-canvas'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-textSecondary'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-accent" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Health Status Footer */}
      <div className="p-3 border-t border-borderline bg-canvas/60 space-y-2">
        <div className="text-[10px] font-semibold text-textSecondary uppercase tracking-wider px-1">
          Engine Connectivity
        </div>
        
        {/* Ollama / Gemma 2B Status */}
        <div className="bg-panel border border-borderline rounded p-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-textSecondary" />
            <span className="font-medium text-[11px]">Gemma 2B</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                systemHealth?.ollama.available
                  ? systemHealth?.ollama.model_ready
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-[10px] mono-num text-textSecondary">
              {systemHealth?.ollama.available
                ? systemHealth?.ollama.model_ready
                  ? 'ONLINE'
                  : 'MODEL OFF'
                : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Database Status */}
        <div className="bg-panel border border-borderline rounded p-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-textSecondary" />
            <span className="font-medium text-[11px]">Database</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] mono-num text-textSecondary">
              {systemHealth?.supabase_database.connected ? 'SUPABASE' : 'LOCAL'}
            </span>
          </div>
        </div>

        <div className="px-1 pt-1 flex items-center justify-between text-[9px] text-textSecondary">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-success" /> Verified Standards
          </span>
          <span className="mono-num">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};
