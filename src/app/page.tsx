'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import AuthWrapper from '@/components/AuthWrapper';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 如果用户已登录，直接跳转到仪表盘
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  return (
    <AuthWrapper>
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">正在加载中，请稍候...</p>
        </div>
      </div>
    </AuthWrapper>
  );
}
