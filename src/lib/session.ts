// 简单的客户端会话管理工具
// 注意：这种方法在客户端浏览器中存储用户信息，适用于简单应用
// 生产环境中可能需要更安全的会话管理和服务器端验证

// 设置用户会话
export function setSession(user: {id: string, email: string}) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
}

// 获取当前用户会话
export function getSession() {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
  return null;
}

// 清除用户会话（登出）
export function clearSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
  }
}

// 检查用户是否已登录
export function isLoggedIn() {
  return !!getSession();
} 