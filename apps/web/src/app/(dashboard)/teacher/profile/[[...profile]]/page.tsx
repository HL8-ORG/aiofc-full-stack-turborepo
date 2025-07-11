'use client';

import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PencilIcon } from 'lucide-react';
import Header from '@/components/Header';
import { useAuthStore } from '@/stores/authStore';
import { updateProfile } from '@/services/authService'; // ✅ 直接调用 API

const UserProfilePage = () => {
  const { user, setUser } = useAuthStore(); // ✅ Zustand 状态管理
  const [name, setName] = useState('');

  useEffect(() => {
    if (user?.username) {
      setName(user.username);
    }
  }, [user?.username]);

  // ✅ 更新名称输入值
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  // ✅ 调用个人资料更新 API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const updatedUser = await updateProfile({ id: user.id, username: name });
      setUser(updatedUser); // ✅ 更新 Zustand 状态
      alert('个人资料更新成功！');
    } catch (error) {
      console.error('个人资料更新失败:', error);
      alert('个人资料更新失败。');
    }
  };

  return (
    <div className="user-courses">
      <Header title="My Profile" subtitle="View your enrolled courses" />
      <div className="user-courses__grid">
        <Card className="bg-gray-900 text-white shadow-lg">
          <CardHeader className="border-b border-gray-700">
            <CardTitle className="text-lg font-semibold">Profile</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* 头像和个人信息 */}
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 border-2 border-gray-600">
                  <AvatarImage src={user?.avatar ?? ''} alt="Profile" />
                  <AvatarFallback className="text-lg font-bold">{user?.username?.charAt(0) ?? 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-semibold">{user?.username || 'No Name'}</h2>
                  <p className="text-gray-400">{user?.email || 'No Email'}</p>
                  <span className="text-gray-500 bg-gray-800 px-3 py-1 rounded-md text-sm inline-block">
                    {user?.role || 'USER'}
                  </span>
                </div>
              </div>

              {/* 个人资料编辑部分 */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-gray-300 mb-2 block">Name</label>
                  <div className="relative">
                    <Input
                      type="text"
                      name="name"
                      value={name}
                      onChange={handleChange}
                      className="w-full pr-10"
                      required
                    />
                    <PencilIcon className="h-5 w-5 text-gray-400 absolute right-3 top-3" />
                  </div>
                </div>
              </div>

              {/* 保存按钮 */}
              <div className="flex justify-end">
                <Button type="submit" variant="default" className="px-4 py-2 shadow-md w-36">
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserProfilePage;
