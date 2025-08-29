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
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
        // 立即添加消息到本地状态，提供即时反馈
        const newMsg: ChatMessage = {
          id: response.data?.id || Date.now(), // 如果后端返回了id就用后端的，否则用临时id
          apiKey,
          sender: userPhone,
          receiver: 'admin',
          content: newMessage.trim(),
          messageType: 'text',
          isRead: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setMessages(prev => {
          // 避免重复添加（检查内容和时间）
          const exists = prev.some(msg => 
            msg.content === newMsg.content && 
            msg.sender === newMsg.sender && 
            Math.abs(new Date(msg.createdAt).getTime() - new Date(newMsg.createdAt).getTime()) < 1000
          );
          if (exists) return prev;
          return [...prev, newMsg];
        });
        
        setNewMessage('');
        
        // 滚动到底部
        setTimeout(scrollToBottom, 100);
        
        // 临时解决方案：延迟刷新聊天历史以确保AI回复能被显示
        console.log('发送消息成功，将在3秒后刷新聊天历史以获取AI回复');
        setTimeout(() => {
          console.log('开始刷新聊天历史...');
          loadChatHistory();
        }, 3000);
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
      console.log('开始标记消息为已读, 当前未读数量:', unreadCount);
      await chatApi.markMessagesAsRead(apiKey, token);
      setUnreadCount(0);
      console.log('消息已标记为已读，未读计数已清零');
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
    console.log('ChatWidget收到聊天消息:', data);
    console.log('ChatWidget消息数据类型:', typeof data);
    console.log('当前用户手机号:', userPhone);
    
    try {
      // 数据应该已经在主页面被解析过，这里直接使用
      const messageData = data;
      console.log('ChatWidget处理消息数据:', messageData);
      console.log('消息发送者:', messageData.sender, '消息接收者:', messageData.receiver, '消息类型:', messageData.type);
      
      if (messageData.type === 'new_message') {
        // 添加新消息到列表
        console.log('准备添加消息到列表');
        setMessages(prev => {
          // 避免重复添加
          const exists = prev.some(msg => msg.id === messageData.id);
          console.log('检查消息是否已存在:', exists, '消息ID:', messageData.id);
          if (exists) {
            console.log('消息已存在，跳过添加');
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
          
          console.log('✅ 成功添加新消息到列表:', newMessage);
          return [...prev, newMessage];
        });

        // 如果是接收到的消息（管理员发给用户的）
        console.log('检查是否为管理员消息:');
        console.log('- messageData.sender === "admin":', messageData.sender === 'admin');
        console.log('- messageData.receiver === userPhone:', messageData.receiver === userPhone);
        console.log('- messageData.receiver:', messageData.receiver);
        console.log('- userPhone:', userPhone);
        
        if (messageData.sender === 'admin' && messageData.receiver === userPhone) {
          console.log('✅ 确认收到管理员消息，聊天窗口状态:', isOpen ? '打开' : '关闭');
          if (isOpen) {
            // 聊天窗口打开时，直接标记为已读，不增加未读计数
            console.log('聊天窗口打开，将自动标记为已读');
            setTimeout(markAsRead, 500);
          } else {
            // 聊天窗口关闭时，增加未读计数
            console.log('聊天窗口关闭，增加未读计数');
            setUnreadCount(prev => {
              const newCount = prev + 1;
              console.log('未读计数更新:', prev, '=>', newCount);
              return newCount;
            });
          }
        }

        // 滚动到底部
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('处理聊天消息失败:', error);
    }
  };

  // 切换聊天窗口状态
  const toggleChat = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      if (unreadCount > 0) {
        markAsRead();
      }
      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
      }, 100);
    }
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
      {/* 聊天悬浮按钮 - 右下角带文字 */}
      <div 
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
        }}
      >
        <button
          onClick={toggleChat}
          className="relative group"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '28px',
            border: 'none',
            boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '14px 20px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
          }}
          title={isOpen ? "关闭聊天" : "联系客服"}
        >
          {/* 图标 - 根据状态切换 */}
          {isOpen ? (
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="white" 
              strokeWidth="2"
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          ) : (
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="white" 
              strokeWidth="2"
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <circle cx="9" cy="10" r="1"/>
              <circle cx="15" cy="10" r="1"/>
              <path d="M9 14s1.5 2 3 2 3-2 3-2"/>
            </svg>
          )}
          
          {/* 按钮文字 - 根据状态切换 */}
          <span style={{ whiteSpace: 'nowrap' }}>
            {isOpen ? '关闭聊天' : '联系我们'}
          </span>
          
          {/* 未读消息提示 */}
          {unreadCount > 0 && (
            <div 
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#ff4757',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '50%',
                minWidth: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                boxShadow: '0 2px 8px rgba(255, 71, 87, 0.4)',
                animation: 'pulse 2s infinite',
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </button>
      </div>

      {/* 聊天窗口 - 参考DeepSeek样式 */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '24px',
            width: '400px',
            height: '600px',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* 聊天窗口头部 */}
          <div 
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderRadius: '16px 16px 0 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div 
                style={{
                  width: '8px',
                  height: '8px',
                  background: '#4ade80',
                  borderRadius: '50%',
                  boxShadow: '0 0 8px rgba(74, 222, 128, 0.6)',
                }}
              />
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '2px' }}>
                  在线客服
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  我们将尽快回复您
                </div>
              </div>
            </div>
            <button
              onClick={closeChat}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* 聊天消息区域 */}
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
                  开始对话
                </div>
                <div style={{ fontSize: '14px', opacity: 0.7 }}>
                  发送消息开始与客服对话
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    flexDirection: message.sender === userPhone ? 'row-reverse' : 'row',
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
                      background: message.sender === userPhone 
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
                    {message.sender === userPhone ? '我' : '客服'}
                  </div>
                  
                  {/* 消息内容 */}
                  <div style={{ maxWidth: '70%' }}>
                    <div
                      style={{
                        background: message.sender === userPhone 
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : '#ffffff',
                        color: message.sender === userPhone ? 'white' : '#1f2937',
                        padding: '12px 16px',
                        borderRadius: message.sender === userPhone 
                          ? '16px 16px 4px 16px'
                          : '16px 16px 16px 4px',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        wordBreak: 'break-word',
                        boxShadow: message.sender === userPhone 
                          ? '0 4px 12px rgba(102, 126, 234, 0.3)'
                          : '0 2px 8px rgba(0, 0, 0, 0.1)',
                        border: message.sender === userPhone ? 'none' : '1px solid #e5e7eb',
                      }}
                    >
                      {message.content}
                    </div>
                    <div 
                      style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        marginTop: '4px',
                        textAlign: message.sender === userPhone ? 'right' : 'left',
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
              borderRadius: '0 0 16px 16px',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入消息..."
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
        </div>
      )}

      {/* 添加CSS动画 */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </>
  );
}