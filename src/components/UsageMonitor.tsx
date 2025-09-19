'use client';

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, BarChart3, Filter } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface UsageDataPoint {
  date: string;
  amount: number;
  timestamp: number;
}

interface UsageMonitorData {
  dataPoints: UsageDataPoint[];
  totalUsage: number;
  apiKey: string;
  startTime?: string;
  endTime?: string;
  deductionType?: number;
  deductionSubtype?: number;
}

interface UsageMonitorProps {
  /** 是否为管理员模式 */
  isAdmin?: boolean;
  /** 用户的API密钥（用户模式下使用） */
  userApiKey?: string;
  /** API基础URL */
  apiBaseUrl: string;
}

/**
 * 用量监控组件
 * 支持折线图展示和多维度筛选
 */
export default function UsageMonitor({ isAdmin = false, userApiKey, apiBaseUrl }: UsageMonitorProps) {
  const [data, setData] = useState<UsageMonitorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 筛选条件
  const [filters, setFilters] = useState({
    apiKey: userApiKey || '',
    deductionType: '',
    deductionSubtype: '',
    startDate: '',
    endDate: '',
    dateRange: '30' // 默认30天
  });
  
  // 扣减类型和子类型的选项
  const deductionTypes = [
    { value: '1', label: 'API调用' },
    { value: '2', label: '文件处理' },
    { value: '3', label: '数据分析' },
    { value: '4', label: '其他服务' }
  ];
  
  const deductionSubtypes = {
    '1': [
      { value: '101', label: '文本生成' },
      { value: '102', label: '图像识别' },
      { value: '103', label: '语音转换' }
    ],
    '2': [
      { value: '201', label: '文档转换' },
      { value: '202', label: '图片压缩' },
      { value: '203', label: '视频处理' }
    ],
    '3': [
      { value: '301', label: '数据挖掘' },
      { value: '302', label: '统计分析' },
      { value: '303', label: '机器学习' }
    ],
    '4': [
      { value: '401', label: '存储服务' },
      { value: '402', label: '计算服务' },
      { value: '403', label: '网络服务' }
    ]
  };
  
  /**
   * 获取用量监控数据
   */
  const fetchUsageData = async () => {
    if (!filters.apiKey && !userApiKey) {
      setError('请输入API密钥');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const queryApiKey = filters.apiKey || userApiKey || '';
      
      let url: string;
      let requestOptions: RequestInit;
      
      if (isAdmin) {
        // 管理员模式：使用POST请求
        url = `${apiBaseUrl}/api/points/usage/monitor`;
        
        const requestBody = {
          apiKey: queryApiKey,
          deductionType: filters.deductionType ? parseInt(filters.deductionType) : null,
          deductionSubtype: filters.deductionSubtype ? parseInt(filters.deductionSubtype) : null,
          startTime: filters.startDate ? new Date(filters.startDate).toISOString() : null,
          endTime: filters.endDate ? new Date(filters.endDate).toISOString() : null
        };
        
        requestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        };
      } else {
        // 用户模式：使用GET请求
        const params = new URLSearchParams({
          apiKey: queryApiKey
        });
        
        if (filters.deductionType) {
          params.append('deductionType', filters.deductionType);
        }
        if (filters.deductionSubtype) {
          params.append('deductionSubtype', filters.deductionSubtype);
        }
        if (filters.startDate) {
          params.append('startTime', new Date(filters.startDate).toISOString());
        }
        if (filters.endDate) {
          params.append('endTime', new Date(filters.endDate).toISOString());
        }
        
        url = `${apiBaseUrl}/api/points/usage/my-monitor?${params.toString()}`;
        requestOptions = {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        };
      }
      
      const response = await fetch(url, requestOptions);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.message || '获取数据失败');
      }
    } catch (err) {
      console.error('获取用量数据失败:', err);
      setError('网络请求失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * 设置快速日期范围
   */
  const setQuickDateRange = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    setFilters(prev => ({
      ...prev,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dateRange: days.toString()
    }));
  };
  
  /**
   * 重置筛选条件
   */
  const resetFilters = () => {
    setFilters({
      apiKey: userApiKey || '',
      deductionType: '',
      deductionSubtype: '',
      startDate: '',
      endDate: '',
      dateRange: '30'
    });
    setData(null);
    setError(null);
  };
  
  /**
   * 格式化图表数据
   */
  const formatChartData = (dataPoints: UsageDataPoint[]) => {
    return dataPoints.map(point => ({
      date: new Date(point.date).toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
      }),
      amount: point.amount,
      fullDate: point.date
    }));
  };
  
  // 初始加载
  useEffect(() => {
    if (userApiKey && !isAdmin) {
      setQuickDateRange(30);
    }
  }, [userApiKey, isAdmin]);
  
  // 当筛选条件改变时自动查询（仅用户模式）
  useEffect(() => {
    if (!isAdmin && userApiKey && filters.startDate && filters.endDate) {
      fetchUsageData();
    }
  }, [filters.startDate, filters.endDate, filters.deductionType, filters.deductionSubtype]);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 筛选条件 */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
      >
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 'bold',
            color: '#2563EB',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Filter style={{ width: '20px', height: '20px' }} />
          筛选条件
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
            }}
          >
            {/* API密钥输入（仅管理员模式） */}
            {isAdmin && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                  }}
                >
                  API密钥
                </label>
                <input
                  type="text"
                  placeholder="请输入用户的API密钥"
                  value={filters.apiKey}
                  onChange={(e) => setFilters(prev => ({ ...prev, apiKey: e.target.value }))}
                  style={{
                    height: '42px',
                    padding: '0 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                  }}
                />
              </div>
            )}
            
            {/* 扣减类型 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                }}
              >
                扣减类型
              </label>
              <select
                value={filters.deductionType}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  deductionType: e.target.value,
                  deductionSubtype: '' // 重置子类型
                }))}
                style={{
                  height: '42px',
                  padding: '0 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '15px',
                  outline: 'none',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                }}
              >
                <option value="">全部类型</option>
                {deductionTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 扣减子类型 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                }}
              >
                扣减子类型
              </label>
              <select
                value={filters.deductionSubtype}
                onChange={(e) => setFilters(prev => ({ ...prev, deductionSubtype: e.target.value }))}
                disabled={!filters.deductionType}
                style={{
                  height: '42px',
                  padding: '0 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '15px',
                  outline: 'none',
                  backgroundColor: filters.deductionType ? 'white' : '#F3F4F6',
                  cursor: filters.deductionType ? 'pointer' : 'not-allowed',
                  opacity: filters.deductionType ? 1 : 0.6,
                }}
              >
                <option value="">全部子类型</option>
                {filters.deductionType && deductionSubtypes[filters.deductionType as keyof typeof deductionSubtypes]?.map(subtype => (
                  <option key={subtype.value} value={subtype.value}>
                    {subtype.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 开始日期 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                }}
              >
                开始日期
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                style={{
                  height: '42px',
                  padding: '0 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>
            
            {/* 结束日期 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                }}
              >
                结束日期
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                style={{
                  height: '42px',
                  padding: '0 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>
          </div>
          
          {/* 快速日期选择 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>快速选择：</span>
            {[7, 15, 30, 60, 90].map(days => (
              <button
                key={days}
                onClick={() => setQuickDateRange(days)}
                style={{
                  padding: '6px 12px',
                  border: filters.dateRange === days.toString() ? 'none' : '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  backgroundColor: filters.dateRange === days.toString() ? '#2563EB' : 'white',
                  color: filters.dateRange === days.toString() ? 'white' : '#374151',
                  transition: 'all 0.2s',
                }}
              >
                {days}天
              </button>
            ))}
          </div>
          
          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={fetchUsageData}
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: loading ? '#9CA3AF' : '#2563EB',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              {loading ? '查询中...' : '查询数据'}
            </button>
            <button
              onClick={resetFilters}
              style={{
                padding: '10px 20px',
                background: 'white',
                color: '#374151',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              重置筛选
            </button>
          </div>
        </div>
      </div>
      
      {/* 错误提示 */}
      {error && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '1rem',
            padding: '1.5rem',
          }}
        >
          <p style={{ color: '#DC2626', margin: 0 }}>{error}</p>
        </div>
      )}
      
      {/* 数据展示 */}
       {data && (
         <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           {/* 统计概览 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
            }}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '1rem',
                padding: '1.5rem',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <h4 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', margin: 0 }}>总消耗点数</h4>
                <TrendingUp style={{ width: '16px', height: '16px', color: '#6B7280' }} />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.25rem' }}>
                {data.totalUsage?.toLocaleString() || 0}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0 }}>
                查询时间范围内的总消耗
              </p>
            </div>
            
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '1rem',
                padding: '1.5rem',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <h4 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', margin: 0 }}>平均日消耗</h4>
                <BarChart3 style={{ width: '16px', height: '16px', color: '#6B7280' }} />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.25rem' }}>
                {data.dataPoints.length > 0 
                  ? Math.round((data.totalUsage || 0) / data.dataPoints.length).toLocaleString()
                  : 0
                }
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0 }}>
                基于查询期间的平均值
              </p>
            </div>
            
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '1rem',
                padding: '1.5rem',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <h4 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', margin: 0 }}>数据点数量</h4>
                <Calendar style={{ width: '16px', height: '16px', color: '#6B7280' }} />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.25rem' }}>
                {data.dataPoints.length}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0 }}>
                有消耗记录的天数
              </p>
            </div>
          </div>
          
          {/* 折线图 */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '1rem',
              padding: '1.5rem',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: 'bold',
                color: '#2563EB',
                marginBottom: '1rem',
                margin: '0 0 1rem 0',
              }}
            >
              用量趋势图
            </h3>
            <div style={{ height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formatChartData(data.dataPoints)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return payload[0].payload.fullDate;
                      }
                      return label;
                    }}
                    formatter={(value: number) => [value.toLocaleString(), '消耗点数']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
                    name="消耗点数"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
      
      {/* 无数据提示 */}
      {!loading && !error && !data && (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '1rem',
            padding: '3rem 1.5rem',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            textAlign: 'center',
          }}
        >
          <BarChart3 style={{ width: '48px', height: '48px', color: '#9CA3AF', margin: '0 auto 1rem' }} />
          <p style={{ color: '#6B7280', margin: 0 }}>请设置筛选条件并点击查询按钮获取用量数据</p>
        </div>
      )}
    </div>
  );
}