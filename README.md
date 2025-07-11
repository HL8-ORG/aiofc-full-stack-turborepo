# 🎓 LMS Next.js + NestJS 集成项目
https://github.com/flexyzwork/lms-next-nestjs/blob/main/README.md

https://github.com/aialvi/Lets-Learn-LMS

https://github.com/shahbaz42/next-nestjs-trpc-monorepo/tree/main

https://github.com/FabCode100/taskflow

https://github.com/appliedinnovationcorp/nexus4

A scalable, multi-tenant platform built with NestJS, Next.js, Apache Kafka, Keycloak, and PostgreSQL, leveraging DDD, CQRS, and event sourcing. Supports marketing, client management, administration, investor relations, developer ecosystem, authentication, payments, analytics, compliance, and notifications.

https://github.com/marekcaba/bassnotion-monorepo-v1

https://github.com/liuzxPower/nadmin

https://github.com/yasilvalmeida/ai-fragrance-microservice/tree/master

带有AI推荐的香水系统

https://github.com/FathanAkram-app/Talent-Management

微服务+clean architecture
A modern microservices-based talent management system built with clean architecture principles, featuring NestJS backend services, Next.js frontend, and PostgreSQL databases.

https://github.com/dvkscript/ai-mock-interview-nextjs-nestjs

AI 模拟面试

https://github.com/HasanAlif/Task_Management_System-NestJs-NextJs-/tree/main

https://github.com/ZiadGamalDev/chatgpt-clone

https://github.com/shoaibrasool/AskVerse

AskVerse is a full-stack AI Q&A app built with Next.js and NestJS. It lets users ask questions and choose from multiple LLMs like GPT-4, Claude, or Mistral to get responses. The app enables side-by-side model comparison and showcases multi-LLM integration in action.
https://github.com/TasmeTime/yt-ai-chatbot-ollama

https://www.youtube.com/watch?v=Y9KNU2MnO-o&t=61s
🚀 Full-Stack Authentication with Next.js & NestJS in a Monorepo
https://github.com/faid-terence/Auth-x
RBAC系统：由Nestjs构建的一种强大的基于角色的访问控制系统，用于管理用户权限和访问级别。

https://github.com/baiwumm/vue3-admin
前端基于 Soybean Admin二次开发，后端基于 Nest.js + Prisma 的全栈后台应用

**基于 Monorepo 的企业级学习管理系统** - 使用 Turbo Monorepo 架构构建的类型安全和性能优化的 LMS 平台

## 🚀 项目现状

- **开发完成度**: 已达到实际服务运营水平
- **性能优化**: 解决 N+1 查询问题，Redis 缓存，打包优化完成
- **代码质量**: TypeScript 覆盖率 100%，系统化模块化完成
- **运营稳定性**: 基于环境变量的动态配置，性能监控系统搭建

## 📊 主要成果指标

```
lms-next-nestjs/
├── apps/
│   ├── auth/          # NestJS 인증 서비스 (포트: 4000)
│   ├── api/           # NestJS API 서버 (포트: 4001)
│   └── web/           # Next.js 웹 앱 (포트: 3000)
├── packages/
│   ├── auth/          # 공통 인증 스키마
│   ├── common/        # 공통 미들웨어, 유틸리티
│   ├── config/        # 환경변수 기반 동적 설정
│   ├── database/      # Prisma 데이터베이스 설정
│   └── schemas/       # Zod 스키마 검증
└── docs/              # 성능 최적화 및 트러블슈팅 가이드
```

## ⚡ 핵심 기술적 성과

### 🎯 N+1 쿼리 최적화
```typescript
// 기존: N+1개 쿼리
const users = await findUsers();
for (const user of users) {
  const courses = await findCourses(user.id);
}

// 최적화: 단일 쿼리
const enrolledCourses = await prisma.userCourseProgress.findMany({
  include: {
    course: {
      include: { sections: { include: { chapters: true } } }
    }
  }
});
```

### 🚀 Redis 캐싱 시스템
```typescript
@Cacheable('user-courses:{userId}', 300)    // 5분 캐시
@Cacheable('course-stats:{courseId}', 600)  // 10분 캐시
@CacheEvict(['user-courses:{userId}'])      // 자동 무효화
```

### 🔧 환경변수 기반 동적 설정
```typescript
// 보안 정책을 코드 수정 없이 조정 가능
maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
lockoutDuration: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15', 10),
```

## 🛠️ 기술 스택

**백엔드**
- NestJS (모듈형 아키텍처)
- Prisma (타입 안전한 ORM)
- Redis (캐싱/세션 관리)
- PostgreSQL (데이터베이스)

**프론트엔드**
- Next.js 15 (App Router)
- TypeScript (100% 타입 안전성)
- Tailwind CSS (스타일링)
- Zod (스키마 검증)

**개발 도구**
- Turbo (모노레포 빌드 최적화)
- Docker (컨테이너화)
- pnpm (패키지 관리)

## 🚀 빠른 시작

### 1. 환경 설정
```bash
# 프로젝트 클론 및 의존성 설치
git clone <repository-url>
cd lms-next-nestjs
pnpm install

# 환경 변수 설정
cp .envs/.env.example .envs/.env.local
cp packages/database/.env.example packages/database/.env
```

### 2. 데이터베이스 초기화
```bash
# 데이터베이스 마이그레이션
pnpm db migrate dev --name init

# 시드 데이터 생성 (선택사항)
pnpm db:seed
```

### 3. 개발 서버 실행
```bash
# 모든 서비스 동시 실행
pnpm dev

# 개별 서비스 실행
pnpm dev:auth    # 인증 서비스
pnpm dev:api     # API 서버
pnpm dev:web     # 웹 앱
```

## 📋 핵심 기능

### 🔐 인증 시스템
- JWT 기반 Access/Refresh 토큰
- 소셜 로그인 (Google, GitHub)
- 브루트포스 공격 방지
- 환경변수 기반 보안 정책

### 📚 학습 관리
- 강의 생성/편집 시스템
- 실시간 진도 추적
- 섹션/챕터 관리
- 파일 업로드 최적화

### 👨‍🏫 관리 도구
- 성능 모니터링 대시보드
- 사용자 배치 처리
- 통계 데이터 집계
- 시스템 헬스체크

## 📊 성능 모니터링

### API 엔드포인트
```bash
# 실시간 성능 메트릭 확인
GET /api/v1/admin/performance/metrics

# 시스템 상태 확인
GET /api/v1/admin/performance/health

# 느린 엔드포인트 분석
GET /api/v1/admin/performance/slow-endpoints

# 메모리 사용량 추이
GET /api/v1/admin/performance/memory-usage
```

### 실시간 모니터링 기능
- **모든 HTTP 요청 자동 추적**: 응답 시간, 상태코드, URL
- **느린 요청 자동 감지**: 1초 이상 요청 실시간 로깅
- **메모리 모니터링**: 30초마다 자동 체크, 임계치 초과 시 경고
- **자동 가비지 컬렉션**: 메모리 임계치 초과 시 자동 실행

### 성능 로깅 활성화
```bash
# 상세 성능 로깅 활성화
LOG_PERFORMANCE=true pnpm dev:api

# 메모리 디버깅 로깅 활성화
LOG_MEMORY=true pnpm dev:api
```

## 🧪 테스트 및 품질 관리

```bash
# 코드 품질 검사
pnpm lint                # ESLint 검사
pnpm check-types         # TypeScript 타입 체크
pnpm format              # Prettier 포맷팅
pnpm test                # 테스트 실행
```

## 📦 배포

```bash
# 프로덕션 빌드
pnpm build

# Docker 컨테이너 빌드
pnpm docker build

# 개별 서비스 배포
pnpm --filter @apps/auth build
pnpm --filter @apps/api build
pnpm --filter @apps/web build
```

## 🔍 트러블슈팅

### 성능 디버깅
```bash
# 성능 로깅 활성화
LOG_PERFORMANCE=true pnpm dev

# Redis 연결 확인
redis-cli ping

# 메모리 사용량 모니터링
node --inspect apps/api/dist/main.js
```

### 개발 환경 이슈
- **포트 충돌**: 각 서비스별 포트 확인 (3000, 4000, 4001)
- **환경변수**: .env 파일 설정 확인
- **데이터베이스**: PostgreSQL 및 Redis 연결 상태 확인

## 📝 라이센스

MIT 라이센스 하에 배포됩니다.

---

**실제 운영 가능한 수준의 엔터프라이즈급 LMS 시스템**

✅ 타입 안전성 확보 (TypeScript 100%)
✅ 성능 최적화 완료 (N+1 해결, 캐싱 적용)
✅ 운영 안정성 구축 (동적 설정, 모니터링)
✅ 확장 가능한 아키텍처 (모노레포, 모듈화)
