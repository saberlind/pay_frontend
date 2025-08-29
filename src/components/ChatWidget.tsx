'use client';

import React, { useState, useEffect, useRef } from 'react';
import { chatApi } from '@/lib/api';

interface ChatMessage {
  id: number;
  apiKey: string;
  sender: string;
  receiver: string;
  content: string;
  messageType: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ChatWidgetProps {
  userPhone: string;
  token: string;
  apiKey: string;
}

export default function ChatWidget({ userPhone, token, apiKey }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 加载聊天记录
  const loadChatHistory = async () => {
    try {
      setIsLoading(true);
      const response = await chatApi.getChatHistory(apiKey, token);
      if (response.success) {
        setMessages(response.data || []);
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('加载聊天记录失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 发送消息
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setIsLoading(true);
      const response = await chatApi.sendMessage({
        apiKey,
        receiver: 'admin',
        content: newMessage.trim()
      }, token);

      if (response.success) {
        setNewMessage('');
        // 消息会通过SSE推送，这里不需要手动添加
      } else {
        alert('发送消息失败: ' + response.message);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      alert('发送消息失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 标记消息为已读
  const markAsRead = async () => {
    try {
      await chatApi.markMessagesAsRead(apiKey, token);
      setUnreadCount(0);
    } catch (error) {
      console.error('标记消息为已读失败:', error);
    }
  };

  // 获取未读消息数量
  const getUnreadCount = async () => {
    try {
      const response = await chatApi.getUnreadMessageCount(apiKey, token);
      if (response.success) {
        setUnreadCount(response.data || 0);
      }
    } catch (error) {
      console.error('获取未读消息数量失败:', error);
    }
  };

  // 处理SSE聊天消息
  const handleChatMessage = (data: any) => {
    console.log('收到聊天消息:', data);
    
    try {
      const messageData = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (messageData.type === 'new_message') {
        // 添加新消息到列表
        setMessages(prev => {
          // 避免重复添加
          const exists = prev.some(msg => msg.id === messageData.id);
          if (exists) return prev;
          
          return [...prev, {
            id: messageData.id,
            apiKey: messageData.apiKey,
            sender: messageData.sender,
            receiver: messageData.receiver,
            content: messageData.content,
            messageType: 'text',
            isRead: false,
            createdAt: messageData.createdAt,
            updatedAt: messageData.createdAt
          }];
        });

        // 如果是接收到的消息（不是自己发送的）
        if (messageData.receiver === userPhone) {
          setUnreadCount(prev => prev + 1);
          
          // 如果聊天窗口是打开的，自动标记为已读
          if (isOpen) {
            setTimeout(markAsRead, 500);
          }
        }

        // 滚动到底部
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('处理聊天消息失败:', error);
    }
  };

  // 打开聊天窗口
  const openChat = () => {
    setIsOpen(true);
    if (unreadCount > 0) {
      markAsRead();
    }
    setTimeout(() => {
      inputRef.current?.focus();
      scrollToBottom();
    }, 100);
  };

  // 关闭聊天窗口
  const closeChat = () => {
    setIsOpen(false);
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 初始化
  useEffect(() => {
    if (apiKey && token) {
      loadChatHistory();
      getUnreadCount();
      
      // 创建会话
      chatApi.createOrGetSession(apiKey, token).catch(console.error);
    }
  }, [apiKey, token]);

  // 监听SSE消息
  useEffect(() => {
    const handleSSEMessage = (event: CustomEvent) => {
      console.log('ChatWidget收到SSE聊天消息:', event.detail);
      handleChatMessage(event.detail);
    };

    // 添加事件监听器（监听父组件转发的SSE聊天消息）
    window.addEventListener('sse-chat-message', handleSSEMessage as EventListener);

    return () => {
      window.removeEventListener('sse-chat-message', handleSSEMessage as EventListener);
    };
  }, [userPhone, isOpen]);

  // 格式化时间
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('zh-CN', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  return (
    <>
      {/* 聊天悬浮按钮 */}
      <div 
        className="fixed bottom-6 right-6 z-50"
        style={{ zIndex: 9999 }}
      >
        <button
          onClick={openChat}
          className="relative bg-blue-500 hover:bg-blue-600 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
          title="联系客服"
        >
          {/* 客服图标 */}
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
            />
          </svg>
          
          {/* 未读消息提示 */}
          {unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </button>
      </div>

      {/* 聊天窗口 */}
      {isOpen && (
        <div 
          className="fixed bottom-24 right-6 w-80 h-96 bg-white rounded-lg shadow-2xl border z-50 flex flex-col"
          style={{ zIndex: 9999 }}
        >
          {/* 聊天窗口头部 */}
          <div className="bg-blue-500 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="font-medium">在线客服</span>
            </div>
            <button
              onClick={closeChat}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 聊天消息区域 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {isLoading && messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                加载聊天记录...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>暂无聊天记录</p>
                <p className="text-sm mt-1">发送消息开始对话</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === userPhone ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
                      message.sender === userPhone
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-white text-gray-800 rounded-bl-sm border'
                    }`}
                  >
                    <div className="text-sm">{message.content}</div>
                    <div 
                      className={`text-xs mt-1 ${
                        message.sender === userPhone ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {formatTime(message.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 消息输入区域 */}
          <div className="p-4 border-t bg-white rounded-b-lg">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入消息..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !newMessage.trim()}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
