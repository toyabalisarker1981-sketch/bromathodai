import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, MessageSquare, BookOpen, Brain, Settings, LogOut, Library, Calculator, ClipboardList, Users, Play, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "ড্যাশবোর্ড" },
  { to: "/chat", icon: MessageSquare, label: "AI টিউটর" },
  { to: "/notebook", icon: BookOpen, label: "নোটবুক" },
  { to: "/library", icon: Library, label: "লাইব্রেরী" },
  { to: "/quiz", icon: Brain, label: "কুইজ" },
  { to: "/exam", icon: ClipboardList, label: "পরীক্ষা" },
  { to: "/calculator", icon: Calculator, label: "ক্যালকুলেটর" },
  { to: "/community", icon: Users, label: "কমিউনিটি" },
  { to: "/studytube", icon: Play, label: "StudyTube" },
  { to: "/leaderboard", icon: Trophy, label: "র‍্যাংকিং" },
  { to: "/settings", icon: Settings, label: "সেটিংস" },
];

const AppLayout = () => {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-background bg-grid-pattern">
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-20 lg:w-64 fixed inset-y-0 left-0 z-40 border-r border-border/50 bg-background/80 backdrop-blur-3xl">
        <div className="flex items-center gap-3 p-4 lg:px-6 h-16 border-b border-border/50">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/10">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <span className="hidden lg:block font-display text-lg font-bold gradient-text">BRO MATHOD Ai</span>
        </div>
        <nav className="flex-1 flex flex-col gap-0.5 p-3 overflow-y-auto scrollbar-hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm shadow-primary/10 backdrop-blur-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="hidden lg:block">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border/50">
          <button onClick={signOut}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 w-full">
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="hidden lg:block">সাইন আউট</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-20 lg:ml-64 pb-20 md:pb-0">
        {/* Top bar with notification bell */}
        <div className="sticky top-0 z-30 flex items-center justify-end px-4 py-2 bg-background/60 backdrop-blur-sm border-b border-border/30 md:border-none">
          <NotificationBell />
        </div>
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border/50 bg-background/80 backdrop-blur-3xl">
        <div className="flex items-center justify-around h-16">
          {navItems.slice(0, 5).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"}
              className={({ isActive }) => cn("flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all duration-200", isActive ? "text-primary" : "text-muted-foreground")}>
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </NavLink>
          ))}
          {[navItems[7], navItems[8], navItems[9]].map((item) => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => cn("flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all duration-200", isActive ? "text-primary" : "text-muted-foreground")}>
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
