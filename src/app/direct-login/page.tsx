'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DirectLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/direct-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        // 如果登录成功，等待 2 秒后重定向到首页（可选）
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch (error) {
      setResult({ success: false, message: '请求错误', error: String(error) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">直接登录测试</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium mb-1">邮箱地址</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium mb-1">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        {result && (
          <div className={`mt-4 p-3 rounded-md ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
            <div className="font-medium">{result.message}</div>
            {result.user && (
              <div className="mt-2 text-sm">
                <div>用户ID: {result.user.id}</div>
                <div>邮箱: {result.user.email}</div>
              </div>
            )}
            {result.error && <div className="mt-2 text-sm overflow-auto max-h-40">{result.error}</div>}
          </div>
        )}
      </div>
    </div>
  );
} 