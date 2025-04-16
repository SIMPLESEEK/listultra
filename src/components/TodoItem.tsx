'use client';

import { useState, useEffect } from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { ITodo } from '@/models/TodoList';
import { cn } from '@/lib/utils';

interface TodoItemProps {
  todo: ITodo;
  onEdit: (id: string, data: Partial<ITodo>) => void;
  onDelete: (id: string) => void;
}

export default function TodoItem({ todo, onEdit, onDelete }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(todo.content);
  const [comment, setComment] = useState(todo.comment || '');
  const [status, setStatus] = useState(todo.status);

  useEffect(() => {
    setContent(todo.content);
    setComment(todo.comment || '');
    setStatus(todo.status);
  }, [todo]);

  const handleSave = () => {
    const trimmedContent = content.trim();
    const trimmedComment = comment.trim();
    if (trimmedContent) {
      onEdit(todo._id as string, { 
        content: trimmedContent, 
        comment: trimmedComment,
        status 
      });
      setIsEditing(false);
    } else {
      alert("待办事项内容不能为空");
    }
  };

  const handleCancel = () => {
    setContent(todo.content);
    setComment(todo.comment || '');
    setStatus(todo.status);
    setIsEditing(false);
  };

  const getStatusColor = () => {
    switch (status) {
      case 'important':
        return 'bg-red-50 border-red-200';
      case 'inProgress':
        return 'bg-blue-50 border-blue-200';
      case 'completed':
        return 'bg-gray-100 border-gray-200 text-gray-500 line-through';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const handleStatusChange = (newStatus: ITodo['status']) => {
    setStatus(newStatus);
    if (!isEditing) {
      onEdit(todo._id as string, { status: newStatus });
    }
  };

  return (
    <div className={cn(
      'border rounded-md p-3 mb-2 transition-all',
      getStatusColor()
    )}>
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            className="w-full p-2 border rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            autoFocus
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleStatusChange('important')}
              className={cn(
                'px-2 py-1 text-xs rounded-md',
                status === 'important' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              )}
            >
              重要
            </button>
            <button
              onClick={() => handleStatusChange('normal')}
              className={cn(
                'px-2 py-1 text-xs rounded-md',
                status === 'normal' 
                  ? 'bg-gray-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              普通
            </button>
            <button
              onClick={() => handleStatusChange('inProgress')}
              className={cn(
                'px-2 py-1 text-xs rounded-md',
                status === 'inProgress' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              )}
            >
              进行中
            </button>
            <button
              onClick={() => handleStatusChange('completed')}
              className={cn(
                'px-2 py-1 text-xs rounded-md',
                status === 'completed' 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              )}
            >
              已完成
            </button>
          </div>
          <textarea
            className="w-full p-2 border rounded-md text-xs focus:ring-indigo-500 focus:border-indigo-500"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="添加备注..."
            rows={2}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              保存
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-start mb-1 gap-2">
            <div className={`text-sm font-medium flex-1 ${status === 'completed' ? 'text-gray-500 line-through' : ''}`}>{content}</div>
            <div className="flex gap-1 flex-shrink-0">
              <button 
                onClick={() => setIsEditing(true)}
                className="text-gray-500 hover:text-blue-500 p-0.5 rounded hover:bg-blue-100"
                aria-label="编辑"
              >
                <FiEdit2 size={14} />
              </button>
              <button 
                onClick={() => onDelete(todo._id as string)}
                className="text-gray-500 hover:text-red-500 p-0.5 rounded hover:bg-red-100"
                aria-label="删除"
              >
                <FiTrash2 size={14} />
              </button>
            </div>
          </div>
          
          {todo.comment && (
            <div className="mt-1 p-2 text-xs bg-yellow-50 border border-yellow-100 rounded-md break-words">
              {todo.comment}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 