"use client";

import { PageTransition } from "@/components/page-transition";
import { Button } from "@repo/design-system/components/shadcn-ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <PageTransition>
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-4xl font-black text-foreground md:text-6xl">
            页面未找到
          </h1>
          <p className="text-xl font-semibold text-muted-foreground md:text-3xl mt-4">
            抱歉，您访问的页面不存在
          </p>
          <p className="text-muted-foreground text-lg mt-6">
            请检查网址是否正确，或返回首页继续浏览。
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/">返回首页</Link>
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.back()}>
              返回上一页
            </Button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
