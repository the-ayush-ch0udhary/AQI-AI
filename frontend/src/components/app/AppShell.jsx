import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell({ children, onRefresh }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="lg:pl-64">
        <Header onRefresh={onRefresh} />
        <main className="px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
