import mongoose, { Schema } from 'mongoose';

// 待办事项接口
export interface ITodo {
  _id?: string;
  content: string;
  comment?: string;
  status: 'important' | 'normal' | 'inProgress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

// 待办事项列接口
export interface ITodoColumn {
  _id?: string;
  title: string;
  todos: ITodo[];
  order: number;
}

// 待办事项面板接口
export interface ITodoBoard {
  _id?: string;
  userId: string;
  columns: ITodoColumn[];
}

// 待办事项模式
const TodoSchema = new Schema<ITodo>({
  content: { type: String, required: true },
  comment: { type: String, required: false },
  status: { 
    type: String, 
    enum: ['important', 'normal', 'inProgress', 'completed'],
    default: 'normal'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 待办事项列模式
const TodoColumnSchema = new Schema<ITodoColumn>({
  title: { type: String, required: true },
  todos: [TodoSchema],
  order: { type: Number, required: true }
});

// 待办事项面板模式
const TodoBoardSchema = new Schema<ITodoBoard>({
  userId: { type: String, required: true, index: true },
  columns: [TodoColumnSchema]
});

// 显式指定集合名称为 'todoboards'，确保数据保存在正确位置
export default mongoose.models.TodoBoard || mongoose.model<ITodoBoard>('TodoBoard', TodoBoardSchema, 'todoboards'); 