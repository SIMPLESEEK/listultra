'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function AuthWrapper({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 如果不在加载中且用户未认证，重定向到登录页面
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  // 如果正在加载，显示加载指示器
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">加载中...</p>
        </div>
      </div>
    );
  }

  // 如果未认证，显示空内容（将被重定向）
  if (!isAuthenticated) {
    return null;
  }

  // 如果已认证，显示子组件
  return <>{children}</>;
} 