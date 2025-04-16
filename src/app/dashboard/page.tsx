'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiColumns, FiList, FiMove } from 'react-icons/fi';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import TodoColumn from '@/components/TodoColumn';
import { ITodoBoard, ITodoColumn, ITodo } from '@/models/TodoList';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [todoBoard, setTodoBoard] = useState<ITodoBoard | null>(null);
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
      setTodoBoard(data);
      
      // 如果有列，设置第一列为激活标签（移动端）
      if (data.columns && data.columns.length > 0 && data.columns[0]._id) {
        setActiveTab(data.columns[0]._id);
      }
    } catch (error) {
      console.error('获取待办事项失败:', error);
      // 这里不设置loading为false，因为在finally中设置
    } finally {
      setLoading(false);
    }
  };

  const updateTodoBoardState = async () => {
    if (!todoBoard) return;
    
    // 添加重试逻辑
    let retries = 3;
    let success = false;
    
    while (retries > 0 && !success) {
      try {
        const response = await fetch('/api/todos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            columns: todoBoard.columns,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('API错误:', errorData);
          throw new Error(errorData.error || '保存失败');
        }
        
        const data = await response.json();
        console.log('保存成功:', data);
        
        // 更新本地状态，使用从服务器返回的数据（包含有效的MongoDB ID）
        setTodoBoard(data);
        
        success = true;
        return data;
      } catch (error) {
        console.error(`保存失败 (尝试: ${4-retries}/3):`, error);
        retries--;
        
        if (retries === 0) {
          alert('保存失败，请刷新页面后重试');
        } else {
          // 等待一段时间后再重试
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  };

  const handleAddColumn = async () => {
    if (!todoBoard) return;
    
    try {
      // 创建临时ID，并确保使用唯一标识符
      const newColumnId = `column-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newColumn: ITodoColumn = {
        _id: newColumnId,
        title: '新建列表',
        todos: [],
        order: todoBoard.columns.length,
      };
      
      // 创建新的todoBoard对象，避免直接修改原对象
      const updatedBoard = {
        ...todoBoard,
        columns: [...todoBoard.columns, newColumn],
      };
      
      // 先更新本地状态
      setTodoBoard(updatedBoard);
      
      // 在移动端自动切换到新添加的列
      setActiveTab(newColumnId);
      
      // 使用新的updatedBoard对象发送请求
      try {
        const response = await fetch('/api/todos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            columns: updatedBoard.columns,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('API错误:', errorData);
          throw new Error(errorData.error || '保存失败');
        }
        
        const data = await response.json();
        console.log('保存成功:', data);
        
        // 更新本地状态
        setTodoBoard(data);
      } catch (error) {
        console.error('保存失败:', error);
        alert('添加列表失败，请刷新页面后重试');
      }
    } catch (error) {
      console.error('添加列表失败:', error);
      alert('添加列表失败，请稍后再试');
    }
  };

  const handleUpdateColumn = async (columnId: string, data: Partial<ITodoColumn>) => {
    if (!todoBoard) return;
    
    // 创建新的数据结构，避免直接修改原对象
    const updatedColumns = todoBoard.columns.map((column) => 
      column._id === columnId ? { ...column, ...data } : column
    );
    
    const updatedBoard = {
      ...todoBoard,
      columns: updatedColumns,
    };
    
    // 先更新本地状态
    setTodoBoard(updatedBoard);
    
    // 直接发送请求
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columns: updatedBoard.columns,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API错误:', errorData);
        throw new Error(errorData.error || '保存失败');
      }
      
      const data = await response.json();
      console.log('保存成功:', data);
      
      // 更新本地状态为服务器返回的数据
      setTodoBoard(data);
    } catch (error) {
      console.error('更新列表失败:', error);
      alert('更新列表失败，请刷新页面后重试');
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!todoBoard) return;
    
    // 创建新的数据结构，避免直接修改原对象
    const updatedColumns = todoBoard.columns.filter((column) => column._id !== columnId);
    
    const updatedBoard = {
      ...todoBoard,
      columns: updatedColumns,
    };
    
    // 先更新本地状态
    setTodoBoard(updatedBoard);
    
    // 如果删除的是当前激活的标签，则切换到第一个标签（如果有）
    if (activeTab === columnId) {
      if (updatedColumns.length > 0 && updatedColumns[0]?._id) {
        setActiveTab(updatedColumns[0]._id);
      } else {
        setActiveTab('all');
      }
    }
    
    // 直接发送请求
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columns: updatedBoard.columns,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API错误:', errorData);
        throw new Error(errorData.error || '保存失败');
      }
      
      const data = await response.json();
      console.log('保存成功:', data);
      
      // 更新本地状态为服务器返回的数据
      setTodoBoard(data);
    } catch (error) {
      console.error('删除列表失败:', error);
      alert('删除列表失败，请刷新页面后重试');
    }
  };

  const handleAddTodo = async (columnId: string, todo: Omit<ITodo, '_id'>) => {
    if (!todoBoard) return;
    
    // 创建临时ID，确保唯一性
    const newTodoId = `todo-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newTodo: ITodo = {
      _id: newTodoId,
      ...todo,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 创建新的数据结构，避免直接修改原对象
    const updatedColumns = todoBoard.columns.map((column) => {
      if (column._id === columnId) {
        const existingTodos = Array.isArray(column.todos) ? column.todos : [];
        return {
          ...column,
          todos: [...existingTodos, newTodo],
        };
      }
      return column;
    });
    
    const updatedBoard = {
      ...todoBoard,
      columns: updatedColumns,
    };
    
    // 先更新本地状态
    setTodoBoard(updatedBoard);
    
    // 直接发送请求，不使用updateTodoBoardState
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columns: updatedBoard.columns,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API错误:', errorData);
        throw new Error(errorData.error || '保存失败');
      }
      
      const data = await response.json();
      console.log('保存成功:', data);
      
      // 更新本地状态为服务器返回的数据
      setTodoBoard(data);
    } catch (error) {
      console.error('保存待办事项失败:', error);
      alert('保存待办事项失败，请刷新页面后重试');
    }
  };

  const handleEditTodo = async (columnId: string, todoId: string, todoData: Partial<ITodo>) => {
    if (!todoBoard) return;
    
    // 创建新的数据结构，避免直接修改原对象
    const updatedColumns = todoBoard.columns.map((column) => {
      if (column._id === columnId) {
        const updatedTodos = (Array.isArray(column.todos) ? column.todos : []).map((todo) => 
          todo._id === todoId ? { ...todo, ...todoData, updatedAt: new Date() } : todo
        );
        return {
          ...column,
          todos: updatedTodos,
        };
      }
      return column;
    });
    
    const updatedBoard = {
      ...todoBoard,
      columns: updatedColumns,
    };
    
    // 先更新本地状态
    setTodoBoard(updatedBoard);
    
    // 直接发送请求
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columns: updatedBoard.columns,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API错误:', errorData);
        throw new Error(errorData.error || '保存失败');
      }
      
      const data = await response.json();
      console.log('保存成功:', data);
      
      // 更新本地状态为服务器返回的数据
      setTodoBoard(data);
    } catch (error) {
      console.error('编辑待办事项失败:', error);
      alert('编辑待办事项失败，请刷新页面后重试');
    }
  };

  const handleDeleteTodo = async (columnId: string, todoId: string) => {
    if (!todoBoard) return;
    
    // 创建新的数据结构，避免直接修改原对象
    const updatedColumns = todoBoard.columns.map((column) => {
      if (column._id === columnId) {
        const updatedTodos = (Array.isArray(column.todos) ? column.todos : []).filter((todo) => todo._id !== todoId);
        return {
          ...column,
          todos: updatedTodos,
        };
      }
      return column;
    });
    
    const updatedBoard = {
      ...todoBoard,
      columns: updatedColumns,
    };
    
    // 先更新本地状态
    setTodoBoard(updatedBoard);
    
    // 直接发送请求
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columns: updatedBoard.columns,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API错误:', errorData);
        throw new Error(errorData.error || '保存失败');
      }
      
      const data = await response.json();
      console.log('保存成功:', data);
      
      // 更新本地状态为服务器返回的数据
      setTodoBoard(data);
    } catch (error) {
      console.error('删除待办事项失败:', error);
      alert('删除待办事项失败，请刷新页面后重试');
    }
  };

  // 获取所有待办事项，用于"全部"标签页
  const getAllTodos = () => {
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
      const statusOrder = {
        important: 0,
        normal: 1,
        inProgress: 2,
        completed: 3,
      };
      const statusA = a.status || 'normal';
      const statusB = b.status || 'normal';
      return statusOrder[statusA] - statusOrder[statusB];
    });
  };

  // Handle drag end
  const handleDragEnd = async (result: DropResult) => {
    console.log('进入 handleDragEnd 函数');
    setIsDragging(false);
    
    // If dropped outside a droppable area or didn't move
    if (!result.destination || result.destination.index === result.source.index) {
      return;
    }

    // Make sure we have a todoBoard
    if (!todoBoard) return;

    // Clone the columns array to avoid mutating state directly
    const newColumns = Array.from(todoBoard.columns);
    
    // Remove the dragged item from its original position
    const [movedColumn] = newColumns.splice(result.source.index, 1);
    
    // Insert the dragged item at its new position
    newColumns.splice(result.destination.index, 0, movedColumn);
    
    // Update the order property for each column based on new positions
    const updatedColumns = newColumns.map((column, index) => ({
      ...column,
      order: index
    }));
    
    // Create updated todoBoard
    const updatedBoard = {
      ...todoBoard,
      columns: updatedColumns,
    };
    
    // Update local state
    setTodoBoard(updatedBoard);
    
    // Send updated data to the server
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columns: updatedColumns }),
      });
      
      if (!response.ok) {
        throw new Error('保存列表顺序失败');
      }
      
      const data = await response.json();
      console.log('列表顺序已更新');
      
      // Update with server data in case there were any changes
      setTodoBoard(data);
    } catch (error) {
      console.error('保存列表顺序失败:', error);
      alert('更新列表顺序失败，请重试');
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

      {/* 移动端标签切换 - Changed to flex-wrap and gap */}
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
        {/* PC View Toggle Buttons with Drag Instruction */}
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
                      .slice() // 创建副本以避免直接修改状态
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                      .map((column, index) => (
                      <Draggable 
                        key={column._id || `column-${index}`} 
                        draggableId={column._id?.toString() || `column-${index}`} 
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`${snapshot.isDragging ? 'opacity-70' : ''}`}
                          >
                            <div className="relative">
                              <div
                                {...provided.dragHandleProps}
                                className="absolute top-0 left-0 right-0 h-10 bg-transparent cursor-move rounded-t-md hover:bg-gray-100/50 z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
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
              {getAllTodos().map((todo) => (
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
              {getAllTodos().length === 0 && (
                 <p className="text-center text-gray-500">没有待办事项。</p>
              )}
            </div>
          )}
        </div>

        {/* Mobile View */}
        <div className="md:hidden">
          {activeTab === 'all' ? (
            <div className="bg-white rounded-md border p-4 space-y-3">
              <h2 className="font-medium text-lg mb-4">全部待办事项</h2>
              {getAllTodos().map((todo) => (
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
              {getAllTodos().length === 0 && (
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