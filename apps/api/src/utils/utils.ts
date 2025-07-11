import * as path from 'path';

export const updateCourseVideoInfo = (course: any, sectionId: string, chapterId: string, videoUrl: string) => {
  const section = course.sections?.find((s: any) => s.sectionId === sectionId);
  if (!section) {
    throw new Error(`Section not found: ${sectionId}`);
  }

  const chapter = section.chapters?.find((c: any) => c.chapterId === chapterId);
  if (!chapter) {
    throw new Error(`Chapter not found: ${chapterId}`);
  }

  chapter.video = videoUrl;
  chapter.type = 'Video';
};

export const validateUploadedFiles = (files: any) => {
  const allowedExtensions = ['.mp4', '.m3u8', '.mpd', '.ts', '.m4s'];
  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new Error(`Unsupported file type: ${ext}`);
    }
  }
};

export const getContentType = (filename: string) => {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.mp4':
      return 'video/mp4';
    case '.m3u8':
      return 'application/vnd.apple.mpegurl';
    case '.mpd':
      return 'application/dash+xml';
    case '.ts':
      return 'video/MP2T';
    case '.m4s':
      return 'video/iso.segment';
    default:
      return 'application/octet-stream';
  }
};

// Preserved HLS/DASH upload logic for future use
export const handleAdvancedVideoUpload = async (s3: any, files: any, uniqueId: string, bucketName: string) => {
  const isHLSOrDASH = files.some(
    (file: any) => file.originalname.endsWith('.m3u8') || file.originalname.endsWith('.mpd')
  );

  if (isHLSOrDASH) {
    // Handle HLS/MPEG-DASH Upload
    const uploadPromises = files.map((file: any) => {
      const s3Key = `videos/${uniqueId}/${file.originalname}`;
      return s3
        .upload({
          Bucket: bucketName,
          Key: s3Key,
          Body: file.buffer,
          ContentType: getContentType(file.originalname),
        })
        .promise();
    });
    await Promise.all(uploadPromises);

    // Determine manifest file URL
    const manifestFile = files.find(
      (file: any) => file.originalname.endsWith('.m3u8') || file.originalname.endsWith('.mpd')
    );
    const manifestFileName = manifestFile?.originalname || '';
    const videoType = manifestFileName.endsWith('.m3u8') ? 'hls' : 'dash';

    return {
      videoUrl: `${process.env.CLOUDFRONT_DOMAIN}/videos/${uniqueId}/${manifestFileName}`,
      videoType,
    };
  }

  return null; // Return null if not HLS/DASH to handle regular upload
};

export const mergeSections = (existingSections: any[], newSections: any[]): any[] => {
  // 防御性编程：如果不是数组则初始化为空数组
  const safeExistingSections = Array.isArray(existingSections) ? existingSections : [];
  const safeNewSections = Array.isArray(newSections) ? newSections : [];

  const existingSectionsMap = new Map<string, any>();

  // 将现有章节添加到Map中
  for (const existingSection of safeExistingSections) {
    // 检查对象是否有效（是否为对象而不是字符串）
    if (
      existingSection &&
      typeof existingSection === 'object' &&
      existingSection !== null &&
      typeof existingSection !== 'string' &&
      existingSection.sectionId
    ) {
      existingSectionsMap.set(existingSection.sectionId, existingSection);
    }
  }

  // 将新章节合并到Map中
  for (const newSection of safeNewSections) {
    if (
      newSection &&
      typeof newSection === 'object' &&
      newSection !== null &&
      typeof newSection !== 'string' &&
      newSection.sectionId
    ) {
      const section = existingSectionsMap.get(newSection.sectionId);
      if (!section) {
        // 添加新章节
        existingSectionsMap.set(newSection.sectionId, newSection);
      } else {
        // 再次检查现有章节是否为有效对象
        if (typeof section === 'object' && section !== null && typeof section !== 'string') {
          // 合并章节内的小节
          section.chapters = mergeChapters(section.chapters || [], newSection.chapters || []);
          existingSectionsMap.set(newSection.sectionId, section);
        } else {
          // 如果现有章节无效则替换为新章节
          existingSectionsMap.set(newSection.sectionId, newSection);
        }
      }
    }
  }

  return Array.from(existingSectionsMap.values());
};

// 安全的JSON解析和数据清理函数
export const safeParseProgressData = (rawData: any): any => {
  try {
    let parsedData = rawData;

    // 如果是字符串则尝试JSON解析
    if (typeof rawData === 'string') {
      // 清理损坏的JSON字符串（如不完整的']'数据）
      if (rawData.trim() === ']' || rawData.trim() === '[' || rawData.trim() === '') {
        return { sections: [] };
      }
      parsedData = JSON.parse(rawData);
    }

    // 如果是null或undefined
    if (!parsedData) {
      return { sections: [] };
    }

    // 确保基本结构
    return {
      sections: Array.isArray(parsedData.sections) ? parsedData.sections : [],
      ...parsedData,
    };
  } catch (error) {
    console.error('进度数据解析错误:', error, '原始数据:', rawData);
    return { sections: [] };
  }
};

export const mergeChapters = (existingChapters: any[], newChapters: any[]): any[] => {
  // 防御性编程：如果不是数组则初始化为空数组
  const safeExistingChapters = Array.isArray(existingChapters) ? existingChapters : [];
  const safeNewChapters = Array.isArray(newChapters) ? newChapters : [];

  const existingChaptersMap = new Map<string, any>();

  // 将现有小节添加到Map中
  for (const existingChapter of safeExistingChapters) {
    if (existingChapter && existingChapter.chapterId) {
      existingChaptersMap.set(existingChapter.chapterId, existingChapter);
    }
  }

  // 将新小节合并到Map中
  for (const newChapter of safeNewChapters) {
    if (newChapter && newChapter.chapterId) {
      existingChaptersMap.set(newChapter.chapterId, {
        ...(existingChaptersMap.get(newChapter.chapterId) || {}),
        ...newChapter,
      });
    }
  }

  return Array.from(existingChaptersMap.values());
};

export const calculateOverallProgress = (sections: any) => {
  if (!Array.isArray(sections) || sections.length === 0) {
    return 0; // 确保sections始终是数组且不为undefined
  }

  const totalChapters = sections.reduce((sum, section) => {
    if (!section || !Array.isArray(section.chapters)) return sum;
    return sum + section.chapters.length;
  }, 0);

  if (totalChapters === 0) return 0;

  const completedChapters = sections.reduce((sum, section) => {
    if (!section || !Array.isArray(section.chapters)) return sum;
    return sum + section.chapters.filter((chapter: any) => chapter?.completed).length;
  }, 0);

  return (completedChapters / totalChapters) * 100;
};
