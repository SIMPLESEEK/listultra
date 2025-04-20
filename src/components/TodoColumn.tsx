'use client';

import { useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { ITodo, ITodoColumn } from '@/models/TodoList';
import TodoItem from './TodoItem';
import { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';

interface TodoColumnProps {
  column: ITodoColumn;
  onUpdateColumn: (columnId: string, data: Partial<ITodoColumn>) => void;
  onDeleteColumn: (columnId: string) => void;
  onAddTodo: (columnId: string, todo: Omit<ITodo, '_id'>) => void;
  onEditTodo: (columnId: string, todoId: string, todo: Partial<ITodo>) => void;
  onDeleteTodo: (columnId: string, todoId: string) => void;
  dragHandleProps?: DraggableProvidedDragHandleProps | null | undefined;
}

export default function TodoColumn({
  column,
  onUpdateColumn,
  onDeleteColumn,
  onAddTodo,
  onEditTodo,
  onDeleteTodo,
  dragHandleProps,
}: TodoColumnProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(column.title);
  const [newTodo, setNewTodo] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTodoStatus, setNewTodoStatus] = useState<ITodo['status']>('normal');

  const handleSaveTitle = () => {
    if (title.trim()) {
      onUpdateColumn(column._id as string, { title });
      setIsEditingTitle(false);
    }
  };

  const handleAddTodo = () => {
    if (newTodo.trim()) {
      onAddTodo(column._id as string, {
        content: newTodo,
        status: newTodoStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setNewTodo('');
      setNewTodoStatus('normal');
      setShowAddForm(false);
    }
  };

  // 按状态对待办事项进行排序
  const sortedTodos = [...column.todos].sort((a, b) => {
    const statusOrder = {
      important: 0,
      normal: 1,
      inProgress: 2,
      completed: 3,
    };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  return (
    <div className="flex flex-col border rounded-md bg-gray-50 w-full md:w-64 min-h-96 max-h-[calc(100vh-200px)] overflow-hidden flex-shrink-0">
      <div {...dragHandleProps} className="flex justify-between items-center p-3 border-b bg-white cursor-grab">
        {isEditingTitle ? (
          <div className="flex w-full">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 border rounded-l-md px-2 py-1 text-sm"
              autoFocus
            />
            <button
              onClick={handleSaveTitle}
              className="bg-blue-500 text-white px-2 py-1 text-sm rounded-r-md"
            >
              保存
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-medium">{column.title}</h3>
            <div className="flex gap-1">
              <button
                onClick={() => setIsEditingTitle(true)}
                className="text-gray-500 hover:text-blue-500 p-1"
              >
                <FiEdit2 size={16} />
              </button>
              <button
                onClick={() => onDeleteColumn(column._id as string)}
                className="text-gray-500 hover:text-red-500 p-1"
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sortedTodos.map((todo) => (
          <TodoItem
            key={todo._id}
            todo={todo}
            onEdit={(todoId, data) => onEditTodo(column._id as string, todoId, data)}
            onDelete={(todoId) => onDeleteTodo(column._id as string, todoId)}
          />
        ))}

        {showAddForm ? (
          <div className="border rounded-md p-3 bg-white space-y-2">
            <textarea
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="输入待办事项..."
              className="w-full p-2 border rounded-md text-sm"
              autoFocus
              rows={2}
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setNewTodoStatus('important')}
                className={`px-2 py-1 text-xs rounded-md ${
                  newTodoStatus === 'important'
                    ? 'bg-red-500 text-white'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                重要
              </button>
              <button
                onClick={() => setNewTodoStatus('normal')}
                className={`px-2 py-1 text-xs rounded-md ${
                  newTodoStatus === 'normal'
                    ? 'bg-gray-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                普通
              </button>
              <button
                onClick={() => setNewTodoStatus('inProgress')}
                className={`px-2 py-1 text-xs rounded-md ${
                  newTodoStatus === 'inProgress'
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                进行中
              </button>
              <button
                onClick={() => setNewTodoStatus('completed')}
                className={`px-2 py-1 text-xs rounded-md ${
                  newTodoStatus === 'completed'
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-300 text-gray-700'
                }`}
              >
                已完成
              </button>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleAddTodo}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                添加
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center w-full p-2 border border-dashed rounded-md text-gray-500 hover:text-blue-500 hover:border-blue-500"
          >
            <FiPlus size={18} className="mr-1" />
            <span>添加待办事项</span>
          </button>
        )}
      </div>
    </div>
  );
} 