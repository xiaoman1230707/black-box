import { useState } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { Credentail } from '@/types';
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate();
  const { login } = useUserStore();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState<Credentail>({
    name: "",
    password: ""
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value
    }));
    setError(''); // 清除错误
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name.trim();
    const password = formData.password.trim();
    if (!name || !password) return;
    setLoading(true);
    setError('');
    try {
      console.log('开始登录请求...');
      await login({ name, password });
      console.log('登录成功，准备跳转');
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error('登录失败:', err);
      setError(err?.response?.data?.message || err?.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="min-h-screen flex flex-col items-center 
    justify-center p-6 bg-white">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">登录</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            {/* 无障碍访问  for + id  for 关键字, react htmlFor */}
            <Label htmlFor="name">用户名</Label>
            <Input 
              id="name"
              placeholder='请输入用户名'
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            {/* 无障碍访问  for + id  for 关键字, react htmlFor */}
            <Label htmlFor="password">密码</Label>
            <Input 
              id="password"
              placeholder="请输入密码"
              type="password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !formData.name.trim() || !formData.password.trim()}
            className="w-full h-10 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
          {loading && <Loader2 className="h-4 w-4 animate-spin"/>}
          {loading ? '登录中...' : '立即登录'}
          </button>
          {error && (
            <p className="text-sm text-destructive text-center mt-2">{error}</p>
          )}
        </form>
        <Button variant="ghost" className="w-full" 
        onClick={() => navigate("/")}>暂不登录，回首页</Button>
      </div>
    </div>
  )
}