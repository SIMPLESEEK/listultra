import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import TodoBoardModel, { ITodo, ITodoColumn, ITodoBoard } from '@/models/TodoList';

// 添加锁定机制，避免并发处理同一个用户的请求
const activeRequests = new Set<string>();

// 获取用户的所有待办事项
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
    
    const userId = session.user.id || session.user.email;
    if (!userId) {
        return NextResponse.json({ error: '无法确定用户标识符' }, { status: 401 });
    }
    
    await connectDB();
    
    let todoBoard = await TodoBoardModel.findOne({ userId });
    
    if (!todoBoard) {
      try {
        todoBoard = await TodoBoardModel.create({
          userId,
          columns: [
            {
              title: '待办事项',
              todos: [],
              order: 0
            }
          ]
        });
      } catch (createError: unknown) {
        throw createError;
      }
    }
    
    return NextResponse.json(todoBoard, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: '获取待办事项失败', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// 创建或更新待办事项面板
export async function POST(req: NextRequest) {
  let userId: string | null | undefined = null;
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
    
    userId = session.user.id || session.user.email;
    if (!userId) {
        return NextResponse.json({ error: '无法确定用户标识符' }, { status: 401 });
    }
    
    if (activeRequests.has(userId)) {
      return NextResponse.json({ message: '请求正在处理中，请稍后再试' }, { status: 429 });
    }
    
    activeRequests.add(userId);
    
    await connectDB();
    
    const data = await req.json();
    
    if (!data.columns || !Array.isArray(data.columns)) {
      activeRequests.delete(userId);
      return NextResponse.json({ error: '无效的数据格式' }, { status: 400 });
    }
    
    try {
      const processedColumns = data.columns.map((column: Partial<ITodoColumn>) => {
        const columnData: Partial<ITodoColumn> = {
          title: column.title || '未命名列表',
          order: typeof column.order === 'number' ? column.order : 0,
        };
        
        if (column._id && typeof column._id === 'string' && column._id.match(/^[0-9a-fA-F]{24}$/)) {
          columnData._id = column._id;
        } else if (column._id) {
          console.warn(`Invalid column._id found and ignored: ${column._id}`);
        }
        
        if (Array.isArray(column.todos)) {
          columnData.todos = column.todos.map((todo: Partial<ITodo>): ITodo => {
            const todoData: Partial<ITodo> = {
              content: todo.content || '',
              status: todo.status || 'normal',
              comment: todo.comment || '',
              createdAt: todo.createdAt ? new Date(todo.createdAt) : new Date(),
              updatedAt: todo.updatedAt ? new Date(todo.updatedAt) : new Date()
            };
            
            if (todo._id && typeof todo._id === 'string' && todo._id.match(/^[0-9a-fA-F]{24}$/)) {
              todoData._id = todo._id;
            } else if (todo._id) {
              console.warn(`Invalid todo._id found and ignored: ${todo._id}`);
            }
            
            if (!todoData._id) {
                // Don't set _id here, Mongoose/Mongo will generate one if needed on upsert/create
            }

            return todoData as ITodo;
          });
        } else {
          columnData.todos = [];
        }
        
        return columnData;
      });
      
      const todoBoard = await TodoBoardModel.findOneAndUpdate(
        { userId },
        { userId, columns: processedColumns as ITodoColumn[] },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      
      return NextResponse.json(todoBoard, { status: 200 });
    } catch (updateError: unknown) {
      throw updateError;
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: '更新待办事项失败', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  } finally {
    if (userId) {
      activeRequests.delete(userId);
    }
  }
} 