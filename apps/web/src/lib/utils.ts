import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as z from "zod";
import { api } from "../state/api";
import { toast } from "sonner";
import { createId as generateCuid2 } from "@paralleldrive/cuid2"; // 🆔 直接使用 CUID2 (浏览器兼容)

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 🆔 ID 生成和验证工具 (基于 CUID2)
export function createId(): string {
  return generateCuid2();
}

export function createIds(count: number): string[] {
  return Array.from({ length: count }, () => generateCuid2());
}

export function validateId(id: string): boolean {
  // CUID2 长度为24位,首字母为小写,其余为小写字母和数字
  const cuid2Regex = /^[a-z][a-z0-9]{23}$/;
  return typeof id === 'string' && id.length === 24 && cuid2Regex.test(id);
}

// 生成临时 ID (客户端使用)
export function createTempId(): string {
  return `temp_${generateCuid2()}`;
}

// 检查是否为临时 ID
export function isTempId(id: string): boolean {
  return id.startsWith('temp_');
}

// 将临时 ID 转换为实际 ID
export function convertTempId(tempId: string): string {
  if (isTempId(tempId)) {
    return tempId.replace('temp_', '');
  }
  return tempId;
}

// Convert cents to formatted currency string (e.g., 4999 -> "$49.99")
export function formatPrice(cents: number | undefined): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((cents || 0) / 100);
}

// Convert dollars to cents (e.g., "49.99" -> 4999)
export function dollarsToCents(dollars: string | number): number {
  const amount = typeof dollars === "string" ? parseFloat(dollars) : dollars;
  return Math.round(amount * 100);
}

// Convert cents to dollars (e.g., 4999 -> "49.99")
export function centsToDollars(cents: number | undefined): string {
  return ((cents || 0) / 100).toString();
}

// Zod schema for price input (converts dollar input to cents)
export const priceSchema = z.string().transform((val) => {
  const dollars = parseFloat(val);
  if (isNaN(dollars)) return "0";
  return dollarsToCents(dollars).toString();
});

export const countries = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo (Congo-Brazzaville)",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Democratic Republic of the Congo",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "East Timor (Timor-Leste)",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar (formerly Burma)",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

export const customStyles = "text-gray-300 placeholder:text-gray-500";

export function convertToSubCurrency(amount: number, factor = 100) {
  return Math.round(amount * factor);
}

export const NAVBAR_HEIGHT = 48;

export const courseCategories = [
  { value: "technology", label: "Technology" },
  { value: "science", label: "Science" },
  { value: "mathematics", label: "Mathematics" },
  { value: "artificial-intelligence", label: "Artificial Intelligence" },
] as const;

export const customDataGridStyles = {
  border: "none",
  backgroundColor: "#17181D",
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "#1B1C22",
    color: "#6e6e6e",
    "& [role='row'] > *": {
      backgroundColor: "#1B1C22 !important",
      border: "none !important",
    },
  },
  "& .MuiDataGrid-cell": {
    color: "#6e6e6e",
    border: "none !important",
  },
  "& .MuiDataGrid-row": {
    backgroundColor: "#17181D",
    "&:hover": {
      backgroundColor: "#25262F",
    },
  },
  "& .MuiDataGrid-footerContainer": {
    backgroundColor: "#17181D",
    color: "#6e6e6e",
    border: "none !important",
  },
  "& .MuiDataGrid-filler": {
    border: "none !important",
    backgroundColor: "#17181D !important",
    borderTop: "none !important",
    "& div": {
      borderTop: "none !important",
    },
  },
  "& .MuiTablePagination-root": {
    color: "#6e6e6e",
  },
  "& .MuiTablePagination-actions .MuiIconButton-root": {
    color: "#6e6e6e",
  },
};

export const createCourseFormData = (
  data: CourseFormData,
  sections: Section[]
): FormData => {
  console.log('📦 开始创建课程表单数据:');
  console.log('  - 输入数据:', data);
  console.log('  - 章节数:', sections.length);
  
  const formData = new FormData();
  
  // 添加基本字段
  formData.append("title", data.courseTitle || '');
  formData.append("description", data.courseDescription || '');
  formData.append("category", data.courseCategory || '');
  
  // 处理价格字段(将美元转换为分)
  const priceInCents = dollarsToCents(data.coursePrice || '0');
  formData.append("price", priceInCents.toString());
  console.log('💰 价格转换:', data.coursePrice, '->', priceInCents);
  
  // 处理状态字段
  const status = data.courseStatus ? "Published" : "Draft";
  formData.append("status", status);
  console.log('📊 设置状态:', status);

  // 处理章节数据
  const sectionsWithVideos = sections.map((section) => {
    console.log(`📂 处理章节: ${section.sectionTitle} (${section.chapters.length}个小节)`);
    
    return {
      ...section,
      chapters: section.chapters.map((chapter) => {
        console.log(`  📄 处理小节: ${chapter.title} (视频: ${chapter.video ? '有' : '无'})`);
        
        return {
          ...chapter,
          video: chapter.video,
        };
      }),
    };
  });

  formData.append("sections", JSON.stringify(sectionsWithVideos));
  console.log('📋 章节数据 JSON 添加完成');
  console.log('✅ FormData 创建完成');

  return formData;
};

// FormData 内容输出到日志的辅助函数
export const logFormData = (formData: FormData, title: string = 'FormData') => {
  console.log(`📋 ${title} 内容:`);
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      console.log(`  ${key}: ${value.length > 100 ? value.substring(0, 100) + '...' : value}`);
    } else {
      console.log(`  ${key}: [文件] ${(value as File).name}`);
    }
  }
};

export const uploadAllVideos = async (
  localSections: Section[],
  courseId: string,
  getUploadVideoUrl: any
) => {
  console.log('📹 开始上传所有视频:');
  console.log(`  - 课程 ID: ${courseId}`);
  console.log(`  - 章节数: ${localSections.length}`);
  
  const updatedSections = localSections.map((section) => ({
    ...section,
    chapters: section.chapters.map((chapter) => ({
      ...chapter,
    })),
  }));

  let totalVideos = 0;
  let uploadedVideos = 0;
  
  // 计算总视频文件数
  for (const section of updatedSections) {
    for (const chapter of section.chapters) {
      if (chapter.video instanceof File && chapter.video.type === "video/mp4") {
        totalVideos++;
      }
    }
  }
  
  console.log(`📋 需要上传的视频文件: ${totalVideos}个`);
  
  if (totalVideos === 0) {
    console.log('ℹ️ 没有需要上传的视频文件');
    return updatedSections;
  }

  for (let i = 0; i < updatedSections.length; i++) {
    const section = updatedSections[i];
    console.log(`📂 处理章节: ${section.sectionTitle} (${section.sectionId})`);
    
    for (let j = 0; j < section.chapters.length; j++) {
      const chapter = section.chapters[j];
      
      if (chapter.video instanceof File && chapter.video.type === "video/mp4") {
        console.log(`  📹 开始上传小节 "${chapter.title}" 的视频...`);
        console.log(`    - 文件名: ${chapter.video.name}`);
        console.log(`    - 文件大小: ${(chapter.video.size / 1024 / 1024).toFixed(2)}MB`);
        
        try {
          const updatedChapter = await uploadVideo(
            chapter,
            courseId,
            section.sectionId,
            getUploadVideoUrl
          );
          updatedSections[i].chapters[j] = updatedChapter;
          uploadedVideos++;
          
          console.log(`  ✅ 小节 "${chapter.title}" 视频上传成功! (${uploadedVideos}/${totalVideos})`);
        } catch (error: any) {
          console.error(`  ❌ 小节 "${chapter.title}" 视频上传失败:`, error);
          console.error(`    - 错误信息: ${error?.message || '未知错误'}`);
          // 即使上传失败也继续进行
        }
      } else if (chapter.video) {
        console.log(`  ℹ️ 小节 "${chapter.title}": 视频已经是URL或不是视频文件`);
      }
    }
  }
  
  console.log(`✅ 所有视频上传完成: ${uploadedVideos}/${totalVideos}个视频上传成功`);
  return updatedSections;
};

async function uploadVideo(
  chapter: Chapter,
  courseId: string,
  sectionId: string,
  getUploadVideoUrl: any
) {
  const file = chapter.video as File;
  console.log(`🚀 开始上传视频: ${chapter.title}`);

  try {
    console.log(`  🔗 正在请求上传URL...`);
    const { uploadUrl, videoUrl } = await getUploadVideoUrl({
      courseId,
      sectionId,
      chapterId: chapter.chapterId,
      fileName: file.name,
      fileType: file.type,
    }).unwrap();
    
    console.log(`  ✅ 获取上传URL成功`);
    console.log(`  📤 开始上传文件... (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`文件上传失败: HTTP ${uploadResponse.status}`);
    }
    
    console.log(`  ✅ 文件上传成功!`);
    
    toast.success(
      `小节 "${chapter.title}" 视频上传成功`
    );

    return { ...chapter, video: videoUrl };
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || '未知错误';
    console.error(`❌ 视频上传失败 (${chapter.title}):`, errorMessage);
    
    toast.error(
      `小节 "${chapter.title}" 视频上传失败: ${errorMessage}`
    );
    
    throw error;
  }
}
