"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi, tokenUtils } from "@/lib/api";

interface RegisterForm {
  username: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<RegisterForm>({
    username: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 验证密码一致性
    if (formData.password !== formData.confirmPassword) {
      setError("两次输入的密码不一致");
      setLoading(false);
      return;
    }

    // 验证密码长度
    if (formData.password.length < 6) {
      setError("密码长度至少为6位");
      setLoading(false);
      return;
    }

    // 验证用户名长度
    if (formData.username.length < 2) {
      setError("用户名长度至少为2位");
      setLoading(false);
      return;
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError("请输入正确的手机号格式（以1开头的11位数字，第二位为3-9）");
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.register({
        username: formData.username,
        phone: formData.phone,
        password: formData.password,
      });

      if (response.success && response.data) {
        // 保存token到localStorage
        tokenUtils.setToken(response.data.token);
        setSuccess("注册成功！已获得5个免费点数，正在跳转到登录页面...");
        // 立即跳转到登录页面
        router.push("/login");
      } else {
        setError(response.message || "注册失败");
      }
    } catch (err: any) {
      console.error("Register error:", err);
      // 网络连接错误或其他异常情况
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)',
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
            background: 'linear-gradient(to right, #059669, #0d9488)',
            borderRadius: '16px',
            marginBottom: '16px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
          }}>
            <span style={{ color: 'white', fontSize: '24px' }}>🎁</span>
          </div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            background: 'linear-gradient(to right, #059669, #0d9488)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            marginBottom: '8px'
          }}>
            管理后台
          </h1>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '8px 16px',
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '20px',
            marginTop: '8px'
          }}>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#059669'
            }}>
              🎉 注册即送 5 个免费点数
            </span>
          </div>
        </div>

        {/* 注册卡片 */}
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
              创建账户
            </h2>
            <p style={{ color: '#6b7280' }}>
              注册即可获得 5 个免费点数
            </p>
          </div>

          {/* 成功提示 */}
          {success && (
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              fontSize: '14px',
              borderRadius: '12px'
            }}>
              {success}
            </div>
          )}

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

          {/* 注册表单 */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 8px' }}>
              <Input
                name="username"
                type="text"
                placeholder="用户名（至少2位）"
                value={formData.username}
                onChange={handleInputChange}
                required
                minLength={2}
                maxLength={20}
                style={{
                  height: '56px',
                  fontSize: '18px',
                  background: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: '12px',
                  padding: '0 16px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />

              <Input
                name="phone"
                type="tel"
                placeholder="手机号码"
                value={formData.phone}
                onChange={handleInputChange}
                required
                pattern="^1[3-9]\d{9}$"
                style={{
                  height: '56px',
                  fontSize: '18px',
                  background: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: '12px',
                  padding: '0 16px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />

              <Input
                name="password"
                type="password"
                placeholder="密码（至少6位）"
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
                  padding: '0 16px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />

              <Input
                name="confirmPassword"
                type="password"
                placeholder="确认密码"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                minLength={6}
                style={{
                  height: '56px',
                  fontSize: '18px',
                  background: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: '12px',
                  padding: '0 16px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* 用户协议 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '0 8px' }}>
              <input
                type="checkbox"
                required
                style={{
                  marginTop: '4px',
                  borderRadius: '4px',
                  borderColor: '#d1d5db',
                  color: '#059669'
                }}
              />
              <span style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
                我已阅读并同意
                <a href="#" style={{ color: '#059669', textDecoration: 'none', margin: '0 4px' }}>
                  《用户协议》
                </a>
                和
                <a href="#" style={{ color: '#059669', textDecoration: 'none', marginLeft: '4px' }}>
                  《隐私政策》
                </a>
              </span>
            </div>

            {/* 注册按钮 */}
            <Button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '56px',
                fontSize: '18px',
                fontWeight: '600',
                background: 'linear-gradient(to right, #059669, #0d9488)',
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
                  <span>注册中...</span>
                </div>
              ) : (
                "立即注册，获得 5 点数"
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

          {/* 登录链接 */}
          <div style={{ textAlign: 'center' }}>
            <span style={{ color: '#6b7280' }}>
              已有账户？
            </span>
            <Link
              href="/login"
              style={{
                marginLeft: '8px',
                color: '#059669',
                fontWeight: '600',
                textDecoration: 'none'
              }}
            >
              立即登录
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