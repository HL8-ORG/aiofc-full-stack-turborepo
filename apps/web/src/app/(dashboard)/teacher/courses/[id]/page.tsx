'use client';

import { CustomFormField } from '@/components/CustomFormField';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { courseSchema } from '@/lib/schemas';
import { centsToDollars, createCourseFormData, uploadAllVideos, logFormData } from '@/lib/utils';
import { openSectionModal, setSections } from '@/state';
import { useGetCourseQuery, useUpdateCourseMutation, useGetUploadVideoUrlMutation } from '@/state/api';
import { useAppDispatch, useAppSelector } from '@/state/redux';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import DroppableComponent from './Droppable';
import ChapterModal from './ChapterModal';
import SectionModal from './SectionModal';
import DebugInfo from '@/components/DebugInfo';

const CourseEditor = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { data: course, isLoading, refetch } = useGetCourseQuery(id);
  const [updateCourse] = useUpdateCourseMutation();
  const [getUploadVideoUrl] = useGetUploadVideoUrlMutation();

  // 用于管理提交状态的本地state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dispatch = useAppDispatch();
  const { sections } = useAppSelector((state) => state.global.courseEditor);

  const methods = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      courseTitle: '',
      courseDescription: '',
      courseCategory: '',
      coursePrice: '0',
      courseStatus: false,
    },
  });

  useEffect(() => {
    if (course) {
      methods.reset({
        courseTitle: course.title,
        courseDescription: course.description,
        courseCategory: course.category,
        coursePrice: centsToDollars(course.price),
        courseStatus: course.status === 'Published',
      });
      dispatch(setSections(course.sections || []));
    }
  }, [course, methods]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: CourseFormData) => {
    console.log('🚀 开始提交:', data);
    console.log('📋 当前章节数据:', sections);
    console.log('🆔 课程ID:', id);

    // 防止重复提交
    if (isSubmitting) {
      console.log('⚠️ 正在提交中，忽略此次操作');
      return;
    }

    // 基本验证
    if (!id) {
      console.error('❌ 没有课程ID!');
      alert('没有课程ID。请刷新页面。');
      return;
    }

    // 首先检查表单验证
    const formErrors = methods.formState.errors;
    if (Object.keys(formErrors).length > 0) {
      console.error('❌ 表单验证失败:', formErrors);
      alert('表单有错误。请正确填写所有字段。');
      return;
    }

    // 必填字段检查
    if (!data.courseTitle?.trim()) {
      console.error('❌ 课程标题为空。');
      alert('请输入课程标题。');
      return;
    }

    // 设置提交状态
    setIsSubmitting(true);

    try {
      console.log('📹 开始上传视频...');
      const updatedSections = await uploadAllVideos(sections, id, getUploadVideoUrl);
      console.log('✅ 视频上传完成:', updatedSections);

      console.log('📦 正在创建FormData...');
      const formData = createCourseFormData(data, updatedSections);

      // 检查FormData内容（使用辅助函数）
      logFormData(formData, '已创建的FormData');

      // FormData验证
      const requiredFields = ['title', 'description', 'category', 'price', 'status'];
      const missingFields: string[] = [];

      for (const field of requiredFields) {
        const value = formData.get(field);
        if (!value || (typeof value === 'string' && !value.trim())) {
          missingFields.push(field);
        }
      }

      if (missingFields.length > 0) {
        console.error('❌ FormData验证失败:', missingFields);
        alert(`缺少必填字段: ${missingFields.join(', ')}`);
        return;
      }

      console.log('🔄 开始调用API...');
      console.log('🆔 课程ID:', id);

      const result = await updateCourse({
        courseId: id,
        formData,
      }).unwrap();

      console.log('✅ API调用成功!');
      console.log('📋 响应数据:', result);

      console.log('🔄 正在重新加载数据...');
      await refetch();
      console.log('✅ 课程更新完成!');

      // 成功提示
      alert('课程已成功更新！');
    } catch (error: any) {
      console.error('❌ 课程更新失败:', error);
      console.error('❌ 错误详情:', error?.data || error);

      // 构建详细错误信息
      let errorMessage = '发生未知错误。';

      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.status) {
        errorMessage = `HTTP ${error.status} 错误。`;
      } else if (error?.error) {
        errorMessage = error.error;
      }

      console.error('🚨 最终错误信息:', errorMessage);
      alert(`课程更新失败: ${errorMessage}`);
    } finally {
      // 重置提交状态
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-5 mb-5">
        <button
          className="flex items-center border rounded-lg p-2 gap-2 cursor-pointer transition-colors duration-200 border-border text-text-medium hover:bg-hover-bg hover:text-foreground"
          onClick={() => router.push('/teacher/courses', { scroll: false })}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回课程列表</span>
        </button>
      </div>

      <Form {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <Header
            title="课程设置"
            subtitle="完成所有字段并保存您的课程"
            rightElement={
              <div className="flex items-center space-x-4">
                <CustomFormField
                  name="courseStatus"
                  label={methods.watch('courseStatus') ? '已发布' : '草稿'}
                  type="switch"
                  className="flex items-center space-x-2"
                  labelClassName={`text-sm font-medium ${methods.watch('courseStatus') ? 'text-green-500' : 'text-yellow-500'
                    }`}
                  inputClassName="data-[state=checked]:bg-green-500"
                />
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
                  disabled={isSubmitting || methods.formState.isSubmitting}
                  onClick={(e) => {
                    console.log('💥 按钮点击事件触发!');
                    console.log('📋 按钮类型:', e.currentTarget.type);
                    console.log('💆 按钮被点击:', methods.watch('courseStatus') ? '更新已发布课程' : '保存草稿');
                    console.log('📝 当前表单状态:', methods.getValues());
                    console.log('🔍 表单验证状态:', methods.formState.isValid);
                    console.log('🔍 表单错误:', methods.formState.errors);
                    console.log('🔍 当前提交状态:', methods.formState.isSubmitting);

                    // 阻止事件传播（防止重复调用）
                    e.preventDefault();
                    e.stopPropagation();

                    // 手动触发表单提交（确认事件正常工作）
                    if (!isSubmitting && !methods.formState.isSubmitting) {
                      console.log('🚀 手动触发表单提交...');
                      const formData = methods.getValues();
                      onSubmit(formData);
                    } else {
                      console.log('⚠️ 正在提交中，忽略此次操作');
                    }
                  }}
                >
                  {(isSubmitting || methods.formState.isSubmitting)
                    ? '更新中...'
                    : (methods.watch('courseStatus') ? '更新已发布课程' : '保存草稿')
                  }
                </Button>
              </div>
            }
          />

          <div className="flex justify-between md:flex-row flex-col gap-10 mt-5 font-dm-sans">
            <div className="basis-1/2">
              <div className="space-y-4">
                <CustomFormField
                  name="courseTitle"
                  label="课程标题"
                  type="text"
                  placeholder="在此输入课程标题"
                  className="border-none themed-input"
                  initialValue={course?.title}
                />

                <CustomFormField
                  name="courseDescription"
                  label="课程描述"
                  type="textarea"
                  placeholder="在此输入课程描述"
                  initialValue={course?.description}
                  className="border-none themed-input"
                />

                <CustomFormField
                  className="border-none themed-input"
                  name="courseCategory"
                  label="课程分类"
                  type="select"
                  placeholder="在此选择分类"
                  options={[
                    { value: 'technology', label: '技术' },
                    { value: 'science', label: '科学' },
                    { value: 'mathematics', label: '数学' },
                    { value: 'devops', label: 'DevOps' },
                    { value: 'container', label: '容器' },
                    {
                      value: 'Artificial Intelligence',
                      label: '人工智能',
                    },
                  ]}
                  initialValue={course?.category}
                />

                <CustomFormField
                  className="border-none themed-input"
                  name="coursePrice"
                  label="课程价格"
                  type="number"
                  placeholder="0"
                  initialValue={course?.price}
                />
              </div>
            </div>

            <div className="bg-secondary-bg mt-4 md:mt-0 p-4 rounded-lg basis-1/2 border border-border">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-semibold text-foreground">章节</h2>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => dispatch(openSectionModal({ sectionIndex: null }))}
                  className="border-border text-primary hover:bg-accent hover:text-accent-foreground group"
                >
                  <Plus className="mr-1 h-4 w-4 text-primary group-hover:text-accent-foreground" />
                  <span className="text-primary group-hover:text-accent-foreground">添加章节</span>
                </Button>
              </div>

              {isLoading ? (
                <p className="text-text-medium">正在加载课程内容...</p>
              ) : sections.length > 0 ? (
                <DroppableComponent />
              ) : (
                <p className="text-text-medium">暂无章节</p>
              )}
            </div>
          </div>
        </form>
      </Form>

      <ChapterModal />
      <SectionModal />
      <DebugInfo />
    </div>
  );
};

export default CourseEditor;
