'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TodosRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4">正在重定向到待办事项仪表盘...</p>
      </div>
    </div>
  );
} 