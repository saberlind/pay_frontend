"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi, tokenUtils } from "@/lib/api";

interface LoginForm {
  phone: string;
  password: string;
}

export default function LoginPage() {
  const [formData, setFormData] = useState<LoginForm>({
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("登录按钮被点击，表单数据:", formData);
    setLoading(true);
    setError("");

    try {
      console.log("开始登录请求...");
      const response = await authApi.login(formData);
      console.log("登录响应:", response);
      
      if (response.success && response.data) {
        console.log("登录成功，响应数据结构:", response.data);
        console.log("token值:", response.data.token);
        
        if (!response.data.token) {
          console.error("警告：响应中没有token字段！");
          setError("登录响应格式错误：缺少token");
          return;
        }
        
        // 保存token到localStorage
        tokenUtils.setToken(response.data.token);
        
        // 验证token是否保存成功
        const savedToken = tokenUtils.getToken();
        console.log("token保存验证:", savedToken ? "成功" : "失败");
        
        if (!savedToken) {
          console.error("token保存失败！");
          setError("token保存失败，请重试");
          return;
        }
        
        console.log("准备跳转到主页...");
        
        // 使用window.location进行强制跳转
        console.log("使用window.location进行跳转...");
        window.location.href = "/";
        console.log("window.location跳转完成");
      } else {
        console.log("登录失败:", response.message);
        setError(response.message || "登录失败");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 50%, #f3e8ff 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        margin: '0 auto',
        position: 'relative'
      }}>
        {/* 品牌标题 */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            background: 'linear-gradient(to right, #2563eb, #9333ea)',
            borderRadius: '16px',
            marginBottom: '16px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
          }}>
            <span style={{ color: 'white', fontSize: '24px' }}>💳</span>
          </div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            background: 'linear-gradient(to right, #2563eb, #9333ea)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            marginBottom: '8px'
          }}>
            管理后台
          </h1>
        </div>

        {/* 登录卡片 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          padding: '32px'
        }}>
          {/* 卡片标题 */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '8px'
            }}>
              欢迎回来
            </h2>
            <p style={{ color: '#6b7280' }}>
              请登录您的账户
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '14px',
              borderRadius: '12px'
            }}>
              {error}
            </div>
          )}

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Input
                name="phone"
                type="tel"
                placeholder="手机号码或邮箱"
                value={formData.phone}
                onChange={handleInputChange}
                required
                style={{
                  height: '56px',
                  fontSize: '18px',
                  background: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: '12px',
                  padding: '0 16px'
                }}
              />

              <Input
                name="password"
                type="password"
                placeholder="密码"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength={6}
                style={{
                  height: '56px',
                  fontSize: '18px',
                  background: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: '12px',
                  padding: '0 16px'
                }}
              />
            </div>

            {/* 记住我和忘记密码 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{
                    borderRadius: '4px',
                    borderColor: '#d1d5db',
                    color: '#2563eb'
                  }}
                />
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  记住我
                </span>
              </label>
              <Link
                href="/forgot-password"
                style={{
                  fontSize: '14px',
                  color: '#2563eb',
                  textDecoration: 'none'
                }}
              >
                忘记密码？
              </Link>
            </div>

            {/* 登录按钮 */}
            <Button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '56px',
                fontSize: '18px',
                fontWeight: '600',
                background: 'linear-gradient(to right, #2563eb, #9333ea)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer'
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span>登录中...</span>
                </div>
              ) : (
                "登录"
              )}
            </Button>
          </form>

          {/* 分割线 */}
          <div style={{ position: 'relative', margin: '32px 0' }}>
            <div style={{
              position: 'absolute',
              inset: '0',
              display: 'flex',
              alignItems: 'center'
            }}>
              <div style={{ width: '100%', borderTop: '1px solid #d1d5db' }}></div>
            </div>
            <div style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              fontSize: '14px'
            }}>
              <span style={{
                padding: '0 16px',
                background: 'white',
                color: '#6b7280'
              }}>
                或
              </span>
            </div>
          </div>

          {/* 注册链接 */}
          <div style={{ textAlign: 'center' }}>
            <span style={{ color: '#6b7280' }}>
              还没有账户？
            </span>
            <Link
              href="/register"
              style={{
                marginLeft: '8px',
                color: '#2563eb',
                fontWeight: '600',
                textDecoration: 'none'
              }}
            >
              立即注册
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}