"use client";

import Header from "@/components/Header";
import Loading from "@/components/Loading";
import TeacherCourseCard from "@/components/TeacherCourseCard";
import Toolbar from "@/components/Toolbar";
import { Button } from "@/components/ui/button";
import {
  useCreateCourseMutation,
  useDeleteCourseMutation,
  useGetCoursesQuery,
} from "@/state/api";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";

// 类型定义 (临时)
interface Course {
  courseId: string;
  title: string;
  category: string;
  level: string;
  teacherId: string;
  status: string;
}

/**
 * 📚 教师课程管理页面内容 (用于动态加载)
 * 
 * 🚀 性能优化:
 * - 通过记忆化防止不必要的重渲染
 * - 状态管理优化
 * - 事件处理器优化
 */
const TeacherCoursesContent = React.memo(() => {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    data: courses,
    isLoading,
    isError,
  } = useGetCoursesQuery({ category: "all" });

  const [createCourse] = useCreateCourseMutation();
  const [deleteCourse] = useDeleteCourseMutation();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // 🚀 使用记忆化防止不必要的过滤
  const filteredCourses = useMemo(() => {
    if (!courses) return [];

    return courses.filter((course) => {
      const matchesSearch = course.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || course.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [courses, searchTerm, selectedCategory]);

  // 🚀 事件处理器记忆化
  const handleEdit = useMemo(() => (course: Course) => {
    router.push(`/teacher/courses/${course.courseId}`, {
      scroll: false,
    });
  }, [router]);

  const handleDelete = useMemo(() => async (course: Course) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      await deleteCourse(course.courseId).unwrap();
    }
  }, [deleteCourse]);

  const handleCreateCourse = useMemo(() => async () => {
    if (!user) return;

    try {
      const result = await createCourse({
        teacherId: user.id,
        teacherName: user.username || "Unknown Teacher",
        title: "新课程",
        category: "其他",
        level: "Beginner",
        description: "这是一个新创建的课程。请编辑内容。",
        status: "Draft",
      }).unwrap();

      router.push(`/teacher/courses/${result.courseId}`, {
        scroll: false,
      });
    } catch (error) {
      console.error('课程创建失败:', error);
    }
  }, [user, createCourse, router]);

  // 🚀 提前返回以防止不必要的渲染
  if (isLoading) return <Loading />;
  if (isError || !courses) return <div>Error loading courses.</div>;

  return (
    <div className="teacher-courses">
      <Header
        title="Courses"
        subtitle="Browse your courses"
        rightElement={
          <Button
            onClick={handleCreateCourse}
            className="teacher-courses__header"
          >
            Create Course
          </Button>
        }
      />
      <Toolbar
        onSearch={setSearchTerm}
        onCategoryChange={setSelectedCategory}
      />
      <div className="teacher-courses__grid">
        {filteredCourses.map((course) => (
          <TeacherCourseCard
            key={course.courseId}
            course={course}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isOwner={course.teacherId === user?.id}
          />
        ))}
      </div>
    </div>
  );
});

TeacherCoursesContent.displayName = 'TeacherCoursesContent';

export default TeacherCoursesContent;