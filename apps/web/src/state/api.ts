import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { BaseQueryApi, FetchArgs } from '@reduxjs/toolkit/query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { refreshAccessToken } from '@/services/authService';

const customBaseQuery = async (args: string | FetchArgs, api: BaseQueryApi, extraOptions: any) => {
  // 🔧 API URL 配置明确化
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
  
  console.log('🔍 API 配置信息:');
  console.log('  - Base URL:', baseUrl);
  console.log('  - 环境变量 NEXT_PUBLIC_API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
  console.log('  - 请求 URL:', typeof args === 'string' ? args : args.url);
  console.log('  - 最终请求路径:', typeof args === 'string' ? `${baseUrl}/${args}` : `${baseUrl}/${args.url}`);

  const baseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      const token = useAuthStore.getState().accessToken;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        console.log('🔑 API 调用已添加令牌');
        console.log('🔑 令牌预览:', token.substring(0, 30) + '...');
      } else {
        console.log('⚠️ API 调用时没有令牌');
      }
      return headers;
    },
  });

  try {
    console.log('📤 API 请求开始:', typeof args === 'string' ? args : args);
    const result: any = await baseQuery(args, api, extraOptions);
    console.log('📥 API 响应收到:', {
      status: result.meta?.response?.status,
      hasError: !!result.error,
      hasData: !!result.data
    });

    if (result.error) {
      const errorData = result.error.data;
      const errorMessage = errorData?.message || result.error.status.toString() || 'An error occurred';
      console.error('❌ API 错误:', {
        url: typeof args === 'string' ? args : args.url,
        fullUrl: typeof args === 'string' ? `${baseUrl}/${args}` : `${baseUrl}/${args.url}`,
        status: result.error.status,
        message: errorMessage,
        errorData
      });
      toast.error(`Error: ${errorMessage}`);
    }

    const isMutationRequest = (args as FetchArgs).method && (args as FetchArgs).method !== 'GET';

    if (isMutationRequest) {
      const successMessage = result.data?.message;
      if (successMessage) toast.success(successMessage);
    }

    if (result.data) {
      result.data = result.data.data;
    } else if (result.error?.status === 204 || result.meta?.response?.status === 204) {
      return { data: null };
    }

    // 如果响应为空或是空对象则添加默认值
    if (!result.data && !result.error) {
      return { data: {} };
    }

    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ API 请求过程中发生异常:', errorMessage);
    return { error: { status: 'FETCH_ERROR', error: errorMessage } };
  }
};

const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  const { logout, setToken } = useAuthStore.getState();
  let result = await customBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    console.warn('🔄 访问令牌过期，尝试刷新...');

    // ✅ 刷新令牌请求
    const refreshResult = await refreshAccessToken();

    if (refreshResult && refreshResult.token) {
      console.log('✅ 令牌刷新成功!');

      // ✅ 重试原始请求
      result = await customBaseQuery(args, api, extraOptions);
    } else {
      console.error('❌ 刷新失败，正在登出...');
      api.dispatch(logout());
    }
  }

  return result;
};

export const api = createApi({
  baseQuery: baseQueryWithReauth,
  reducerPath: 'api',
  tagTypes: ['Courses', 'Users', 'UserCourseProgress'],
  endpoints: (build) => ({
    /* 
    ===============
    USER CLERK
    =============== 
    */
    updateUser: build.mutation<User, Partial<User> & { userId: string }>({
      query: ({ userId, ...updatedUser }) => ({
        url: `users/${userId}`,
        method: 'PATCH',
        body: updatedUser,
      }),
      invalidatesTags: ['Users'],
    }),

    /* 
    ===============
    COURSES
    =============== 
    */
    getCourses: build.query<Course[], { category?: string }>({
      query: ({ category }) => ({
        url: 'courses',
        params: { category },
      }),
      providesTags: ['Courses'],
    }),

    getCourse: build.query<Course, string>({
      query: (id) => `courses/${id}`,
      providesTags: (result, error, id) => [{ type: 'Courses', id }],
    }),

    createCourse: build.mutation<Course, {
      teacherId: string;
      teacherName: string;
      title: string;
      category: string;
      level: 'Beginner' | 'Intermediate' | 'Advanced';
      description?: string;
      price?: number;
      status?: 'Draft' | 'Published';
      image?: string;
    }>({
      query: (body) => ({
        url: `courses`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Courses'],
    }),

    updateCourse: build.mutation<Course, { courseId: string; formData: FormData }>({
      query: ({ courseId, formData }) => {
        console.log('📚 更新课程 API mutation 开始:');
        console.log('  - 课程 ID:', courseId);
        console.log('  - FormData 类型:', formData.constructor.name);
        
        // FormData 内容日志 (调试用)
        console.log('  - FormData 内容:');
        for (const [key, value] of formData.entries()) {
          if (typeof value === 'string') {
            console.log(`    ${key}: ${value.length > 50 ? value.substring(0, 50) + '...' : value}`);
          } else {
            console.log(`    ${key}: [File] ${(value as File).name}`);
          }
        }
        
        return {
          url: `courses/${courseId}`,
          method: 'PUT',
          body: formData,
        };
      },
      invalidatesTags: (result, error, { courseId }) => {
        console.log('🔄 更新课程缓存失效:', courseId);
        return [{ type: 'Courses', id: courseId }];
      },
    }),

    deleteCourse: build.mutation<{ message: string }, string>({
      query: (courseId) => ({
        url: `courses/${courseId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Courses'],
    }),

    getUploadVideoUrl: build.mutation<
      { uploadUrl: string; videoUrl: string },
      {
        courseId: string;
        chapterId: string;
        sectionId: string;
        fileName: string;
        fileType: string;
      }
    >({
      query: ({ courseId, sectionId, chapterId, fileName, fileType }) => ({
        url: `courses/${courseId}/sections/${sectionId}/chapters/${chapterId}/get-upload-url`,
        method: 'POST',
        body: { fileName, fileType },
      }),
    }),

    /* 
    ===============
    TRANSACTIONS
    =============== 
    */
    getTransactions: build.query<Transaction[], string>({
      query: (userId) => {
        console.log('🔍 获取交易调用 - userId:', userId);
        if (!userId) {
          console.error('❌ 由于没有 userId，跳过 API 调用');
          throw new Error('需要 userId');
        }
        return `transactions?userId=${userId}`;
      },
    }),
    createStripePaymentIntent: build.mutation<{ clientSecret: string }, { amount: number; courseId: string }>({
      query: ({ amount, courseId }) => ({
        url: `/transactions/stripe/payment-intent`,
        method: 'POST',
        body: { amount, courseId }, // 添加 courseId 字段
      }),
    }),
    createTransaction: build.mutation<Transaction, Partial<Transaction>>({
      query: (transaction) => ({
        url: 'transactions',
        method: 'POST',
        body: transaction,
      }),
    }),

    /* 
    ===============
    USER COURSE PROGRESS
    =============== 
    */
    getUserEnrolledCourses: build.query<Course[], string>({
      query: (userId) => {
        console.log('🔍 获取用户已报名课程调用 - userId:', userId);
        if (!userId) {
          console.error('❌ 由于没有 userId，跳过 API 调用');
          throw new Error('需要 userId');
        }
        return `users/course-progress/${userId}/enrolled-courses`;
      },
      providesTags: ['Courses', 'UserCourseProgress'],
    }),

    getUserCourseProgress: build.query<UserCourseProgress, { userId: string; courseId: string }>({
      query: ({ userId, courseId }) => {
        console.log('🔍 获取用户课程进度调用 - userId:', userId, 'courseId:', courseId);
        if (!userId || !courseId) {
          console.error('❌ 由于没有 userId 或 courseId，跳过 API 调用');
          throw new Error('需要 userId 和 courseId');
        }
        return `users/course-progress/${userId}/courses/${courseId}`;
      },
      providesTags: ['UserCourseProgress'],
    }),

    updateUserCourseProgress: build.mutation<
      UserCourseProgress,
      {
        userId: string;
        courseId: string;
        progressData: {
          sections: SectionProgress[];
        };
      }
    >({
      query: ({ userId, courseId, progressData }) => ({
        url: `users/course-progress/${userId}/courses/${courseId}`,
        method: 'PUT',
        body: progressData,
      }),
      invalidatesTags: ['UserCourseProgress'],
      async onQueryStarted({ userId, courseId, progressData }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          api.util.updateQueryData('getUserCourseProgress', { userId, courseId }, (draft) => {
            Object.assign(draft, {
              ...draft,
              sections: progressData.sections,
            });
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
  }),
});

export const {
  useUpdateUserMutation,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  useGetCoursesQuery,
  useGetCourseQuery,
  useGetUploadVideoUrlMutation,
  useGetTransactionsQuery,
  useCreateTransactionMutation,
  useCreateStripePaymentIntentMutation,
  useGetUserEnrolledCoursesQuery,
  useGetUserCourseProgressQuery,
  useUpdateUserCourseProgressMutation,
} = api;
