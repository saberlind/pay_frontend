'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
// UI组件已替换为内联样式实现
import { adminApi, User, tokenUtils, notificationApi } from '@/lib/api';
import AdminChatPanel from '@/components/AdminChatPanel';
import { Search, Plus, LogOut, Smartphone, Users, MessageCircle } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    phone: '',
    points: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'addPoints' | 'chat'>('addPoints');
  const [sseConnected, setSseConnected] = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  // SSE连接管理
  const connectSSE = () => {
    console.log("管理员建立SSE连接...");
    
    // 关闭现有连接
    if (sseRef.current) {
      notificationApi.closeSSE(sseRef.current);
      sseRef.current = null;
      setSseConnected(false);
    }

    // 建立新连接 - 管理员使用 "admin" 作为标识符
    const eventSource = notificationApi.connectSSE(
      "admin",
      (event: MessageEvent) => {
        console.log("管理员收到SSE消息:", event);
        handleSSEMessage(event);
      },
      (error: Event) => {
        console.error("管理员SSE连接错误:", error);
        setSseConnected(false);
        // 5秒后重试连接
        setTimeout(() => {
          console.log("管理员尝试重新建立SSE连接...");
          connectSSE();
        }, 5000);
      }
    );

    if (eventSource) {
      sseRef.current = eventSource;
      setSseConnected(true);
      console.log("管理员SSE连接已建立");
    }
  };

  // 处理SSE消息
  const handleSSEMessage = (event: MessageEvent) => {
    console.log('管理员页面收到SSE消息:', event);
    
    let messageData;
    try {
      messageData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    } catch (e) {
      console.error('解析SSE消息失败:', e, event.data);
      return;
    }

    console.log('管理员页面解析后的消息数据:', messageData);

    switch (messageData.type) {
      case 'chat_message':
        // 处理聊天消息
        console.log("管理员收到聊天消息:", messageData);
        
        // 触发自定义事件，让AdminChatPanel组件处理
        const chatEvent = new CustomEvent('sse-chat-message', {
          detail: messageData
        });
        window.dispatchEvent(chatEvent);
        break;
      default:
        console.log('管理员收到未知类型消息:', messageData);
        break;
    }
  };

  useEffect(() => {
    // 检查是否是管理员登录
    const currentToken = tokenUtils.getToken();
    console.log("管理员页面检查token:", currentToken ? currentToken.substring(0, 20) + "..." : "无token");
    
    if (!tokenUtils.isAdminAuthenticated()) {
      console.log("不是管理员token，跳转到管理员登录页面");
      router.push('/admin/login');
      return;
    }
    setIsAuthenticated(true);
    
    // 建立SSE连接
    connectSSE();
    
    // 清理函数
    return () => {
      if (sseRef.current) {
        console.log("管理员页面卸载，关闭SSE连接");
        notificationApi.closeSSE(sseRef.current);
        sseRef.current = null;
      }
    };
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogout = () => {
    tokenUtils.removeToken();
    router.push('/admin/login');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">验证登录状态...</div>
      </div>
    );
  }

  const handleAddPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const points = parseInt(formData.points);
      if (isNaN(points) || points <= 0) {
        setMessage('请输入有效的点数');
        setMessageType('error');
        return;
      }

      const response = await adminApi.addPoints({
        phone: formData.phone,
        points: points,
      });

      if (response.success && response.data) {
        setMessage(`成功为用户 ${response.data.username} 增加 ${points} 点数`);
        setMessageType('success');
        setUserInfo(response.data);
        setFormData({ phone: '', points: '' });
      } else {
        setMessage(response.message || '操作失败');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('操作失败，请检查网络连接');
      setMessageType('error');
      console.error('Add points error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUser = async () => {
    if (!formData.phone) {
      setMessage('请输入手机号');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await adminApi.getUserByPhone(formData.phone);
      
      if (response.success && response.data) {
        setUserInfo(response.data);
        setMessage('查询成功');
        setMessageType('success');
      } else {
        setMessage(response.message || '用户不存在');
        setMessageType('error');
        setUserInfo(null);
      }
    } catch (error) {
      setMessage('查询失败，请检查网络连接');
      setMessageType('error');
      setUserInfo(null);
      console.error('Search user error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        position: "relative",
      }}
    >
      {/* 移动端导航栏 */}
      <nav
        style={{
          backdropFilter: "blur(10px)",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
          padding: "1rem",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            maxWidth: "400px",
            margin: "0 auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                background: "rgba(255, 255, 255, 0.2)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              <Users style={{ width: "20px", height: "20px", color: "white" }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h1
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "bold",
                    color: "white",
                    margin: 0,
                  }}
                >
                  管理员面板
                </h1>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: sseConnected ? "#10b981" : "#ef4444",
                    transition: "background-color 0.3s",
                  }}
                  title={sseConnected ? "实时连接已建立" : "实时连接断开"}
                ></div>
              </div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "rgba(255, 255, 255, 0.8)",
                  margin: 0,
                }}
              >
                用户点数管理 & 客服聊天
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              color: "white",
              padding: "0.5rem 0.75rem",
              borderRadius: "8px",
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <LogOut style={{ width: "16px", height: "16px" }} />
            退出
          </button>
        </div>
      </nav>

      <div
        style={{
          padding: "1.5rem 1rem",
          maxWidth: activeTab === 'chat' ? "1200px" : "400px",
          margin: "0 auto",
        }}
      >
        {/* 标签页导航 */}
        <div
          style={{
            display: "flex",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: "1rem",
            padding: "0.5rem",
            marginBottom: "1.5rem",
            boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
          }}
        >
          <button
            onClick={() => setActiveTab('addPoints')}
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "none",
              background: activeTab === 'addPoints' ? "#2563EB" : "transparent",
              color: activeTab === 'addPoints' ? "white" : "#6B7280",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s",
            }}
          >
            <Plus style={{ width: "16px", height: "16px" }} />
            点数管理
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "none",
              background: activeTab === 'chat' ? "#2563EB" : "transparent",
              color: activeTab === 'chat' ? "white" : "#6B7280",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s",
            }}
          >
            <MessageCircle style={{ width: "16px", height: "16px" }} />
            客服聊天
          </button>
        </div>

        {/* 标签页内容 */}
        {activeTab === 'addPoints' ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* 用户查询卡片 */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              borderRadius: "1rem",
              padding: "1.5rem",
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
            }}
          >
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: "bold",
                color: "#2563EB",
                marginBottom: "1rem",
                margin: "0 0 1rem 0",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Search style={{ width: "20px", height: "20px" }} />
              用户查询
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#374151",
                    display: "block",
                    marginBottom: "0.5rem",
                  }}
                >
                  手机号码
                </label>
                <div style={{ position: "relative" }}>
                  <Smartphone
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#9CA3AF",
                      width: "20px",
                      height: "20px",
                    }}
                  />
                  <input
                    name="phone"
                    type="tel"
                    placeholder="请输入要查询的手机号"
                    value={formData.phone}
                    onChange={handleInputChange}
                    pattern="^1[3-9]\d{9}$"
                    style={{
                      paddingLeft: "44px",
                      paddingRight: "12px",
                      height: "42px",
                      width: "100%",
                      border: "1px solid #D1D5DB",
                      borderRadius: "8px",
                      fontSize: "15px",
                      outline: "none",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#2563EB";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#E5E7EB";
                    }}
                  />
                </div>
              </div>
              <button
                onClick={handleSearchUser}
                disabled={loading}
                style={{
                  width: "100%",
                  height: "42px",
                  background: loading ? "#9CA3AF" : "#2563EB",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "15px",
                  fontWeight: "500",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  transition: "background-color 0.2s",
                  boxSizing: "border-box",
                }}
                onMouseOver={(e) => {
                  if (!loading) (e.target as HTMLElement).style.backgroundColor = "#1D4ED8";
                }}
                onMouseOut={(e) => {
                  if (!loading) (e.target as HTMLElement).style.backgroundColor = "#2563EB";
                }}
              >
                <Search style={{ width: "16px", height: "16px" }} />
                {loading ? "查询中..." : "查询用户"}
              </button>
            </div>
          </div>

          {/* 用户信息显示 */}
          {userInfo && (
            <div
              style={{
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(10px)",
                borderRadius: "1rem",
                padding: "1.5rem",
                boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
              }}
            >
              <h3
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "bold",
                  color: "#059669",
                  marginBottom: "1rem",
                  margin: "0 0 1rem 0",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Users style={{ width: "20px", height: "20px" }} />
                用户信息
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div
                  style={{
                    background: "#F9FAFB",
                    padding: "0.75rem",
                    borderRadius: "8px",
                  }}
                >
                  <p style={{ fontSize: "0.875rem", color: "#6B7280", margin: "0 0 0.25rem 0" }}>
                    用户名
                  </p>
                  <p style={{ fontWeight: "600", fontSize: "1.125rem", color: "#374151", margin: 0 }}>
                    {userInfo.username}
                  </p>
                </div>
                <div
                  style={{
                    background: "#F9FAFB",
                    padding: "0.75rem",
                    borderRadius: "8px",
                  }}
                >
                  <p style={{ fontSize: "0.875rem", color: "#6B7280", margin: "0 0 0.25rem 0" }}>
                    手机号
                  </p>
                  <p style={{ fontWeight: "600", fontSize: "1.125rem", color: "#374151", margin: 0 }}>
                    {userInfo.phone}
                  </p>
                </div>
                <div
                  style={{
                    background: "linear-gradient(to right, #DBEAFE, #BFDBFE)",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #3B82F6",
                  }}
                >
                  <p style={{ fontSize: "0.875rem", color: "#1D4ED8", margin: "0 0 0.25rem 0" }}>
                    当前点数
                  </p>
                  <p style={{ fontWeight: "bold", fontSize: "1.5rem", color: "#1D4ED8", margin: 0 }}>
                    {userInfo.points}
                  </p>
                </div>
                <div
                  style={{
                    background: "#F9FAFB",
                    padding: "0.75rem",
                    borderRadius: "8px",
                  }}
                >
                  <p style={{ fontSize: "0.875rem", color: "#6B7280", margin: "0 0 0.25rem 0" }}>
                    注册时间
                  </p>
                  <p style={{ fontWeight: "500", color: "#374151", margin: 0 }}>
                    {new Date(userInfo.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 添加点数卡片 */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              borderRadius: "1rem",
              padding: "1.5rem",
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
            }}
          >
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: "bold",
                color: "#EA580C",
                marginBottom: "1rem",
                margin: "0 0 1rem 0",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Plus style={{ width: "20px", height: "20px" }} />
              添加点数
            </h3>
            <form onSubmit={handleAddPoints} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {message && (
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    background: messageType === "success" ? "#F0FDF4" : "#FEF2F2",
                    border: `1px solid ${messageType === "success" ? "#BBF7D0" : "#FECACA"}`,
                    color: messageType === "success" ? "#059669" : "#DC2626",
                  }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      background: messageType === "success" ? "#059669" : "#DC2626",
                      flexShrink: 0,
                    }}
                  ></div>
                  {message}
                </div>
              )}

              <div>
                <label
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#374151",
                    display: "block",
                    marginBottom: "0.5rem",
                  }}
                >
                  增加点数
                </label>
                <input
                  name="points"
                  type="number"
                  placeholder="请输入要增加的点数"
                  value={formData.points}
                  onChange={handleInputChange}
                  min="1"
                  required
                  style={{
                    height: "42px",
                    width: "100%",
                    padding: "0 12px",
                    border: "1px solid #D1D5DB",
                    borderRadius: "8px",
                    fontSize: "15px",
                    outline: "none",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#EA580C";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#E5E7EB";
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !formData.phone}
                style={{
                  width: "100%",
                  height: "42px",
                  background: loading || !formData.phone ? "#9CA3AF" : "#EA580C",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "15px",
                  fontWeight: "500",
                  cursor: loading || !formData.phone ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  transition: "background-color 0.2s",
                  boxSizing: "border-box",
                }}
                onMouseOver={(e) => {
                  if (!loading && formData.phone) (e.target as HTMLElement).style.backgroundColor = "#C2410C";
                }}
                onMouseOut={(e) => {
                  if (!loading && formData.phone) (e.target as HTMLElement).style.backgroundColor = "#EA580C";
                }}
              >
                <Plus style={{ width: "16px", height: "16px" }} />
                {loading ? "处理中..." : "添加点数"}
              </button>
            </form>
          </div>
          </div>
        ) : (
          /* 聊天标签页内容 */
          <div>
            <AdminChatPanel token={tokenUtils.getToken() || ''} />
          </div>
        )}
      </div>
    </div>
  );
}
