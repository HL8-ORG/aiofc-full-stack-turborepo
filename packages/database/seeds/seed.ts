import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { createId } from '@paralleldrive/cuid2';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const prisma = new PrismaClient();

// 在 ES 模块中替代 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CUID2 ID 生成函数
function generateId(): string {
  const id = createId();
  
  if (id.length !== 24) {
    console.warn(`⚠️ 生成的 ID 长度异常: ${id} (长度: ${id.length})`);
    throw new Error(`CUID2 生成错误: 预期长度 24 位, 实际 ${id.length} 位`);
  }
  
  return id;
}

// 种子数据文件路径
const SEED_DATA_PATH = path.join(__dirname, './data');

/**
 * 🗑️ 删除所有表数据 (考虑外键约束)
 */
async function clearAllTables() {
  console.log('🗑️ 正在删除现有数据...');
  
  try {
    await prisma.userCourseProgress.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.chapter.deleteMany();
    await prisma.section.deleteMany();
    await prisma.course.deleteMany();
    await prisma.socialAccount.deleteMany();
    await prisma.userSettings.deleteMany();
    await prisma.userProfile.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.loginHistory.deleteMany();
    await prisma.user.deleteMany();
    
    console.log('✅ 现有数据删除完成');
  } catch (error) {
    console.error('❌ 删除数据时出错:', error);
    throw error;
  }
}

/**
 * 📄 从 JSON 文件加载数据
 */
function loadJsonData<T>(filename: string): T[] {
  const filePath = path.join(SEED_DATA_PATH, filename);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ 找不到文件: ${filename}`);
    return [];
  }
  
  const rawData = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(rawData);
}

/**
 * 👥 用户数据填充
 */
async function seedUsers() {
  console.log('👥 正在填充用户数据...');
  
  const users = loadJsonData<any>('users.json');
  const profiles = loadJsonData<any>('userProfiles.json');
  const settings = loadJsonData<any>('userSettings.json');
  
  for (const user of users) {
    try {
      // 密码加密 (仅对明文密码)
      let hashedPassword;
      if (user.password) {
        if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
          // 已经是加密密码
          hashedPassword = user.password;
        } else {
          // 明文密码加密
          console.log(`🔐 密码加密: ${user.email}`);
          hashedPassword = await bcrypt.hash(user.password, 12);
        }
      } else {
        // 设置默认密码
        console.log(`🔐 设置默认密码: ${user.email}`);
        hashedPassword = await bcrypt.hash('password123', 12);
      }
      
      // 查找对应用户的个人资料和设置
      const userProfile = profiles.find(p => p.userId === user.id);
      const userSettings = settings.find(s => s.userId === user.id);
      
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          password: hashedPassword,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          role: user.role,
          isActive: user.isActive,
          isVerified: user.isVerified,
          lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
          passwordChangedAt: user.passwordChangedAt ? new Date(user.passwordChangedAt) : null,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
          
          // 创建个人资料
          profile: userProfile ? {
            create: {
              id: userProfile.id,
              bio: userProfile.bio,
              location: userProfile.location,
              website: userProfile.website,
              dateOfBirth: userProfile.dateOfBirth ? new Date(userProfile.dateOfBirth) : null,
              phone: userProfile.phone,
              createdAt: new Date(userProfile.createdAt),
              updatedAt: new Date(userProfile.updatedAt),
            }
          } : {
            create: {
              id: generateId(),
            }
          },
          
          // 创建设置
          settings: userSettings ? {
            create: {
              id: userSettings.id,
              theme: userSettings.theme,
              language: userSettings.language,
              timezone: userSettings.timezone,
              emailNotifications: userSettings.emailNotifications,
              pushNotifications: userSettings.pushNotifications,
              smsNotifications: userSettings.smsNotifications,
              twoFactorEnabled: userSettings.twoFactorEnabled,
              createdAt: new Date(userSettings.createdAt),
              updatedAt: new Date(userSettings.updatedAt),
            }
          } : {
            create: {
              id: generateId(),
            }
          }
        }
      });
      
      console.log(`✅ 用户创建成功: ${user.email}`);
    } catch (error) {
      console.error(`❌ 用户创建失败 (${user.email}):`, error);
    }
  }
  
  console.log('✅ 用户数据填充完成');
}

/**
 * 📚 课程数据填充
 */
async function seedCourses() {
  console.log('📚 正在填充课程数据...');
  
  const courses = loadJsonData<any>('courses.json');
  
  for (const course of courses) {
    try {
      await prisma.course.create({
        data: {
          courseId: course.courseId,
          teacherId: course.teacherId,
          teacherName: course.teacherName,
          title: course.title,
          description: course.description,
          category: course.category,
          image: course.image,
          price: course.price,
          level: course.level,
          status: course.status,
          createdAt: new Date(course.createdAt),
          updatedAt: new Date(course.updatedAt),
        }
      });
      
      console.log(`✅ 课程创建成功: ${course.title}`);
    } catch (error) {
      console.error(`❌ 课程创建失败 (${course.title}):`, error);
    }
  }
  
  console.log('✅ 课程数据填充完成');
}

/**
 * 📖 章节数据填充
 */
async function seedSections() {
  console.log('📖 正在填充章节数据...');
  
  const sections = loadJsonData<any>('sections.json');
  
  for (const section of sections) {
    try {
      await prisma.section.create({
        data: {
          sectionId: section.sectionId,
          courseId: section.courseId,
          sectionTitle: section.sectionTitle,
          sectionDescription: section.sectionDescription,
          createdAt: new Date(section.createdAt),
          updatedAt: new Date(section.updatedAt),
        }
      });
      
      console.log(`✅ 章节创建成功: ${section.sectionTitle}`);
    } catch (error) {
      console.error(`❌ 章节创建失败 (${section.sectionTitle}):`, error);
    }
  }
  
  console.log('✅ 章节数据填充完成');
}

/**
 * 📝 小节数据填充
 */
async function seedChapters() {
  console.log('📝 正在填充小节数据...');
  
  const chapters = loadJsonData<any>('chapters.json');
  
  for (const chapter of chapters) {
    try {
      await prisma.chapter.create({
        data: {
          chapterId: chapter.chapterId,
          sectionId: chapter.sectionId,
          type: chapter.type,
          title: chapter.title,
          content: chapter.content,
          video: chapter.video || null,
          createdAt: new Date(chapter.createdAt),
          updatedAt: new Date(chapter.updatedAt),
        }
      });
      
      console.log(`✅ 小节创建成功: ${chapter.title}`);
    } catch (error) {
      console.error(`❌ 小节创建失败 (${chapter.title}):`, error);
    }
  }
  
  console.log('✅ 小节数据填充完成');
}

/**
 * 💳 交易数据填充
 */
async function seedTransactions() {
  console.log('💳 正在填充交易数据...');
  
  const transactions = loadJsonData<any>('transactions.json');
  
  for (const transaction of transactions) {
    try {
      await prisma.transaction.create({
        data: {
          transactionId: transaction.transactionId,
          userId: transaction.userId,
          dateTime: new Date(transaction.dateTime),
          courseId: transaction.courseId,
          paymentProvider: transaction.paymentProvider,
          amount: transaction.amount,
        }
      });
      
      console.log(`✅ 交易创建成功: ${transaction.transactionId}`);
    } catch (error) {
      console.error(`❌ 交易创建失败 (${transaction.transactionId}):`, error);
    }
  }
  
  console.log('✅ 交易数据填充完成');
}

/**
 * 📋 课程注册数据填充
 */
async function seedEnrollments() {
  console.log('📋 正在填充课程注册数据...');
  
  const enrollments = loadJsonData<any>('enrollments.json');
  
  for (const enrollment of enrollments) {
    try {
      await prisma.enrollment.create({
        data: {
          userId: enrollment.userId,
          courseId: enrollment.courseId,
          enrolledAt: new Date(enrollment.enrolledAt),
          createdAt: new Date(enrollment.createdAt),
          updatedAt: new Date(enrollment.updatedAt),
        }
      });
      
      console.log(`✅ 课程注册创建成功: ${enrollment.userId} -> ${enrollment.courseId}`);
    } catch (error) {
      console.error(`❌ 课程注册创建失败 (${enrollment.userId} -> ${enrollment.courseId}):`, error);
    }
  }
  
  console.log('✅ 课程注册数据填充完成');
}

/**
 * 📊 学习进度数据填充
 */
async function seedUserCourseProgress() {
  console.log('📊 正在填充学习进度数据...');
  
  const progressData = loadJsonData<any>('userCourseProgress.json');
  
  for (const progress of progressData) {
    try {
      await prisma.userCourseProgress.create({
        data: {
          userId: progress.userId,
          courseId: progress.courseId,
          enrollmentDate: new Date(progress.enrollmentDate),
          overallProgress: progress.overallProgress,
          lastAccessedTimestamp: new Date(progress.lastAccessedTimestamp),
          sections: progress.sections,
        }
      });
      
      console.log(`✅ 学习进度创建成功: ${progress.userId} -> ${progress.courseId}`);
    } catch (error) {
      console.error(`❌ 学习进度创建失败 (${progress.userId} -> ${progress.courseId}):`, error);
    }
  }
  
  console.log('✅ 学习进度数据填充完成');
}

/**
 * 🌱 主填充函数
 */
async function main() {
  console.log('🌱 开始填充 PostgreSQL 数据库');
  console.log('🆔 所有 ID 使用 CUID2 格式');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    await clearAllTables();
    
    await seedUsers();
    await seedCourses();
    await seedSections();
    await seedChapters();
    await seedTransactions();
    await seedEnrollments();
    await seedUserCourseProgress();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 数据库填充完成！');
    console.log('');
    console.log('✨ 测试账号信息:');
    console.log('  📧 讲师1: instructor1@example.com (密码: password123)');
    console.log('  📧 讲师2: instructor2@example.com (密码: password123)');
    console.log('  📧 学生1: student1@example.com (密码: password123)');
    console.log('  📧 学生2: student2@example.com (密码: password123)');
    console.log('  📧 管理员: admin@example.com (密码: password123)');
    
  } catch (error) {
    console.error('❌ 填充过程中出错:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行填充脚本
main().catch((error) => {
  console.error('💥 填充脚本执行失败:', error);
  process.exit(1);
});

export default main;
