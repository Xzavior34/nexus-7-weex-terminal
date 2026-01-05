import { useState } from "react";
import { 
  TrendingUp, 
  Brain, 
  Terminal, 
  Wallet, 
  ChevronLeft,
  ChevronRight,
  Activity,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: "markets", label: "Live Markets", icon: TrendingUp, badge: "LIVE" },
  { id: "strategies", label: "Active Strategies", icon: Zap, badge: "3" },
  { id: "neural", label: "AI Neural Logs", icon: Brain },
  { id: "wallet", label: "Wallet/PnL", icon: Wallet },
];

interface TradingSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function TradingSidebar({ activeSection, onSectionChange }: TradingSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo Section */}
      <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 glow-profit">
          <Activity className="w-5 h-5 text-primary" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground tracking-wider">NEXUS-7</span>
            <span className="text-xs text-muted-foreground">GlassBox Terminal</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-primary/10 text-primary glow-profit"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon 
                className={cn(
                  "w-5 h-5 flex-shrink-0 transition-all",
                  isActive && "text-glow-profit"
                )} 
              />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <span 
                      className={cn(
                        "px-2 py-0.5 text-xs font-bold rounded",
                        item.badge === "LIVE" 
                          ? "bg-primary/20 text-primary animate-pulse" 
                          : "bg-sidebar-accent text-sidebar-foreground"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Status Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent",
          collapsed && "justify-center"
        )}>
          <div className="relative">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-primary rounded-full" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-xs font-medium text-foreground">WEEX Connected</span>
              <span className="text-[10px] text-muted-foreground">Latency: 12ms</span>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-sidebar-accent border border-sidebar-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  );
}
