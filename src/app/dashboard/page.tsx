'use client';

import { useEffect, useState, useReducer, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { FiColumns, FiList, FiMove, FiPlus, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import TodoColumn from '@/components/TodoColumn';
import { ITodoBoard, ITodoColumn, ITodo } from '@/models/TodoList';
import { cn } from '@/lib/utils';
import AuthWrapper from '@/components/AuthWrapper';

// --- Reducer Logic ---
type BoardAction =
  | { type: 'SET_BOARD'; payload: ITodoBoard }
  | { type: 'ADD_COLUMN'; payload: ITodoColumn }
  | { type: 'UPDATE_COLUMN'; payload: { columnId: string; data: Partial<ITodoColumn> } }
  | { type: 'DELETE_COLUMN'; payload: string } // columnId
  | { type: 'ADD_TODO'; payload: { columnId: string; todo: ITodo } }
  | { type: 'UPDATE_TODO'; payload: { columnId: string; todoId: string; data: Partial<ITodo> } }
  | { type: 'DELETE_TODO'; payload: { columnId: string; todoId: string } }
  | { type: 'REORDER_COLUMNS'; payload: ITodoColumn[] }; // New ordered columns

const initialBoardState: ITodoBoard | null = null;

function boardReducer(state: ITodoBoard | null, action: BoardAction): ITodoBoard | null {
  if (!state && action.type !== 'SET_BOARD') return state; // Must have state for most actions

  switch (action.type) {
    case 'SET_BOARD':
      return action.payload;
    case 'ADD_COLUMN':
      if (!state) return state;
      return {
        ...state,
        columns: [...state.columns, action.payload],
      };
    case 'UPDATE_COLUMN':
      if (!state) return state;
      return {
        ...state,
        columns: state.columns.map((col) =>
          col._id === action.payload.columnId ? { ...col, ...action.payload.data } : col
        ),
      };
    case 'DELETE_COLUMN':
      if (!state) return state;
      return {
        ...state,
        columns: state.columns.filter((col) => col._id !== action.payload),
      };
    case 'ADD_TODO':
      if (!state) return state;
      return {
        ...state,
        columns: state.columns.map((col) => {
          if (col._id === action.payload.columnId) {
            const existingTodos = Array.isArray(col.todos) ? col.todos : [];
            return { ...col, todos: [...existingTodos, action.payload.todo] };
          }
          return col;
        }),
      };
    case 'UPDATE_TODO':
       if (!state) return state;
       return {
         ...state,
         columns: state.columns.map((col) => {
           if (col._id === action.payload.columnId) {
             const updatedTodos = (Array.isArray(col.todos) ? col.todos : []).map((todo) =>
               todo._id === action.payload.todoId
                 ? { ...todo, ...action.payload.data, updatedAt: new Date() }
                 : todo
             );
             return { ...col, todos: updatedTodos };
           }
           return col;
         }),
       };
    case 'DELETE_TODO':
      if (!state) return state;
      return {
        ...state,
        columns: state.columns.map((col) => {
          if (col._id === action.payload.columnId) {
            const updatedTodos = (Array.isArray(col.todos) ? col.todos : []).filter(
              (todo) => todo._id !== action.payload.todoId
            );
            return { ...col, todos: updatedTodos };
          }
          return col;
        }),
      };
    case 'REORDER_COLUMNS':
        if (!state) return state;
        // Ensure the payload includes all necessary column data, not just IDs/order
        // The structure might need adjustment based on how REORDER_COLUMNS is dispatched
        return {
            ...state,
            columns: action.payload, // Assuming payload is the complete new ordered array
        };
    default:
      return state;
  }
}
// --- End Reducer Logic ---

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [state, dispatch] = useReducer(boardReducer, initialBoardState);
  const todoBoard = state;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [pcViewMode, setPcViewMode] = useState<'columns' | 'all'>('columns');

  useEffect(() => {
    if (user) {
      fetchTodos();
    }
  }, [user]);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/todos');
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API错误:', errorData);
        throw new Error(errorData.error || '加载失败');
      }
      const data: ITodoBoard = await response.json();
      dispatch({ type: 'SET_BOARD', payload: data });

      const firstColumnId = data.columns?.[0]?._id;
      if (typeof firstColumnId === 'string') {
        // @ts-ignore - Bypassing strict type check as logic ensures string or fallback
        setActiveTab(firstColumnId); 
      } else {
        setActiveTab('all');
      }
    } catch (error: unknown) {
      console.error('获取待办事项失败:', error instanceof Error ? error.message : error);
    } finally {
      setLoading(false);
    }
  };

  const saveBoardToServer = async (boardToSave: ITodoBoard) => {
    if (!boardToSave) return;
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columns: boardToSave.columns }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API错误:', errorData);
        throw new Error(errorData.error || '保存失败');
      }

      const savedData: ITodoBoard = await response.json();
      dispatch({ type: 'SET_BOARD', payload: savedData });
      return savedData;
    } catch (error: unknown) {
      console.error('保存失败:', error instanceof Error ? error.message : error);
      alert('操作失败，请刷新页面后重试');
      throw error;
    }
  };

  const handleUpdateColumn = async (columnId: string, data: Partial<ITodoColumn>) => {
    if (!todoBoard) return;
    
    const originalColumn = todoBoard.columns.find(col => col._id === columnId);
    if (!originalColumn) return;
    
    dispatch({ type: 'UPDATE_COLUMN', payload: { columnId, data } });
    
    const boardStateAfterUpdate = boardReducer(todoBoard, { type: 'UPDATE_COLUMN', payload: { columnId, data } });

    if (boardStateAfterUpdate) {
      try {
        await saveBoardToServer(boardStateAfterUpdate);
      } catch (error: unknown) {
        console.error("Update column failed", error instanceof Error ? error.message : error);
        alert('更新列表失败，请刷新重试');
        dispatch({ type: 'UPDATE_COLUMN', payload: { columnId, data: originalColumn } });
      }
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!todoBoard) return;
    
    const columnToDelete = todoBoard.columns.find(col => col._id === columnId);
    if (!columnToDelete) return;
    
    const originalColumns = [...todoBoard.columns];
    
    dispatch({ type: 'DELETE_COLUMN', payload: columnId });

    if (activeTab === columnId) {
      const remainingColumns = originalColumns.filter(col => col._id !== columnId);
      if (remainingColumns.length > 0 && remainingColumns[0]?._id) {
        setActiveTab(remainingColumns[0]._id);
      } else {
        setActiveTab('all');
      }
    }

    const boardStateAfterDelete = boardReducer(todoBoard, { type: 'DELETE_COLUMN', payload: columnId });

    if (boardStateAfterDelete) {
      try {
        await saveBoardToServer(boardStateAfterDelete);
      } catch (error: unknown) {
        console.error('删除列表失败:', error instanceof Error ? error.message : error);
        alert('删除列表失败，请刷新页面后重试');
        dispatch({ type: 'SET_BOARD', payload: { ...todoBoard, columns: originalColumns } });
        if (activeTab === columnId) {
          if (originalColumns.length > 0 && originalColumns[0]?._id) {
            setActiveTab(originalColumns[0]._id);
          } else {
            setActiveTab('all');
          }
        }
      }
    } else {
      try {
        const emptyBoardState = { ...todoBoard, columns: [] };
        await saveBoardToServer(emptyBoardState);
      } catch (error: unknown) {
        console.error('删除最后一个列表时保存失败:', error instanceof Error ? error.message : error);
        alert('删除列表失败，请刷新页面后重试');
        dispatch({ type: 'SET_BOARD', payload: { ...todoBoard, columns: originalColumns } });
      }
    }
  };

  const handleAddTodo = async (columnId: string, todoData: Omit<ITodo, '_id'>) => {
    if (!todoBoard) return;
    
    const tempId = `todo-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newTodo: ITodo = {
      _id: tempId,
      ...todoData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    dispatch({ type: 'ADD_TODO', payload: { columnId, todo: newTodo } });
    
    const boardStateAfterAdd = boardReducer(todoBoard, { type: 'ADD_TODO', payload: { columnId, todo: newTodo } });

    if (boardStateAfterAdd) {
      try {
        await saveBoardToServer(boardStateAfterAdd);
      } catch (error: unknown) {
        console.error("Add todo failed", error instanceof Error ? error.message : error);
        alert('添加待办事项失败，请刷新重试');
        dispatch({ type: 'DELETE_TODO', payload: { columnId, todoId: tempId } });
      }
    }
  };

  const handleEditTodo = async (columnId: string, todoId: string, todoData: Partial<ITodo>) => {
    if (!todoBoard) return;
    
    const originalColumn = todoBoard.columns.find(col => col._id === columnId);
    const originalTodo = originalColumn?.todos.find(t => t._id === todoId);
    if (!originalTodo) return;
    
    dispatch({ type: 'UPDATE_TODO', payload: { columnId, todoId, data: todoData } });
    
    const boardStateAfterUpdate = boardReducer(todoBoard, { type: 'UPDATE_TODO', payload: { columnId, todoId, data: todoData } });

    if (boardStateAfterUpdate) {
      try {
        await saveBoardToServer(boardStateAfterUpdate);
      } catch (error: unknown) {
        console.error("Edit todo failed", error instanceof Error ? error.message : error);
        alert('编辑待办事项失败，请刷新重试');
        dispatch({ type: 'UPDATE_TODO', payload: { columnId, todoId, data: originalTodo } });
      }
    }
  };

  const handleDeleteTodo = async (columnId: string, todoId: string) => {
    if (!todoBoard) return;
    
    const originalColumn = todoBoard.columns.find(col => col._id === columnId);
    const originalTodo = originalColumn?.todos.find(t => t._id === todoId);
    if (!originalTodo) return;
    
    dispatch({ type: 'DELETE_TODO', payload: { columnId, todoId } });
    
    const boardStateAfterDelete = boardReducer(todoBoard, { type: 'DELETE_TODO', payload: { columnId, todoId } });

    if (boardStateAfterDelete) {
      try {
        await saveBoardToServer(boardStateAfterDelete);
      } catch (error: unknown) {
        console.error("Delete todo failed", error instanceof Error ? error.message : error);
        alert('删除待办事项失败，请刷新重试');
        dispatch({ type: 'ADD_TODO', payload: { columnId, todo: originalTodo } });
      }
    }
  };

  const allTodos = useMemo(() => {
    if (!todoBoard) return [];
    const columns = Array.isArray(todoBoard.columns) ? todoBoard.columns : [];
    return columns.flatMap((column) => {
        const todos = Array.isArray(column.todos) ? column.todos : [];
        return todos.map((todo) => ({
            ...todo,
            columnTitle: column.title,
            columnId: column._id,
        }));
    }).sort((a, b) => {
      const statusOrder = { important: 0, normal: 1, inProgress: 2, completed: 3 };
      const statusA = a.status || 'normal';
      const statusB = b.status || 'normal';
      const orderA = statusA in statusOrder ? statusOrder[statusA as keyof typeof statusOrder] : 99;
      const orderB = statusB in statusOrder ? statusOrder[statusB as keyof typeof statusOrder] : 99;
      return orderA - orderB;
    });
  }, [todoBoard]);

  const handleAddColumn = async () => {
    if (!todoBoard) return;
    
    const tempId = `column-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newColumn: ITodoColumn = {
      _id: tempId,
      title: '新建列表',
      todos: [],
      order: todoBoard.columns.length > 0 ? Math.max(...todoBoard.columns.map(c => c.order ?? 0)) + 1 : 0,
    };
    
    dispatch({ type: 'ADD_COLUMN', payload: newColumn });
    setActiveTab(tempId);
    
    const boardStateAfterAdd = boardReducer(todoBoard, { type: 'ADD_COLUMN', payload: newColumn });

    if (boardStateAfterAdd) {
      try {
        await saveBoardToServer(boardStateAfterAdd);
      } catch (error: unknown) {
        console.error("Add column failed", error instanceof Error ? error.message : error);
        alert('添加列表失败，请刷新重试');
        dispatch({ type: 'DELETE_COLUMN', payload: tempId });
        if (activeTab === tempId) {
          setActiveTab(todoBoard.columns.length > 0 ? todoBoard.columns[0]._id ?? 'all' : 'all');
        }
      }
    }
  };

  const handleMoveColumn = async (columnId: string, direction: 'left' | 'right') => {
    if (!todoBoard || todoBoard.columns.length < 2) return;

    const columns = [...todoBoard.columns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const currentIndex = columns.findIndex(col => col._id === columnId);

    if (currentIndex === -1) return;

    let targetIndex = currentIndex + (direction === 'left' ? -1 : 1);

    if (targetIndex < 0 || targetIndex >= columns.length) return;

    const newOrderedColumns = Array.from(columns);
    const [movedColumn] = newOrderedColumns.splice(currentIndex, 1);
    newOrderedColumns.splice(targetIndex, 0, movedColumn);

    const finalColumns = newOrderedColumns.map((col, index) => ({ ...col, order: index }));

    dispatch({ type: 'REORDER_COLUMNS', payload: finalColumns });

    const newState = { ...todoBoard, columns: finalColumns };
    try {
      await saveBoardToServer(newState);
    } catch (error) {
      console.error('Failed to save column move:', error);
      dispatch({ type: 'REORDER_COLUMNS', payload: columns });
      alert('移动列表失败，请刷新重试');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 flex justify-between items-center">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 whitespace-nowrap truncate mr-2">
              牛马的自我修养
            </h1>
            <div className="flex items-center flex-shrink-0">
              <span className="hidden sm:inline mr-2 text-sm text-gray-600 truncate">
                {user?.email}
              </span>
              <span className="sm:hidden mr-2 text-xs text-gray-600 truncate">
                 {user?.email ? user.email.split('@')[0] : ''} 
              </span>
              <button
                onClick={logout}
                className="text-xs sm:text-sm text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-md flex-shrink-0"
              >
                登出
              </button>
            </div>
          </div>
        </header>

        <div className="md:hidden bg-white border-b">
          <div className="flex flex-wrap gap-2 px-4 py-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 text-sm font-medium rounded-md ${ 
                activeTab === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            {todoBoard?.columns.map((column) => (
              <button
                key={column._id}
                onClick={() => column._id && setActiveTab(column._id)}
                className={`px-3 py-1 text-sm font-medium rounded-md ${ 
                  activeTab === column._id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {column.title}
              </button>
            ))}
            <button
              onClick={handleAddColumn}
              className="px-3 py-1 text-sm font-medium rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center"
            >
              <FiPlus size={16} className="mr-1" /> 添加列表
            </button>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="hidden md:flex justify-between mb-4">
            <div className={`flex items-center text-sm text-gray-500`}>
              {pcViewMode === 'columns' && 
                <span className="text-gray-400 italic">提示：可以拖动列表调整顺序</span>
              }
            </div>

            <div className="flex">
              <button
                onClick={() => setPcViewMode('columns')}
                className={cn(
                  "flex items-center px-3 py-1 mr-2 text-sm font-medium rounded-md",
                  pcViewMode === 'columns'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                )}
              >
                <FiColumns size={16} className="mr-1" />
                列表视图
              </button>
              <button
                onClick={() => setPcViewMode('all')}
                className={cn(
                  "flex items-center px-3 py-1 text-sm font-medium rounded-md",
                  pcViewMode === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                )}
              >
                <FiList size={16} className="mr-1" />
                全部
              </button>
            </div>
          </div>

          <div className="hidden md:block">
            {pcViewMode === 'columns' ? (
              <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 pb-4">
                {todoBoard?.columns
                  .slice()
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  .map((column, index) => (
                    <div key={column._id} className="break-inside-avoid mb-4">
                      <TodoColumn
                        column={column}
                        onUpdateColumn={handleUpdateColumn}
                        onDeleteColumn={handleDeleteColumn}
                        onAddTodo={handleAddTodo}
                        onEditTodo={handleEditTodo}
                        onDeleteTodo={handleDeleteTodo}
                        onMoveColumn={handleMoveColumn}
                        isFirst={index === 0}
                        isLast={index === (todoBoard?.columns.length ?? 0) - 1}
                      />
                    </div>
                ))}
                <div className="break-inside-avoid mb-4">
                  <button
                    onClick={handleAddColumn}
                    className="flex flex-col items-center justify-center border border-dashed rounded-md bg-white w-40 h-24 text-gray-500 hover:text-blue-500 hover:border-blue-500 transition-colors duration-150 ease-in-out"
                  >
                    <FiPlus size={24} className="mb-1" />
                    <span className="text-sm">添加新列表</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-md border p-4 lg:p-6 space-y-3 max-w-3xl mx-auto">
                <h2 className="font-medium text-lg mb-4">全部待办事项</h2>
                {allTodos.map((todo) => (
                  <div
                    key={todo._id}
                    className={cn(
                        "border rounded-md p-3",
                        todo.status === 'important' ? 'bg-red-50 border-red-200'
                        : todo.status === 'inProgress' ? 'bg-blue-50 border-blue-200'
                        : todo.status === 'completed' ? 'bg-gray-100 border-gray-200 text-gray-500 line-through'
                        : 'bg-white border-gray-200'
                    )}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div 
                        className="flex-1 cursor-pointer hover:bg-gray-50 rounded p-1 -m-1"
                        onClick={() => {
                          if (todo.columnId) {
                            setActiveTab(todo.columnId);
                            setPcViewMode('columns');
                          }
                        }}
                      >
                        <div className="text-sm font-medium mb-1">{todo.content}</div>
                        {todo.comment && (
                          <div className="mt-1 p-2 text-xs bg-yellow-50 border border-yellow-100 rounded-md break-words">
                            {todo.comment}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right text-xs text-gray-500 space-y-1">
                        <div>{todo.createdAt ? new Date(todo.createdAt).toLocaleString() : 'N/A'}</div>
                        <div className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                          {todo.columnTitle}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {allTodos.length === 0 && (
                   <p className="text-center text-gray-500">没有待办事项。</p>
                )}
              </div>
            )}
          </div>

          <div className="md:hidden">
            {activeTab === 'all' ? (
              <div className="bg-white rounded-md border p-4 space-y-3">
                <h2 className="font-medium text-lg mb-4">全部待办事项</h2>
                {allTodos.map((todo) => (
                  <div
                    key={todo._id}
                    className={cn(
                        "border rounded-md p-3",
                        todo.status === 'important' ? 'bg-red-50 border-red-200'
                        : todo.status === 'inProgress' ? 'bg-blue-50 border-blue-200'
                        : todo.status === 'completed' ? 'bg-gray-100 border-gray-200 text-gray-500 line-through'
                        : 'bg-white border-gray-200'
                    )}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div 
                        className="flex-1 cursor-pointer hover:bg-gray-50 rounded p-1 -m-1"
                        onClick={() => todo.columnId && setActiveTab(todo.columnId)}
                      >
                        <div className={`text-sm font-medium mb-1 ${todo.status === 'completed' ? 'text-gray-500 line-through' : ''}`}>{todo.content}</div>
                        {todo.comment && (
                          <div className="mt-1 p-2 text-xs bg-yellow-50 border border-yellow-100 rounded-md break-words">
                            {todo.comment}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right space-y-1">
                         <div className="text-xs text-gray-500">{todo.createdAt ? new Date(todo.createdAt).toLocaleString() : 'N/A'}</div>
                         <div className="inline-block bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium mb-1">
                          {todo.columnTitle}
                         </div>
                      </div>
                    </div>
                  </div>
                ))}
                {allTodos.length === 0 && (
                   <p className="text-center text-gray-500 mt-4">没有待办事项。</p>
                )}
              </div>
            ) : (
              todoBoard?.columns
                .slice()
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((column, index, sortedColumns) =>
                  activeTab === column._id && (
                    <div key={column._id} className="space-y-4">
                      <TodoColumn
                        column={column}
                        onUpdateColumn={handleUpdateColumn}
                        onDeleteColumn={handleDeleteColumn}
                        onAddTodo={handleAddTodo}
                        onEditTodo={handleEditTodo}
                        onDeleteTodo={handleDeleteTodo}
                        onMoveColumn={handleMoveColumn}
                        isFirst={index === 0}
                        isLast={index === sortedColumns.length - 1}
                      />
                    </div>
                  )
              )
            )}
          </div>
        </main>
      </div>
    </AuthWrapper>
  );
} 