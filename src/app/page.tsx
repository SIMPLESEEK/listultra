'use client';

import { useAuth } from '@/lib/AuthContext';
import AuthWrapper from '@/components/AuthWrapper';
import Link from 'next/link';

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">待办事项管理器</h1>
            <div className="flex items-center space-x-4">
              <span>{user?.email}</span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                退出登录
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">欢迎使用</h2>
            <p className="mb-4">这是您的个人待办事项管理器。在这里，您可以创建、编辑和管理您的待办事项。</p>
            <div className="mt-6">
              <Link
                href="/todos"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                查看我的待办事项
              </Link>
            </div>
          </div>
        </main>
      </div>
    </AuthWrapper>
  );
}
