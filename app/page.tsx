"use client";
import Chat from '@/components/chat';
import { Sidebar } from '@/components/sidebar';
import { useState } from 'react';

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarNarrow, setSidebarNarrow] = useState(false);
  return (
    <main className="flex min-h-screen flex-col bg-[#171717] overflow-x-hidden">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} narrow={sidebarNarrow} setNarrow={setSidebarNarrow} />
      <div className="flex-1 flex flex-col min-h-screen w-full min-w-0">
        <div className="flex-1 flex flex-col min-h-0">
          <Chat />
        </div>
      </div>
    </main>
  );
}
