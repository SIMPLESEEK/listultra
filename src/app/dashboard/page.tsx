'use client';

import { useEffect, useState, useReducer, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiColumns, FiList, FiMove } from 'react-icons/fi';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import TodoColumn from '@/components/TodoColumn';
import { ITodoBoard, ITodoColumn, ITodo } from '@/models/TodoList';
import { cn } from '@/lib/utils';

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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [state, dispatch] = useReducer(boardReducer, initialBoardState);
  const todoBoard = state;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [pcViewMode, setPcViewMode] = useState<'columns' | 'all'>('columns');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchTodos();
    }
  }, [status, router]);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/todos');
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API错误:', errorData);
        throw new Error(errorData.error || '加载失败');
      }
      const data = await response.json();
      console.log('获取到的数据:', data);
      dispatch({ type: 'SET_BOARD', payload: data });

      // Set active tab based on fetched data
      // Use a separate effect or ensure state update cycle completes
      // For now, let's assume the dispatch updates state and triggers re-render
      // which should then correctly use the activeTab state set below.
      if (data.columns && data.columns.length > 0 && data.columns[0]?._id) {
        setActiveTab(data.columns[0]._id);
      } else {
        setActiveTab('all'); // Default if no columns
      }
    } catch (error) {
      console.error('获取待办事项失败:', error);
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

      const savedData = await response.json();
      console.log('保存成功:', savedData);
      dispatch({ type: 'SET_BOARD', payload: savedData });
      return savedData;
    } catch (error) {
      console.error('保存失败:', error);
      alert('操作失败，请刷新页面后重试');
      throw error;
    }
  };

  const handleAddColumn = async () => {
    if (!todoBoard) return;
    
    const tempId = `column-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newColumn: ITodoColumn = {
      _id: tempId,
      title: '新建列表',
      todos: [],
      order: todoBoard.columns.length,
    };
    
    dispatch({ type: 'ADD_COLUMN', payload: newColumn });
    setActiveTab(tempId);
    
    const boardStateAfterAdd = boardReducer(todoBoard, { type: 'ADD_COLUMN', payload: newColumn });

    if (boardStateAfterAdd) {
      try {
        await saveBoardToServer(boardStateAfterAdd);
      } catch (error) {
        console.error("Add column failed, potential state mismatch");
        alert('添加列表失败，请刷新重试');
        dispatch({ type: 'DELETE_COLUMN', payload: tempId });
        if (activeTab === tempId) {
          setActiveTab(todoBoard.columns.length > 0 ? todoBoard.columns[0]._id ?? 'all' : 'all');
        }
      }
    }
  };

  const handleUpdateColumn = async (columnId: string, data: Partial<ITodoColumn>) => {
    console.log('handleUpdateColumn called with:', columnId, data);
    if (!todoBoard) return;
    
    const originalColumn = todoBoard.columns.find(col => col._id === columnId);
    if (!originalColumn) return;
    
    dispatch({ type: 'UPDATE_COLUMN', payload: { columnId, data } });
    
    const boardStateAfterUpdate = boardReducer(todoBoard, { type: 'UPDATE_COLUMN', payload: { columnId, data } });

    if (boardStateAfterUpdate) {
      try {
        await saveBoardToServer(boardStateAfterUpdate);
      } catch (error) {
        console.error("Update column failed");
        alert('更新列表失败，请刷新重试');
        dispatch({ type: 'UPDATE_COLUMN', payload: { columnId, data: originalColumn } });
      }
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    console.log('handleDeleteColumn called with:', columnId);
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
      } catch (error) {
        console.error('删除列表失败:', error);
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
      console.log("Board might be empty after delete, ensure API/reducer handles this.");
      try {
        const emptyBoardState = { ...todoBoard, columns: [] };
        await saveBoardToServer(emptyBoardState);
      } catch (error) {
        console.error('删除最后一个列表时保存失败:', error);
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
      } catch (error) {
        console.error("Add todo failed");
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
      } catch (error) {
        console.error("Edit todo failed");
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
      } catch (error) {
        console.error("Delete todo failed");
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

  const handleDragEnd = async (result: DropResult) => {
    console.log('进入 handleDragEnd 函数 (Reducer)');
    setIsDragging(false);

    if (!result.destination || !todoBoard) {
      return;
    }

    if (result.destination.index === result.source.index) {
      return;
    }

    const currentColumns = todoBoard.columns;
    const newColumns = Array.from(currentColumns);
    const [movedColumn] = newColumns.splice(result.source.index, 1);
    newColumns.splice(result.destination.index, 0, movedColumn);

    const updatedColumnsWithOrder = newColumns.map((column, index) => ({
      ...column,
      order: index,
    }));

    const originalColumns = [...todoBoard.columns];

    dispatch({ type: 'REORDER_COLUMNS', payload: updatedColumnsWithOrder });

    const boardStateAfterReorder = { ...todoBoard, columns: updatedColumnsWithOrder };

    try {
      await saveBoardToServer(boardStateAfterReorder);
      console.log('列表顺序已更新 (Reducer)');
    } catch (error) {
      console.error('保存列表顺序失败 (Reducer):', error);
      alert('更新列表顺序失败，请重试');
      dispatch({ type: 'REORDER_COLUMNS', payload: originalColumns });
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 flex justify-between items-center">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 whitespace-nowrap truncate mr-2">
            牛马的自我修养
          </h1>
          <div className="flex items-center flex-shrink-0">
            <span className="hidden sm:inline mr-2 text-sm text-gray-600 truncate">
              {session?.user?.email}
            </span>
            <span className="sm:hidden mr-2 text-xs text-gray-600 truncate">
               {session?.user?.email ? session.user.email.split('@')[0] : ''} 
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
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
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="hidden md:flex justify-between mb-4">
          <div className={`flex items-center text-sm text-gray-500 ${isDragging ? 'text-blue-500 font-medium' : ''}`}>
            {isDragging ? (
              <>
                <FiMove className="mr-1" />
                拖动列表以调整顺序
              </>
            ) : (
              pcViewMode === 'columns' && 
              <span className="text-gray-400 italic">提示：可以拖动列表调整顺序</span>
            )}
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
            <DragDropContext 
              onDragStart={() => {
                console.log('拖拽开始！');
                setIsDragging(true);
              }}
              onDragEnd={(result) => {
                console.log('拖拽结束！Result:', result);
                handleDragEnd(result);
              }}
            >
              <Droppable 
                droppableId="columns" 
                direction="horizontal" 
                type="column" 
                isDropDisabled={false}
                isCombineEnabled={false}
                ignoreContainerClipping={true}
              >
                {(provided) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex flex-wrap gap-6 pb-4"
                  >
                    {todoBoard?.columns
                      .slice()
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                      .map((column, index) => (
                      <Draggable 
                        key={column._id || `column-${index}`} 
                        draggableId={column._id?.toString() || `column-${index}`} 
                        index={index}
                      >
                        {(providedDraggable, snapshot) => (
                          <div
                            ref={providedDraggable.innerRef}
                            {...providedDraggable.draggableProps}
                            className={`${snapshot.isDragging ? 'opacity-70' : ''}`}
                          >
                            <div className="relative">
                              <div
                                {...providedDraggable.dragHandleProps}
                                className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-10 bg-transparent cursor-move rounded-t-md hover:bg-gray-100/50 z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                              >
                                <FiMove className="text-gray-400" />
                              </div>
                              <TodoColumn
                                column={column}
                                onUpdateColumn={handleUpdateColumn}
                                onDeleteColumn={handleDeleteColumn}
                                onAddTodo={handleAddTodo}
                                onEditTodo={handleEditTodo}
                                onDeleteTodo={handleDeleteTodo}
                              />
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    
                    <div className="flex-shrink-0">
                      <button
                        onClick={handleAddColumn}
                        className="flex flex-col items-center justify-center border border-dashed rounded-md bg-white w-64 min-h-96 text-gray-500 hover:text-blue-500 hover:border-blue-500 flex-shrink-0"
                      >
                        <FiPlus size={24} className="mb-2" />
                        <span>添加新列表</span>
                      </button>
                    </div>
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <div className="bg-white rounded-md border p-4 lg:p-6 space-y-3 max-w-3xl mx-auto">
              <h2 className="font-medium text-lg mb-4">全部待办事项</h2>
              {allTodos.map((todo) => (
                <div
                  key={todo._id}
                  className={cn(
                      "border rounded-md p-3 flex justify-between items-start gap-4",
                      todo.status === 'important' ? 'bg-red-50 border-red-200'
                      : todo.status === 'inProgress' ? 'bg-blue-50 border-blue-200'
                      : todo.status === 'completed' ? 'bg-gray-100 border-gray-200 text-gray-500 line-through'
                      : 'bg-white border-gray-200'
                  )}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1">{todo.content}</div>
                    <span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium mb-1 mr-2">
                      {todo.columnTitle}
                    </span>
                    {todo.comment && (
                      <div className="mb-1 p-2 text-xs bg-yellow-50 border border-yellow-100 rounded-md break-words">
                        {todo.comment}
                      </div>
                    )}
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
                    <div className="flex-1">
                      <div className={`text-sm font-medium mb-1 ${todo.status === 'completed' ? 'text-gray-500 line-through' : ''}`}>{todo.content}</div>
                      <span className="inline-block bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {todo.columnTitle}
                      </span>
                    </div>
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => todo.columnId && setActiveTab(todo.columnId)}
                        className="text-xs px-2 py-1 bg-gray-100 rounded-md text-gray-600 hover:bg-gray-200"
                      >
                        编辑
                      </button>
                    </div>
                  </div>
                  {todo.comment && (
                    <div className="mt-2 p-2 text-xs bg-yellow-50 border border-yellow-100 rounded-md break-words">
                      {todo.comment}
                    </div>
                  )}
                </div>
              ))}
              {allTodos.length === 0 && (
                 <p className="text-center text-gray-500 mt-4">没有待办事项。</p>
              )}
            </div>
          ) : (
            todoBoard?.columns.map(
              (column) =>
                activeTab === column._id && (
                  <div key={column._id} className="space-y-4">
                    <TodoColumn
                      column={column}
                      onUpdateColumn={handleUpdateColumn}
                      onDeleteColumn={handleDeleteColumn}
                      onAddTodo={handleAddTodo}
                      onEditTodo={handleEditTodo}
                      onDeleteTodo={handleDeleteTodo}
                    />
                  </div>
                )
            )
          )}
        </div>
      </main>
    </div>
  );
} 