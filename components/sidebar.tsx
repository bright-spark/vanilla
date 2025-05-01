import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Folder, MessageCircle, Menu } from 'lucide-react';

const navItems = [
  { label: 'New chat', icon: <Plus className="w-5 h-5" />, active: true, color: 'bg-[#7c4a2d] text-white' },
  { label: 'Projects', icon: <Folder className="w-5 h-5" />, active: false },
  { label: 'Chats', icon: <MessageCircle className="w-5 h-5" />, active: false },
];

const recentChats = [
  'Constructing a Curl Request for AI...',
  'Creating a New Next.js Project',
  'Responsive Tic Tac Toe with Boots...',
  'What is Bolt.DIY?',
  'Introduction to Next.js',
  'AI-Powered Web Development Bui...',
  'Tic Tac Toe Game with Tailwind CSS',
];

// Simple orange hamburger menu icon
function OrangeBurger() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="7" width="16" height="2" rx="1" fill="#7c4a2d" />
      <rect x="4" y="15" width="16" height="2" rx="1" fill="#7c4a2d" />
    </svg>
  );
}

export function Sidebar({ collapsed, setCollapsed, narrow, setNarrow }: { collapsed: boolean; setCollapsed: (v: boolean) => void; narrow: boolean; setNarrow: (v: boolean) => void }) {
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!collapsed) {
      const handleClick = (event: MouseEvent) => {
        if (
          sidebarRef.current &&
          !sidebarRef.current.contains(event.target as Node)
        ) {
          setNarrow(true);
        }
      };
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [collapsed, setCollapsed]);

  // Sidebar width: 0 (fully collapsed), 64 (narrow), 256 (expanded)
  let sidebarWidth = 64;
  if (!collapsed && !narrow) sidebarWidth = 256;

  return (
    <>
      {/* Sidebar overlay for mobile */}
      <AnimatePresence>
        {false && (
          <motion.div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCollapsed(true)}
          />
        )}
      </AnimatePresence>
      {/* Sidebar (hidden on mobile) */}
      <motion.aside
        ref={sidebarRef}
        className="sm:flex hidden fixed top-0 left-0 flex-col h-screen z-40 bg-[#181818] dark:bg-[#171717] border-r border-[#232323] dark:border-zinc-800"
        style={{ width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth, left: 0, margin: 0, padding: 0, overflow: 'hidden' }}
        animate={{ width: sidebarWidth }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      >
        {/* Top section: hamburger menu */}
        <div className="flex items-center justify-center h-16 border-b border-[#232323]">
          <button
            onClick={e => { setNarrow(!narrow); e.currentTarget.blur(); }}
            className="p-2 rounded-lg hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <OrangeBurger />
          </button>
        </div>

        {/* App name and nav */}
        <div>

          <nav className={`flex flex-col ${narrow ? 'px-0 py-2 gap-2 items-center' : 'px-2 py-4 gap-2'}`}>
            {navItems.map((item, idx) => (
              <button
                key={item.label}
                className={`flex items-center ${narrow ? 'justify-center w-12 h-12' : 'w-full gap-3 px-3 py-2'} rounded-md text-sm font-medium transition-colors ${item.active ? item.color || 'bg-[#232323] text-white' : 'text-neutral-400 dark:text-zinc-400 hover:bg-neutral-800 dark:hover:bg-zinc-800 hover:text-white'} ${item.label === 'New chat' ? 'font-semibold' : ''} focus:outline-none focus:ring-2 focus:ring-orange-500`}
                title={narrow ? item.label : undefined}
                tabIndex={0}
                onClick={idx === 0 ? (e => { window.dispatchEvent(new Event('newChat')); e.currentTarget.blur(); }) : undefined}
              >
                <span className="inline-flex items-center justify-center">{item.icon}</span>
                {!narrow && item.label}
              </button>
            ))}
          </nav>
          {/* Recents section */}
          {!narrow && (
            <div className="mt-4 px-4">
              <div className="text-xs text-neutral-500 uppercase mb-2 tracking-wide">Recents</div>
              <ul className="space-y-1">
                {recentChats.map((chat, idx) => (
                  <li key={chat} className="truncate text-sm text-neutral-300 hover:text-white cursor-pointer px-2 py-1 rounded transition-colors hover:bg-neutral-800" tabIndex={0} title={chat}>{chat}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {/* Spacer to push user info to bottom */}
        <div className="flex-1" />
        {/* User info always at the bottom */}
        <div className={`w-full px-4 py-4 border-t border-[#232323] dark:border-zinc-800 flex items-center gap-2 ${narrow ? 'justify-center px-0' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-neutral-700 dark:bg-zinc-700 flex items-center justify-center text-neutral-50 font-bold">M</div>
          {!narrow && (
            <div>
              <div className="text-sm text-white font-serif font-semibold leading-tight">martin.</div>
              <div className="text-xs text-neutral-400 dark:text-zinc-400 leading-tight">Pro plan</div>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
} 