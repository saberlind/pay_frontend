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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 加载会话列表
  const loadSessions = async () => {
    try {
      console.log('加载会话列表...');
      const response = await chatApi.getAllSessions(token);
      if (response.success && response.data) {
        // 转换后端数据格式为前端需要的格式
        const formattedSessions: ChatSession[] = response.data.map((session: any) => ({
          id: session.id,
          apiKey: session.apiKey,
          userPhone: session.userPhone,
          status: session.status,
          lastMessageAt: session.lastMessageAt || session.createdAt,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        }));
        setSessions(formattedSessions);
        console.log('会话列表加载成功:', formattedSessions.length, '个会话');
      } else {
        console.error('获取会话列表失败:', response.message);
        setSessions([]);
      }
    } catch (error) {
      console.error('加载会话列表失败:', error);
      setSessions([]);
    }
  };

  // 加载聊天记录
  const loadChatHistory = async (apiKey: string) => {
    try {
      setIsLoading(true);
      console.log('AdminChatPanel加载聊天记录, apiKey:', apiKey, 'token:', token ? token.substring(0, 20) + "..." : "无token");
      const response = await chatApi.getChatHistory(apiKey, token);
      if (response.success) {
        setMessages(response.data || []);
        setTimeout(scrollToBottom, 100);
      } else {
        console.error('获取聊天记录失败:', response.message);
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
        // 立即添加消息到本地状态，提供即时反馈（和用户界面一致）
        const newMsg = {
          id: response.data?.id || Date.now(),
          apiKey: selectedSession.apiKey,
          sender: 'admin',
          receiver: selectedSession.userPhone,
          content: newMessage.trim(),
          messageType: 'text',
          isRead: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setMessages(prev => {
          // 避免重复添加（如果SSE也推送了相同消息）
          const exists = prev.some(msg => msg.id === newMsg.id);
          if (!exists) {
            const updated = [...prev, newMsg];
            // 自动滚动到底部
            setTimeout(() => scrollToBottom(), 100);
            return updated;
          }
          return prev;
        });
        
        setNewMessage('');
        console.log("✅ 管理员消息已立即显示:", newMsg);
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
    console.log('AdminChatPanel标记消息已读, apiKey:', session.apiKey, 'token:', token ? token.substring(0, 20) + "..." : "无token");
    chatApi.markMessagesAsRead(session.apiKey, token).catch((error) => {
      console.error('标记消息已读失败:', error);
    });
    
    // 清除未读计数
    setUnreadCounts(prev => ({
      ...prev,
      [session.apiKey]: 0
    }));
  };

  // 处理SSE聊天消息
  const handleChatMessage = (data: any) => {
    console.log('AdminChatPanel收到聊天消息:', data);
    console.log('AdminChatPanel消息数据类型:', typeof data);
    
    try {
      // 数据应该已经在管理员页面被解析过，这里直接使用
      const messageData = data;
      console.log('AdminChatPanel处理消息数据:', messageData);
      console.log('消息类型:', messageData.type);
      console.log('消息发送者:', messageData.sender);
      console.log('消息接收者:', messageData.receiver);
      console.log('当前选中会话:', selectedSession?.apiKey);
      
      if (messageData.type === 'new_message') {
        console.log('✅ 管理员确认收到新消息，准备添加到列表');
        
        // 添加新消息到列表
        setMessages(prev => {
          // 避免重复添加
          console.log('🔍 AdminPanel检查消息重复 - 当前消息列表长度:', prev.length);
          console.log('🔍 AdminPanel当前消息列表的最后3条消息ID:', prev.slice(-3).map(m => m.id));
          console.log('🔍 AdminPanel准备添加的消息ID:', messageData.id);
          console.log('🔍 AdminPanel当前选中会话:', selectedSession?.apiKey);
          console.log('🔍 AdminPanel消息所属会话:', messageData.apiKey);
          
          const exists = prev.some(msg => msg.id === messageData.id);
          console.log('🔍 AdminPanel检查消息是否已存在:', exists, '消息ID:', messageData.id);
          
          if (exists) {
            console.log('⚠️ AdminPanel消息已存在，跳过添加 - 消息内容:', messageData.content.substring(0, 20));
            return prev;
          }
          
          // 检查消息是否属于当前选中的会话
          if (selectedSession && messageData.apiKey !== selectedSession.apiKey) {
            console.log('⚠️ AdminPanel消息不属于当前会话，跳过添加 - 当前会话:', selectedSession.apiKey, '消息会话:', messageData.apiKey);
            return prev;
          }
          
          const newMessage = {
            id: messageData.id,
            apiKey: messageData.apiKey,
            sender: messageData.sender,
            receiver: messageData.receiver,
            content: messageData.content,
            messageType: 'text',
            isRead: false,
            createdAt: messageData.createdAt,
            updatedAt: messageData.createdAt
          };
          
          console.log('✅ AdminPanel成功添加新消息到列表:', newMessage);
          console.log('✅ AdminPanel更新后消息列表长度将变为:', prev.length + 1);
          
          const updatedMessages = [...prev, newMessage];
          
          // 自动滚动到底部
          setTimeout(() => {
            scrollToBottom();
            console.log('🎯 AdminPanel消息列表已更新，当前长度:', updatedMessages.length);
          }, 100);
          
          return updatedMessages;
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
    <div 
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        height: '600px',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {/* 会话列表 */}
      <div 
        style={{
          width: '320px',
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          background: '#fafbfc',
        }}
      >
        {/* 会话列表头部 */}
        <div 
          style={{
            padding: '24px',
            borderBottom: '1px solid #e5e7eb',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div 
              style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M17 8h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2v4l-4-4H9a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h8z"/>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                客服会话
              </h3>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                管理用户咨询
              </p>
            </div>
          </div>
        </div>
        
        {/* 会话列表内容 */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sessions.length === 0 ? (
            <div 
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                color: '#6b7280',
              }}
            >
              <div 
                style={{
                  width: '64px',
                  height: '64px',
                  background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth="2">
                  <path d="M17 8h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2v4l-4-4H9a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h8z"/>
                </svg>
              </div>
              <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>暂无会话</p>
              <p style={{ fontSize: '14px', opacity: 0.7 }}>等待用户发起咨询</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => selectSession(session)}
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  background: selectedSession?.id === session.id ? '#f0f4ff' : 'transparent',
                  transition: 'all 0.2s',
                  borderLeft: selectedSession?.id === session.id ? '3px solid #667eea' : '3px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (selectedSession?.id !== session.id) {
                    e.currentTarget.style.background = '#f9fafb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedSession?.id !== session.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <div 
                        style={{
                          width: '32px',
                          height: '32px',
                          background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        {session.userPhone.slice(-2)}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                          {session.userPhone}
                        </div>
                        {unreadCounts[session.apiKey] > 0 && (
                          <div 
                            style={{
                              background: '#ff4757',
                              color: 'white',
                              fontSize: '11px',
                              fontWeight: '600',
                              borderRadius: '10px',
                              padding: '2px 6px',
                              display: 'inline-block',
                              marginTop: '2px',
                            }}
                          >
                            {unreadCounts[session.apiKey]} 条新消息
                          </div>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                      {formatTime(session.lastMessageAt)}
                    </p>
                  </div>
                  <div 
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: session.status === 'active' ? '#4ade80' : '#e5e7eb',
                      marginTop: '12px',
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 聊天区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedSession ? (
          <>
            {/* 聊天头部 */}
            <div 
              style={{
                padding: '24px',
                borderBottom: '1px solid #e5e7eb',
                background: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div 
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  {selectedSession.userPhone.slice(-2)}
                </div>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                    {selectedSession.userPhone}
                  </h4>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                    会话ID: {selectedSession.apiKey.slice(-8)}
                  </p>
                </div>
              </div>
            </div>

            {/* 消息区域 */}
            <div 
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                background: '#fafbfc',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {isLoading && messages.length === 0 ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '200px',
                  color: '#6b7280',
                }}>
                  <div 
                    style={{
                      width: '32px',
                      height: '32px',
                      border: '3px solid #e5e7eb',
                      borderTop: '3px solid #667eea',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '12px',
                    }}
                  />
                  <div style={{ fontSize: '14px' }}>加载聊天记录...</div>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '200px',
                  color: '#6b7280',
                  textAlign: 'center',
                }}>
                  <div 
                    style={{
                      width: '48px',
                      height: '48px',
                      background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
                    暂无聊天记录
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.7 }}>
                    开始与用户对话
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      display: 'flex',
                      flexDirection: message.sender === 'admin' ? 'row-reverse' : 'row',
                      alignItems: 'flex-end',
                      gap: '8px',
                    }}
                  >
                    {/* 头像 */}
                    <div 
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: message.sender === 'admin' 
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: '600',
                        flexShrink: 0,
                      }}
                    >
                      {message.sender === 'admin' ? '客服' : '用户'}
                    </div>
                    
                    {/* 消息内容 */}
                    <div style={{ maxWidth: '70%' }}>
                      <div
                        style={{
                          background: message.sender === 'admin' 
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : '#ffffff',
                          color: message.sender === 'admin' ? 'white' : '#1f2937',
                          padding: '12px 16px',
                          borderRadius: message.sender === 'admin' 
                            ? '16px 16px 4px 16px'
                            : '16px 16px 16px 4px',
                          fontSize: '14px',
                          lineHeight: '1.5',
                          wordBreak: 'break-word',
                          boxShadow: message.sender === 'admin' 
                            ? '0 4px 12px rgba(102, 126, 234, 0.3)'
                            : '0 2px 8px rgba(0, 0, 0, 0.1)',
                          border: message.sender === 'admin' ? 'none' : '1px solid #e5e7eb',
                        }}
                      >
                        {message.content}
                      </div>
                      <div 
                        style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          marginTop: '4px',
                          textAlign: message.sender === 'admin' ? 'right' : 'left',
                        }}
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
            <div 
              style={{
                padding: '20px 24px',
                background: '#ffffff',
                borderTop: '1px solid #e5e7eb',
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入回复消息..."
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    minHeight: '40px',
                    maxHeight: '120px',
                    padding: '12px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    resize: 'none',
                    outline: 'none',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !newMessage.trim()}
                  style={{
                    width: '40px',
                    height: '40px',
                    background: isLoading || !newMessage.trim() 
                      ? '#e5e7eb' 
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: isLoading || !newMessage.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading && newMessage.trim()) {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {isLoading ? (
                    <div 
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: '#fafbfc',
          }}>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              <div 
                style={{
                  width: '80px',
                  height: '80px',
                  background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>选择一个会话</p>
              <p style={{ fontSize: '14px', opacity: 0.7 }}>从左侧选择用户开始聊天</p>
            </div>
          </div>
        )}
      </div>

      {/* CSS动画 */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}