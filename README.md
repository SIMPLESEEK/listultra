# todollar - 智能待办事项管理器

- [写在最前面：我什么都不会，有问题别怪我]
- [已知问题：有时候加载页面不显示数据库内容，退出再登入即可，我自己能忍]

一个功能强大的待办事项管理工具，支持分类、优先级和评论。适配PC和移动端。

## 功能特点

- 用户认证（支持手机号/邮箱登录）
- 创建多个待办事项列表
- 支持4种待办事项状态（重要、普通、进行中、已完成）
- 待办事项评论功能
- 响应式设计，支持PC和移动端
- 数据存储在MongoDB Atlas

## 技术栈

- Next.js 14 (App Router)
- TypeScript
- MongoDB & Mongoose
- NextAuth.js（认证）
- Tailwind CSS（样式）
- Vercel（部署）

## 本地开发

### 环境变量设置

创建`.env.local`文件并设置以下变量：

```
# MongoDB连接
MONGODB_URI=mongodb+srv://your-username:your-password@clusterrvs.uvrdy.mongodb.net/calender/todugenius

# NextAuth配置
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

## 部署到Vercel

1. 在Vercel上创建新项目
2. 连接到GitHub存储库
3. 设置环境变量（同上述`.env.local`中的内容）
4. 部署应用

## 数据模型

应用使用以下数据模型：

1. 待办事项面板（TodoBoard）
   - 用户ID
   - 列表集合

2. 待办事项列表（TodoColumn）
   - 标题
   - 排序顺序
   - 待办事项集合

3. 待办事项（Todo）
   - 内容
   - 状态（重要、普通、进行中、已完成）
   - 评论
   - 创建和更新时间

## 使用帮助

1. 登录系统（使用手机号或邮箱登录）
2. 在主界面上，您可以：
   - 创建新的列表
   - 添加待办事项到列表中
   - 设置待办事项的状态和添加评论
   - 编辑和删除列表或待办事项
3. 在移动端，使用顶部的标签切换不同的列表，或查看"全部"视图

## 关于测试账号

任意手机号或邮箱都可以登录，密码统一使用：password
例如：
- 手机号：13800138000，密码：password
- 邮箱：test@example.com，密码：password
