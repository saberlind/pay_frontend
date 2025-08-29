'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// UI组件已替换为内联样式实现
import { authApi, tokenUtils } from '@/lib/api';
import { Eye, EyeOff, Lock, User } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApi.adminLogin(formData);
      
      if (response.success && response.data) {
        // 保存 token
        tokenUtils.setToken(response.data.token);
        
        // 跳转到管理页面
        router.push('/admin');
      } else {
        setError(response.message || '登录失败');
      }
    } catch (err) {
      setError('登录失败，请检查网络连接');
      console.error('Admin login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "380px" }}>
        <div
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: "1rem",
            padding: "1.75rem",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
          }}
        >
          {/* 头部 */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem auto",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              }}
            >
              <Lock style={{ width: "32px", height: "32px", color: "white" }} />
            </div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                color: "#374151",
                margin: "0 0 0.5rem 0",
              }}
            >
              管理员登录
            </h1>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#6B7280",
                margin: 0,
              }}
            >
              请输入管理员账号和密码
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", boxSizing: "border-box" }}>
            {error && (
              <div
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#DC2626",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  width: "100%",
                  boxSizing: "border-box",
                  maxWidth: "100%",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    background: "#DC2626",
                    borderRadius: "50%",
                    flexShrink: 0,
                  }}
                ></div>
                <span style={{ flex: 1, wordBreak: "break-word" }}>
                  {error}
                </span>
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
                管理员账号
              </label>
              <div style={{ position: "relative" }}>
                <User
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
                  name="username"
                  type="text"
                  placeholder="请输入管理员账号"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  style={{
                    paddingLeft: "44px",
                    paddingRight: "12px",
                    height: "48px",
                    width: "100%",
                    border: "1px solid #D1D5DB",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#2563EB";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#D1D5DB";
                  }}
                />
              </div>
            </div>

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
                管理员密码
              </label>
              <div style={{ position: "relative" }}>
                <Lock
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
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入管理员密码"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  style={{
                    paddingLeft: "44px",
                    paddingRight: "44px",
                    height: "48px",
                    width: "100%",
                    border: "1px solid #D1D5DB",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#2563EB";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#D1D5DB";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9CA3AF",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {showPassword ? (
                    <EyeOff style={{ width: "20px", height: "20px" }} />
                  ) : (
                    <Eye style={{ width: "20px", height: "20px" }} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                height: "42px",
                background: loading ? "#9CA3AF" : "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
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
                transition: "all 0.2s",
                boxSizing: "border-box",
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      border: "2px solid white",
                      borderTop: "2px solid transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  ></div>
                  登录中...
                </>
              ) : (
                "登录"
              )}
            </button>
          </form>

          <div style={{ paddingTop: "1rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.875rem", color: "#6B7280", margin: 0 }}>
              仅限授权管理员访问
            </p>
          </div>
        </div>

        {/* 返回首页链接 */}
        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <button
            onClick={() => router.push("/")}
            style={{
              color: "rgba(255, 255, 255, 0.9)",
              background: "none",
              border: "none",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: "pointer",
              textDecoration: "none",
            }}
            onMouseOver={(e) => {
              (e.target as HTMLElement).style.color = "white";
            }}
            onMouseOut={(e) => {
              (e.target as HTMLElement).style.color = "rgba(255, 255, 255, 0.9)";
            }}
          >
            ← 返回首页
          </button>
        </div>

        {/* 旋转动画 */}
        <style jsx>{`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
