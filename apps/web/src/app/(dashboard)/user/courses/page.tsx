'use client';

import Toolbar from '@/components/Toolbar';
import CourseCard from '@/components/CourseCard';
import { useGetUserEnrolledCoursesQuery } from '@/state/api';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

import { useState, useMemo, useEffect } from 'react';
import Loading from '@/components/Loading';
import { useAuthStore } from '@/stores/authStore';

const Courses = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 为调试记录用户信息
  useEffect(() => {
    console.log('🔍 课程页面 - 当前用户信息:', {
      user,
      userId: user?.id,
      id: user?.id,
      email: user?.email
    });
  }, [user]);

  const {
    data: courses,
    isLoading,
    isError,
    error,
  } = useGetUserEnrolledCoursesQuery(user?.id ?? '', {
    skip: !user?.id, // 如果没有userId则跳过查询
  });

  // 错误详细日志
  useEffect(() => {
    if (isError) {
      console.error('❌ getUserEnrolledCourses 错误:', error);
    }
  }, [isError, error]);

  const filteredCourses = useMemo(() => {
    if (!courses) return [];

    return courses.filter((course) => {
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [courses, searchTerm, selectedCategory]);

  const handleGoToCourse = (course: Course) => {
    if (course?.sections && course?.sections?.length > 0 && course?.sections[0].chapters?.length > 0) {
      const firstChapter = course.sections[0].chapters[0];
      router.push(`/user/courses/${course.courseId}/chapters/${firstChapter.chapterId}`, {
        scroll: false,
      });
    } else {
      console.error('未找到课程的章节:', course);
      router.push(`/user/courses/${course.courseId}`, {
        scroll: false,
      });
    }
  };

  if (isLoading) return <Loading />;

  if (!user) {
    console.log('⚠️ 没有用户信息 - 重定向到登录页面');
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-xl font-semibold">需要登录</h2>
        <p className="text-muted-foreground">请登录以查看您正在学习的课程。</p>
        <button
          onClick={() => router.push('/signin')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          去登录
        </button>
      </div>
    );
  }

  if (!user.id) {
    console.log('⚠️ 没有userId:', user);
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-xl font-semibold">用户信息错误</h2>
        <p className="text-muted-foreground">用户信息有问题，请重新登录。</p>
        <button
          onClick={() => router.push('/signin')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          重新登录
        </button>
      </div>
    );
  }

  if (isError) {
    console.error('❌ 课程列表加载错误:', error);
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-xl font-semibold">无法加载课程列表</h2>
        <p className="text-muted-foreground">发生网络错误，请刷新页面。</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          刷新
        </button>
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="user-courses">
        <Header title="My Courses" subtitle="View your enrolled courses" />
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <h2 className="text-xl font-semibold">您还没有在学习的课程</h2>
          <p className="text-muted-foreground">快去找一门新课程学习吧！</p>
          <button
            onClick={() => router.push('/search')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            查找课程
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-courses">
      <Header title="My Courses" subtitle="View your enrolled courses" />
      <Toolbar onSearch={setSearchTerm} onCategoryChange={setSelectedCategory} />
      <div className="user-courses__grid">
        {filteredCourses.map((course) => (
          <CourseCard key={course.courseId} course={course} onGoToCourse={handleGoToCourse} />
        ))}
      </div>
    </div>
  );
};

export default Courses;
