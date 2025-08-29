"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api";
import { getCompatibleApiUrl } from "@/config/api";

interface ForgotPasswordForm {
  phone: string;
  apiKey: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'phone' | 'reset'>('phone');
  const [formData, setFormData] = useState<ForgotPasswordForm>({
    phone: "",
    apiKey: "",
    newPassword: "",
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

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 验证手机号和API Key格式
      if (!formData.phone || !formData.apiKey) {
        setError("请填写完整的手机号和API密钥");
        setLoading(false);
        return;
      }

      // 调用后端API验证手机号和API Key
      const response = await fetch(`${getCompatibleApiUrl()}/auth/verify-phone-apikey`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: formData.phone,
          apiKey: formData.apiKey,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 验证成功，进入重置密码步骤
        setStep('reset');
        setSuccess("验证成功，请设置新密码");
      } else {
        setError(data.message || "验证失败，请检查手机号和API密钥");
      }
    } catch (err) {
      console.error("Phone verification error:", err);
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 验证密码一致性
    if (formData.newPassword !== formData.confirmPassword) {
      setError("两次输入的密码不一致");
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("密码长度至少为6位");
      setLoading(false);
      return;
    }

    try {
      // 调用重置密码API
      const response = await fetch(`${getCompatibleApiUrl()}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formData.phone,
          apiKey: formData.apiKey,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess("密码重置成功，正在跳转到登录页面...");
        // 立即跳转到登录页面
        router.push("/login");
      } else {
        setError(data.message || "密码重置失败");
      }
    } catch (err) {
      console.error("Password reset error:", err);
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
            <span style={{ color: 'white', fontSize: '24px' }}>🔓</span>
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

        {/* 重置密码卡片 */}
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
              {step === 'phone' ? '忘记密码' : '重置密码'}
            </h2>
            <p style={{ color: '#6b7280' }}>
              {step === 'phone' ? '请输入您的手机号码和API密钥' : '请设置新密码'}
            </p>
          </div>

          {/* 成功提示 */}
          {success && (
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              color: '#0369a1',
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

          {/* 步骤1：输入手机号和API Key */}
          {step === 'phone' && (
            <form onSubmit={handlePhoneSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input
                  name="phone"
                  type="tel"
                  placeholder="请输入手机号码"
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
                    padding: '0 16px'
                  }}
                />

                <Input
                  name="apiKey"
                  type="text"
                  placeholder="请输入您的API密钥"
                  value={formData.apiKey}
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
              </div>

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
                    <span>验证中...</span>
                  </div>
                ) : (
                  "验证手机号"
                )}
              </Button>
            </form>
          )}

          {/* 步骤2：重置密码 */}
          {step === 'reset' && (
            <form onSubmit={handlePasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input
                  name="newPassword"
                  type="password"
                  placeholder="请输入新密码（至少6位）"
                  value={formData.newPassword}
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

                <Input
                  name="confirmPassword"
                  type="password"
                  placeholder="请确认新密码"
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
                    padding: '0 16px'
                  }}
                />
              </div>

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
                    <span>重置中...</span>
                  </div>
                ) : (
                  "重置密码"
                )}
              </Button>
            </form>
          )}

          {/* 返回登录链接 */}
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Link
              href="/login"
              style={{
                color: '#2563eb',
                fontWeight: '600',
                textDecoration: 'none'
              }}
            >
              ← 返回登录
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
