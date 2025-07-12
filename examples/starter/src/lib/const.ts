export const IS_DEV = process.env.NODE_ENV !== "production";
export const IS_BROWSER = typeof window !== "undefined";

/**
 * 声明EdgeRuntime全局变量
 * @type {any}
 */
declare const EdgeRuntime: any;

/**
 * 判断当前是否在Edge Runtime环境中运行
 * @description 通过检测EdgeRuntime变量是否存在来判断运行环境
 */
export const IS_EDGE_RUNTIME = typeof EdgeRuntime !== "undefined";

/**
 * 粘贴文本的最大长度限制
 * @description 用于限制用户粘贴内容的长度,防止过长文本影响性能
 */
export const PROMPT_PASTE_MAX_LENGTH = 1000;

/**
 * 判断是否在Vercel环境中运行
 * @description 通过环境变量VERCEL判断是否在Vercel平台部署
 */
export const IS_VERCEL_ENV = process.env.VERCEL === "1";

/**
 * 判断是否在Docker环境中运行
 * @description 通过环境变量DOCKER_BUILD判断是否在Docker容器中运行
 */
export const IS_DOCKER_ENV = process.env.DOCKER_BUILD === "1";

/**
 * MCP服务器是否仅支持远程模式
 * @description 在Vercel环境下强制使用远程MCP服务器
 */
export const IS_MCP_SERVER_REMOTE_ONLY = IS_VERCEL_ENV;

/**
 * 是否启用基于文件的MCP配置
 * @description 通过环境变量控制MCP配置的加载方式
 */
export const FILE_BASED_MCP_CONFIG =
  process.env.FILE_BASED_MCP_CONFIG === "true";

/**
 * 侧边栏状态的Cookie键名
 * @description 用于在Cookie中存储用户的侧边栏展开/收起状态
 */
export const COOKIE_KEY_SIDEBAR_STATE = "sidebar:state";

/**
 * 国际化语言设置的Cookie键名
 * @description 用于在Cookie中存储用户选择的界面语言
 */
export const COOKIE_KEY_LOCALE = "i18n:locale";

/**
 * 系统支持的主题列表
 * @description 
 * 包含所有可用的主题选项:
 * - 基础色彩主题(default, zinc等)
 * - 特色风格主题(cyberpunk-neon等)
 * - 场景主题(tropical-paradise等)
 * 用户可以从这些预设主题中选择自己喜欢的界面风格
 */
export const BASE_THEMES = [
  "default",
  "zinc",
  "slate",
  "stone",
  "gray",
  "blue",
  "orange",
  "pink",
  "bubblegum-pop",
  "cyberpunk-neon",
  "retro-arcade",
  "tropical-paradise",
  "steampunk-cogs",
  "neon-synthwave",
  "pastel-kawaii",
  "space-odyssey",
  "vintage-vinyl",
  "misty-harbor",
  "zen-garden",
];

/**
 * 系统支持的语言列表
 * @description
 * 定义了系统支持的所有语言选项:
 * - code: 语言代码,用于程序内部识别
 * - name: 语言显示名称,包含国旗emoji
 * 
 * 工作机制:
 * 1. 用于国际化组件的语言选择
 * 2. 配合i18n系统加载对应语言包
 * 3. 用于验证用户语言选择的有效性
 */
export const SUPPORTED_LOCALES = [
  {
    code: "en",
    name: "English 🇺🇸",
  },
  {
    code: "ko",
    name: "Korean 🇰🇷",
  },

  {
    code: "es",
    name: "Spanish 🇪🇸",
  },
  {
    code: "fr",
    name: "French 🇫🇷",
  },
  {
    code: "ja",
    name: "Japanese 🇯🇵",
  },
  {
    code: "zh",
    name: "Chinese 🇨🇳",
  },
];
