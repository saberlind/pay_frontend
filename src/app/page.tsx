'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Dialog组件已替换为自定义实现
import { tokenUtils, authApi, AuthResponse, notificationApi } from '@/lib/api';
import ChatWidget from '@/components/ChatWidget';
import Image from 'next/image';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [sseConnected, setSseConnected] = useState(false);
  const [pointsUpdated, setPointsUpdated] = useState(false);
  const [usingPolling, setUsingPolling] = useState(false);
  const sseRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const sseRetryCount = useRef(0);

  useEffect(() => {
    console.log("主页加载，检查认证状态...");
    
    // 添加一个小延迟，确保localStorage完全加载
    setTimeout(() => {
      const isAuth = tokenUtils.isAuthenticated();
      const token = tokenUtils.getToken();
      console.log("是否已认证:", isAuth, "token:", token ? token.substring(0, 20) + "..." : "无");
      
      if (!isAuth) {
        console.log("未认证，跳转到登录页");
        router.push('/login');
        return;
      }

      console.log("已认证，获取用户信息...");
      // 获取用户信息
      fetchUserInfo();
    }, 100);
  }, [router]);

  // 建立SSE连接
  const connectSSE = (userPhone: string) => {
    console.log("尝试建立SSE连接，用户手机号:", userPhone, "重试次数:", sseRetryCount.current);
    
    // 如果已有连接，先关闭
    if (sseRef.current) {
      notificationApi.closeSSE(sseRef.current);
      sseRef.current = null;
      setSseConnected(false);
    }
    
    // 如果轮询正在运行，先停止
    if (pollingRef.current) {
      notificationApi.stopPolling(pollingRef.current);
      pollingRef.current = null;
      setUsingPolling(false);
    }

    // 建立新连接
    const eventSource = notificationApi.connectSSE(
      userPhone,
      (event: MessageEvent) => {
        console.log("收到SSE消息:", event);
        sseRetryCount.current = 0; // 重置重试计数
        handleSSEMessage(event);
      },
      (error: Event) => {
        console.error("SSE连接错误:", error);
        setSseConnected(false);
        sseRetryCount.current++;
        
        // 如果重试次数超过3次，降级到轮询
        if (sseRetryCount.current >= 3) {
          console.warn("SSE连接多次失败，降级到轮询模式");
          startPollingMode(userPhone);
        } else {
          // 继续重试SSE连接
          const retryDelay = Math.min(5000 * sseRetryCount.current, 30000); // 最长30秒
          setTimeout(() => {
            console.log("尝试重新建立SSE连接...");
            connectSSE(userPhone);
          }, retryDelay);
        }
      }
    );

    if (eventSource) {
      sseRef.current = eventSource;
      setSseConnected(true);
      console.log("SSE连接已建立");
    } else {
      // 如果无法创建SSE连接，直接降级到轮询
      console.warn("无法创建SSE连接，直接使用轮询模式");
      startPollingMode(userPhone);
    }
  };
  
  // 启动轮询模式
  const startPollingMode = (userPhone: string) => {
    console.log("启动轮询模式");
    setUsingPolling(true);
    setSseConnected(false);
    
    pollingRef.current = notificationApi.startPolling(
      userPhone,
      (event: any) => {
        console.log("收到轮询消息:", event);
        handleSSEMessage(event);
      },
      10000 // 10秒间隔
    );
  };

  // 刷新用户信息
  const refreshUserInfo = async () => {
    try {
      console.log("刷新用户信息...");
      const response = await authApi.getCurrentUser();
      if (response.success && response.data) {
        console.log("用户信息刷新成功:", response.data);
        setUser(response.data);
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error);
    }
  };

  // 处理SSE消息
  const handleSSEMessage = (event: MessageEvent) => {
    console.log("处理SSE消息:", event.type, event.data);
    
    switch (event.type) {
      case 'connection':
        showToastMessage('🔗 实时通知连接已建立');
        break;
      case 'notification':
        showToastMessage(event.data);
        // 收到普通通知后也刷新用户信息，以防点数有变化
        refreshUserInfo();
        break;
      case 'points_update':
        try {
          const data = JSON.parse(event.data);
          showToastMessage(`💰 ${data.message}`, 5000); // 点数更新消息显示5秒
          
          // 方法1: 直接更新用户点数（快速响应）
          if (user) {
            setUser({
              ...user,
              points: data.newPoints
            });
            
            // 触发点数更新动画
            setPointsUpdated(true);
            setTimeout(() => {
              setPointsUpdated(false);
            }, 2000); // 动画持续2秒
          }
          
          // 方法2: 从服务器刷新用户信息（确保数据一致性）
          setTimeout(() => {
            refreshUserInfo();
          }, 500); // 延迟500ms刷新，让用户看到即时更新效果
          
        } catch (e) {
          console.error("解析点数更新消息失败:", e);
          showToastMessage(event.data);
          // 解析失败时直接刷新用户信息
          refreshUserInfo();
        }
        break;
      case 'chat_message':
        // 处理聊天消息
        console.log("主页面收到聊天消息SSE事件:", event.data);
        console.log("聊天消息数据类型:", typeof event.data);
        
        // 确保数据被正确解析
        let chatMessageData;
        try {
          chatMessageData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          console.log("主页面解析聊天消息成功:", chatMessageData);
        } catch (e) {
          console.error("主页面解析聊天消息失败:", e, event.data);
          return;
        }
        
        // 触发自定义事件，让ChatWidget组件处理
        const chatEvent = new CustomEvent('sse-chat-message', {
          detail: chatMessageData // 传递解析后的数据对象，而不是原始字符串
        });
        window.dispatchEvent(chatEvent);
        break;
      default:
        if (event.data) {
          showToastMessage(event.data);
          // 未知消息类型，可能包含重要信息，刷新用户数据
          refreshUserInfo();
        }
    }
  };

  // 组件卸载时关闭所有连接
  useEffect(() => {
    return () => {
      if (sseRef.current) {
        notificationApi.closeSSE(sseRef.current);
        console.log("组件卸载，SSE连接已关闭");
      }
      if (pollingRef.current) {
        notificationApi.stopPolling(pollingRef.current);
        console.log("组件卸载，轮询已停止");
      }
    };
  }, []);

  const fetchUserInfo = async () => {
    try {
      console.log("开始获取用户信息...");
      const response = await authApi.getCurrentUser();
      console.log("用户信息响应:", response);
      
      if (response.success && response.data) {
        console.log("用户信息获取成功:", response.data);
        setUser(response.data);
        
        // 建立SSE连接
        if (response.data.phone) {
          console.log("用户信息获取成功，开始建立SSE连接...");
          connectSSE(response.data.phone);
        }
      } else {
        console.log("用户信息获取失败:", response.message);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      // 如果获取失败，可能token过期，跳转到登录页
      console.log("token可能过期，清除并跳转到登录页");
      tokenUtils.removeToken();
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    tokenUtils.removeToken();
    router.push('/login');
  };

  const showToastMessage = (message: string, duration: number = 3000) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, duration);
  };

  const handleRecharge = () => {
    console.log("立即充值按钮被点击");
    console.log("当前showPaymentDialog状态:", showPaymentDialog);
    setShowPaymentDialog(true);
    console.log("充值对话框状态设置为true");
    // 延迟检查状态是否更新
    setTimeout(() => {
      console.log("状态更新后的showPaymentDialog:", showPaymentDialog);
    }, 100);
  };

  const copyApiKey = async () => {
    if (user?.apiKey) {
      try {
        await navigator.clipboard.writeText(user.apiKey);
        showToastMessage('✅ API Key已成功复制到剪贴板');
      } catch (err) {
        console.error('复制失败:', err);
        // 降级方案：创建临时输入框
        const textArea = document.createElement('textarea');
        textArea.value = user.apiKey;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToastMessage('✅ API Key已成功复制到剪贴板');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        position: "relative",
      }}
    >
      {/* 导航栏 */}
      <nav
        style={{
          backdropFilter: "blur(10px)",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
          padding: "1rem 2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "white",
              margin: 0,
            }}
          >
            管理后台
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ color: "rgba(255, 255, 255, 0.9)" }}>
              欢迎，{user?.username || '用户'}
            </span>
            {/* 连接状态指示器 */}
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "0.5rem",
              fontSize: "12px",
              color: "rgba(255, 255, 255, 0.7)"
            }}>
              <div style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: sseConnected ? "#10b981" : usingPolling ? "#f59e0b" : "#ef4444"
              }}></div>
              <span>
                {sseConnected ? "实时连接" : usingPolling ? "轮询模式" : "连接中..."}
              </span>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              style={{
                borderColor: "rgba(255, 255, 255, 0.3)",
                color: "white",
                backgroundColor: "transparent",
                cursor: "pointer",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s ease-in-out",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                backdropFilter: "blur(4px)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              退出登录
            </Button>
          </div>
        </div>
      </nav>

      {/* 主要内容 */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "1200px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "2rem",
          }}
        >
          {/* 用户信息卡片 */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              borderRadius: "1rem",
              padding: "2rem",
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
            }}
          >
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: "bold",
                color: "#4F46E5",
                marginBottom: "1.5rem",
                margin: "0 0 1.5rem 0",
              }}
            >
              用户信息
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontWeight: "500", color: "#374151" }}>用户名：</span>
                <span style={{ color: "#4F46E5", fontWeight: "600" }}>{user?.username}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontWeight: "500", color: "#374151" }}>手机号：</span>
                <span style={{ color: "#6B7280" }}>{user?.phone}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontWeight: "500", color: "#374151" }}>通知状态：</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <div 
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: sseConnected ? "#10B981" : "#EF4444"
                    }}
                  />
                  <span style={{ 
                    color: sseConnected ? "#10B981" : "#EF4444",
                    fontSize: "0.875rem",
                    fontWeight: "500"
                  }}>
                    {sseConnected ? "已连接" : "未连接"}
                  </span>
                </div>
              </div>
              <div
                style={{
                  background: pointsUpdated 
                    ? "linear-gradient(to right, #D4EDDA, #C3E6CB)" 
                    : "linear-gradient(to right, #FEF3C7, #FED7AA)",
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border: pointsUpdated ? "2px solid #28A745" : "1px solid #F59E0B",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  transition: "all 0.3s ease-in-out",
                  transform: pointsUpdated ? "scale(1.02)" : "scale(1)",
                  boxShadow: pointsUpdated 
                    ? "0 0 20px rgba(40, 167, 69, 0.3)" 
                    : "none",
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>💰</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: "500", color: "#374151", margin: "0 0 0.25rem 0" }}>剩余点数</p>
                  <p style={{ 
                    fontSize: "1.5rem", 
                    fontWeight: "bold", 
                    color: pointsUpdated ? "#28A745" : "#EA580C", 
                    margin: 0,
                    transition: "color 0.3s ease-in-out"
                  }}>
                    {user?.points || 0} 点
                  </p>
                </div>
                <button
                  onClick={refreshUserInfo}
                  style={{
                    background: "transparent",
                    border: "1px solid #F59E0B",
                    borderRadius: "0.375rem",
                    padding: "0.25rem 0.5rem",
                    color: "#F59E0B",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "#F59E0B";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#F59E0B";
                  }}
                  title="手动刷新点数"
                >
                  🔄 刷新
                </button>
              </div>
            </div>
          </div>

          {/* API Key卡片 */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              borderRadius: "1rem",
              padding: "2rem",
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
            }}
          >
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: "bold",
                color: "#059669",
                marginBottom: "1.5rem",
                margin: "0 0 1.5rem 0",
              }}
            >
              API 密钥
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div
                style={{
                  background: "white",
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #D1FAE5",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: "0.5rem" }}>
                  您的API密钥
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                    color: "#374151",
                    wordBreak: "break-all",
                    background: "#F9FAFB",
                    padding: "0.5rem",
                    borderRadius: "0.375rem",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  {user?.apiKey || '加载中...'}
                </div>
              </div>
              <button
                onClick={copyApiKey}
                disabled={!user?.apiKey}
                style={{
                  width: "100%",
                  background: "#059669",
                  color: "white",
                  border: "none",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  cursor: user?.apiKey ? "pointer" : "not-allowed",
                  opacity: user?.apiKey ? 1 : 0.5,
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                📋 一键复制 API Key
              </button>
              <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                ⚠️ 请妥善保管您的API密钥，用于API请求和忘记密码时的身份验证
              </div>
            </div>
          </div>

          {/* 充值卡片 */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              borderRadius: "1rem",
              padding: "2rem",
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
            }}
          >
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: "bold",
                color: "#7C3AED",
                marginBottom: "1.5rem",
                margin: "0 0 1.5rem 0",
              }}
            >
              充值中心
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p style={{ color: "#6B7280", margin: 0 }}>
                点击下方按钮进行充值，支持微信和支付宝付款
              </p>
              <button
                onClick={handleRecharge}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                立即充值
              </button>
            </div>
          </div>

          {/* 功能介绍卡片 */}
          {/* <div
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              borderRadius: "1rem",
              padding: "2rem",
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
            }}
          >
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: "bold",
                color: "#DC2626",
                marginBottom: "1.5rem",
                margin: "0 0 1.5rem 0",
              }}
            >
              功能介绍
            </h3>
            <ul style={{ margin: 0, padding: "0 0 0 1rem", color: "#6B7280" }}>
              <li style={{ marginBottom: "0.5rem" }}>手机号快速注册登录</li>
              <li style={{ marginBottom: "0.5rem" }}>微信/支付宝在线充值</li>
              <li style={{ marginBottom: "0.5rem" }}>实时点数管理</li>
              <li style={{ marginBottom: "0.5rem" }}>安全可靠的支付环境</li>
            </ul>
          </div> */}
        </div>
      </main>

      {/* 充值对话框 */}
      {showPaymentDialog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowPaymentDialog(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "1rem",
              padding: "2rem",
              maxWidth: "600px",
              width: "95%",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题栏 */}
            <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  color: "#374151",
                  margin: "0 0 0.5rem 0",
                }}
              >
                选择支付方式
              </h2>
              <p style={{ color: "#6B7280", margin: 0, fontSize: "0.875rem" }}>
                请选择支付方式并扫描二维码完成充值
              </p>
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={() => setShowPaymentDialog(false)}
              style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                background: "none",
                border: "none",
                fontSize: "1.5rem",
                color: "#6B7280",
                cursor: "pointer",
                width: "2rem",
                height: "2rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "0.5rem",
              }}
            >
              ×
            </button>

            {/* 收款码区域 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              {/* 微信支付 */}
              <div style={{ textAlign: "center" }}>
                <h3
                  style={{
                    fontWeight: "600",
                    marginBottom: "1rem",
                    color: "#374151",
                    fontSize: "1rem",
                  }}
                >
                  微信支付
                </h3>
                <div
                  style={{
                    background: "#F3F4F6",
                    padding: "1rem",
                    borderRadius: "0.75rem",
                    border: "2px solid #E5E7EB",
                  }}
                >
                  <div
                    style={{
                      width: "min(240px, 80vw)",
                      height: "min(240px, 80vw)",
                      maxWidth: "300px",
                      maxHeight: "300px",
                      margin: "0 auto",
                      background: "white",
                      borderRadius: "0.5rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <Image
                      src="/payment/wechat-qr.png"
                      alt="微信收款码"
                      width={220}
                      height={220}
                      style={{ 
                        objectFit: "contain",
                        width: "90%",
                        height: "90%",
                        maxWidth: "220px",
                        maxHeight: "220px"
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 支付宝支付 */}
              <div style={{ textAlign: "center" }}>
                <h3
                  style={{
                    fontWeight: "600",
                    marginBottom: "1rem",
                    color: "#374151",
                    fontSize: "1rem",
                  }}
                >
                  支付宝支付
                </h3>
                <div
                  style={{
                    background: "#F3F4F6",
                    padding: "1rem",
                    borderRadius: "0.75rem",
                    border: "2px solid #E5E7EB",
                  }}
                >
                  <div
                    style={{
                      width: "min(240px, 80vw)",
                      height: "min(240px, 80vw)",
                      maxWidth: "300px",
                      maxHeight: "300px",
                      margin: "0 auto",
                      background: "white",
                      borderRadius: "0.5rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <Image
                      src="/payment/alipay-qr.png"
                      alt="支付宝收款码"
                      width={220}
                      height={220}
                      style={{ 
                        objectFit: "contain",
                        width: "90%",
                        height: "90%",
                        maxWidth: "220px",
                        maxHeight: "220px"
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 底部说明 */}
            <div
              style={{
                textAlign: "center",
                color: "#6B7280",
                fontSize: "0.875rem",
                padding: "1rem",
                background: "#F9FAFB",
                borderRadius: "0.5rem",
                border: "1px solid #E5E7EB",
              }}
            >
              💡 完成支付后，请联系客服添加点数
            </div>
          </div>
        </div>
      )}

      {/* Toast 提示组件 */}
      {showToast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            background: "rgba(16, 185, 129, 0.95)",
            color: "white",
            padding: "16px 24px",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(10px)",
            zIndex: 1000,
            animation: "slideInFromRight 0.3s ease-out",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            fontSize: "14px",
            fontWeight: "500",
            maxWidth: "320px",
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* 聊天组件 */}
      {user && (
        <ChatWidget 
          userPhone={user.phone}
          token={tokenUtils.getToken() || ''}
          apiKey={user.apiKey}
        />
      )}

      {/* Toast 动画样式 */}
      <style jsx>{`
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
