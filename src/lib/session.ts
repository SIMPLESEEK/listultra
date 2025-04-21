// 简单的客户端会话管理工具
// 注意：这种方法在客户端浏览器中存储用户信息，适用于简单应用
// 生产环境中可能需要更安全的会话管理和服务器端验证

// 设置用户会话
export function setSession(user: {id: string, email: string}) {
  if (typeof window !== 'undefined') {
    // 保存到localStorage
    localStorage.setItem('user', JSON.stringify(user));
    console.log('[客户端] 用户信息已保存到localStorage', user);
    
    // 同时设置cookie，使服务器端可以读取
    // 注意：在生产环境中，应使用HttpOnly和Secure选项增强安全性
    try {
      document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${60*60*24*7}; SameSite=Lax`;
      console.log('[客户端] 用户信息已保存到Cookie');
    } catch (e) {
      console.error('[客户端] 保存Cookie失败:', e);
    }
  }
}

// 获取当前用户会话
export function getSession() {
  if (typeof window !== 'undefined') {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      console.log('[客户端] 从localStorage获取用户:', user);
      return user;
    } catch (e) {
      console.error('[客户端] 从localStorage获取用户失败:', e);
      return null;
    }
  }
  return null;
}

// 清除用户会话（登出）
export function clearSession() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('user');
      console.log('[客户端] 已从localStorage中清除用户信息');
      
      // 清除cookie
      document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      console.log('[客户端] 已从Cookie中清除用户信息');
    } catch (e) {
      console.error('[客户端] 清除会话失败:', e);
    }
  }
}

// 检查用户是否已登录
export function isLoggedIn() {
  return !!getSession();
} 