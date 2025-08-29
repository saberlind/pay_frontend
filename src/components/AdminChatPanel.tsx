'use client';

import React, { useState, useEffect, useRef } from 'react';
import { chatApi, ChatMessage } from '@/lib/api';

interface ChatSession {
  id: number;
  apiKey: string;
  userPhone: string;
  status: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminChatPanelProps {
  token: string;
}

export default function AdminChatPanel({ token }: AdminChatPanelProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<{[key: string]: number}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 加载会话列表
  const loadSessions = async () => {
    try {
      // 这里需要添加获取会话列表的API
      console.log('加载会话列表...');
      // 暂时使用空数组，实际应该调用API
    } catch (error) {
      console.error('加载会话列表失败:', error);
    }
  };

  // 加载聊天记录
  const loadChatHistory = async (apiKey: string) => {
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
    if (!newMessage.trim() || !selectedSession) return;

    try {
      setIsLoading(true);
      const response = await chatApi.sendMessage({
        apiKey: selectedSession.apiKey,
        receiver: selectedSession.userPhone,
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

  // 选择会话
  const selectSession = (session: ChatSession) => {
    setSelectedSession(session);
    loadChatHistory(session.apiKey);
    
    // 标记消息为已读
    chatApi.markMessagesAsRead(session.apiKey, token).catch(console.error);
    
    // 清除未读计数
    setUnreadCounts(prev => ({
      ...prev,
      [session.apiKey]: 0
    }));
  };

  // 处理SSE聊天消息
  const handleChatMessage = (data: any) => {
    console.log('管理员收到聊天消息:', data);
    
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

        // 如果是接收到的消息（用户发给管理员的）
        if (messageData.receiver === 'admin') {
          // 更新未读计数
          if (!selectedSession || selectedSession.apiKey !== messageData.apiKey) {
            setUnreadCounts(prev => ({
              ...prev,
              [messageData.apiKey]: (prev[messageData.apiKey] || 0) + 1
            }));
          }
        }

        // 滚动到底部
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('处理聊天消息失败:', error);
    }
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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

  // 初始化
  useEffect(() => {
    loadSessions();
  }, []);

  // 监听SSE消息
  useEffect(() => {
    const handleSSEMessage = (event: CustomEvent) => {
      console.log('AdminChatPanel收到SSE聊天消息:', event.detail);
      handleChatMessage(event.detail);
    };

    // 添加事件监听器
    window.addEventListener('sse-chat-message', handleSSEMessage as EventListener);

    return () => {
      window.removeEventListener('sse-chat-message', handleSSEMessage as EventListener);
    };
  }, [selectedSession]);

  return (
    <div className="bg-white rounded-lg shadow-lg border h-96 flex">
      {/* 会话列表 */}
      <div className="w-1/3 border-r flex flex-col">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-medium text-gray-900">客服会话</h3>
          <p className="text-sm text-gray-500">管理用户咨询</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h8z" />
              </svg>
              <p>暂无会话</p>
              <p className="text-xs mt-1">等待用户发起咨询</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => selectSession(session)}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                  selectedSession?.id === session.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{session.userPhone}</span>
                      {unreadCounts[session.apiKey] > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                          {unreadCounts[session.apiKey]}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatTime(session.lastMessageAt)}
                    </p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    session.status === 'active' ? 'bg-green-400' : 'bg-gray-300'
                  }`}></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 聊天区域 */}
      <div className="flex-1 flex flex-col">
        {selectedSession ? (
          <>
            {/* 聊天头部 */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {selectedSession.userPhone.slice(-2)}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{selectedSession.userPhone}</h4>
                  <p className="text-sm text-gray-500">会话ID: {selectedSession.apiKey.slice(-8)}</p>
                </div>
              </div>
            </div>

            {/* 消息区域 */}
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
                  <p className="text-sm mt-1">开始与用户对话</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        message.sender === 'admin'
                          ? 'bg-blue-500 text-white rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-bl-sm border'
                      }`}
                    >
                      <div className="text-sm">{message.content}</div>
                      <div 
                        className={`text-xs mt-1 ${
                          message.sender === 'admin' ? 'text-blue-100' : 'text-gray-500'
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
            <div className="p-4 border-t bg-white">
              <div className="flex space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入回复消息..."
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-lg font-medium">选择一个会话</p>
              <p className="text-sm mt-1">从左侧选择用户开始聊天</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
