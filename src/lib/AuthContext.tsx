'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSession, setSession, clearSession } from './session';
import { useRouter } from 'next/navigation';

// 定义用户类型
type User = {
  id: string;
  email: string;
};

// 定义认证上下文类型
type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{success: boolean, message: string}>;
  logout: () => void;
  isAuthenticated: boolean;
};

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 认证提供者组件
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 初始化时从本地存储加载用户
  useEffect(() => {
    const loadUser = () => {
      const sessionUser = getSession();
      if (sessionUser) {
        setUser(sessionUser);
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  // 登录函数
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/direct-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        // 设置用户状态和本地存储
        setUser(data.user);
        setSession(data.user);
      }

      return data;
    } catch (error) {
      console.error('登录过程中发生错误:', error);
      return { success: false, message: '登录过程中发生错误' };
    }
  };

  // 登出函数
  const logout = () => {
    setUser(null);
    clearSession();
    router.push('/login');
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 使用认证上下文的钩子
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }
  return context;
} 