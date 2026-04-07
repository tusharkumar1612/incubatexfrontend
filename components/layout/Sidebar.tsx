'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Building2, Users, Star, TrendingUp,
  FileText, DollarSign, ShieldCheck, Zap, LogOut, Users2,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';

const navByRole: Record<string, Array<{ label: string; href: string; icon: React.ReactNode }>> = {
  ceo: [
    { label: 'Overview', href: '/dashboard/ceo', icon: <LayoutDashboard size={16} /> },
    { label: 'Startups', href: '/dashboard/ceo/startups', icon: <Building2 size={16} /> },
    { label: 'Leaderboard', href: '/dashboard/ceo/leaderboard', icon: <TrendingUp size={16} /> },
    { label: 'Cohort Report', href: '/dashboard/ceo/cohort', icon: <Zap size={16} /> },
    { label: 'Audit Logs', href: '/dashboard/ceo/audit', icon: <ShieldCheck size={16} /> },
  ],
  founder: [
    { label: 'My Startups', href: '/dashboard/founder', icon: <Building2 size={16} /> },
    { label: 'Investor Interest', href: '/dashboard/founder/milestones', icon: <Users2 size={16} /> },
    { label: 'Documents', href: '/dashboard/founder/documents', icon: <FileText size={16} /> },
    { label: 'My Score', href: '/dashboard/founder/score', icon: <Star size={16} /> },
  ],
  investor: [
    { label: 'Portfolio', href: '/dashboard/investor', icon: <LayoutDashboard size={16} /> },
    { label: 'Evaluate', href: '/dashboard/investor/evaluate', icon: <Star size={16} /> },
  ],
  admin: [
    { label: 'Overview', href: '/dashboard/ceo', icon: <LayoutDashboard size={16} /> },
    { label: 'Users', href: '/dashboard/admin/users', icon: <Users size={16} /> },
    { label: 'Startups', href: '/dashboard/ceo/startups', icon: <Building2 size={16} /> },
    { label: 'Financials', href: '/dashboard/admin/financials', icon: <DollarSign size={16} /> },
    { label: 'Audit Logs', href: '/dashboard/ceo/audit', icon: <ShieldCheck size={16} /> },
  ],
  finance: [
    { label: 'Disbursements', href: '/dashboard/finance', icon: <DollarSign size={16} /> },
    { label: 'Documents', href: '/dashboard/finance/documents', icon: <FileText size={16} /> },
  ],
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const role = user?.role ?? 'founder';
  const navItems = navByRole[role] ?? navByRole.founder;

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <aside className="w-60 bg-slate-900 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700/50">
        <span className="text-white font-bold text-lg tracking-tight">
          incubate<span className="text-violet-400">X</span>
        </span>
        <p className="text-slate-400 text-xs mt-0.5 capitalize">{role} Portal</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === item.href || pathname.startsWith(item.href + '/')
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white',
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-slate-400 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm w-full transition-colors"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
