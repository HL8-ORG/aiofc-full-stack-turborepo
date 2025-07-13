# BetterAuth
`BetterAuth`官网并没有提供与`nestjs`的集成，我参考了2个项目：
- [fastify版本](https://github.com/kylegillen/nestjs-fastify-better-auth)
- [express版本](https://github.com/laakal/nestjs-better-auth-template)


## 服务端

```
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "../generated/client";
import { admin } from "better-auth/plugins";

const prisma = new PrismaClient();
export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	secret: process.env.BETTER_AUTH_SECRET,

  // 设置客户端的地址，并处理跨域问题
	trustedOrigins: ["http://localhost:3000"], 

  
	plugins: [
		admin({
			adminUserIds: ["SWp4kVpPGfUvuXbGoso3hpPXyIWxg6EI"],
		}),
	],
	emailAndPassword: {
		enabled: true,
		async sendResetPassword(data, request) {},
	},
});

```

## 客户端
```
BETTER_AUTH_SECRET=tertrewyrwetyhuwtrutrujtruy
NEXT_BETTER_AUTH_API_URL=http://localhost:3001
```
- auth-client.ts
```
import {
  createAuthClient
} from "better-auth/react";


export const authClient = createAuthClient({
  baseURL: process.env.NEXT_BETTER_AUTH_API_URL + "/api/auth",
})

export const {
  signIn,
  signOut,
  signUp,
  useSession
} = authClient;
```