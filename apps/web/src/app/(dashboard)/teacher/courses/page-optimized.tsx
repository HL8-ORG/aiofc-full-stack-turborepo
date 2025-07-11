"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import Loading from "@/components/Loading";

// 使用动态导入实现代码分割
const TeacherCoursesContent = dynamic(
  () => import("@/components/pages/TeacherCoursesContent"),
  {
    loading: () => <Loading />,
    ssr: false,
  }
);

/**
 * 教师课程管理页面（优化版本）
 * 
 * 性能优化:
 * - 使用动态导入减少初始包大小
 * - 通过代码分割实现按需加载
 * - 使用 Suspense 实现平滑加载体验
 */
export default function TeacherCoursesPageOptimized() {
  return (
    <div className="teacher-courses-page-optimized">
      <Suspense fallback={<Loading />}>
        <TeacherCoursesContent />
      </Suspense>
    </div>
  );
}