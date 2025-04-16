import mongoose from 'mongoose';

// 连接字符串 - 从环境变量获取
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://your-username:your-password@clusterrvs.uvrdy.mongodb.net/listgenius';

if (!MONGODB_URI) {
  throw new Error('请定义MONGODB_URI环境变量');
}

// 打印连接信息（不包含敏感信息）
console.log('MongoDB连接到:', MONGODB_URI.replace(/\/\/([^:]+):[^@]+@/, '//***:***@'));

// 定义缓存对象
let cachedConnection: typeof mongoose | null = null;
let cachedUri: string | null = null;

async function connectDB() {
  try {
    // 检查连接字符串是否变更
    if (cachedUri && cachedUri !== MONGODB_URI && mongoose.connection.readyState !== 0) {
      console.log('连接字符串已变更，断开现有连接...');
      await mongoose.disconnect();
      cachedConnection = null;
    }
    
    // 更新缓存的URI
    cachedUri = MONGODB_URI;
    
    // 如果已连接，返回已有连接
    if (cachedConnection && mongoose.connection.readyState === 1) {
      console.log('使用现有MongoDB连接');
      return cachedConnection;
    }

    // 创建新连接
    console.log('尝试连接MongoDB...');
    const connection = await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
    
    // 列出所有可用集合
    if (connection.connection.db) {
      const collections = await connection.connection.db.listCollections().toArray();
      console.log('可用集合:', collections.map(c => c.name).join(', '));
    } else {
      console.log('无法获取数据库连接');
    }
    
    console.log('MongoDB连接成功');
    cachedConnection = connection;
    return connection;
  } catch (error) {
    console.error('MongoDB连接失败:', error);
    throw error;
  }
}

export default connectDB; 