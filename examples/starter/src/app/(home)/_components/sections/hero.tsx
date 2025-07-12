"use client";
import ProminentTxt from "@/components/prominent-txt";
import { Badge } from "@repo/design-system/components/shadcn-ui/badge";
import { Button } from "@repo/design-system/components/shadcn-ui/button";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export const HeroSection = () => {
  const t = useTranslations("Home");
  return (
    <section className="container w-full">
      <div className="grid place-items-center lg:max-w-screen-xl gap-8 mx-auto py-20 md:py-32">
        <div className="text-center space-y-8">
          <div className="max-w-screen-md mx-auto text-center text-4xl md:text-6xl font-bold">
            <h1>
              <ProminentTxt txt="Aiofix" />
              <span className="text-transparent px-2 bg-gradient-to-r from-[#D247BF] to-primary bg-clip-text">
                {t("tagLine")}
              </span>
            </h1>
          </div>

          <p className="max-w-screen-sm mx-auto text-xl text-muted-foreground">
            {t("description")}
          </p>

          <div className="space-y-4 md:space-y-0 md:space-x-4">
            <Link href="/planner">start</Link>

            <Button
              asChild
              variant="secondary"
              className="w-5/6 md:w-1/4 font-bold"
            >
              <Link
                href="https://github.com/HL8-ORG?tab=repositories"
                target="_blank"
              >
                Github
              </Link>
            </Button>
            <div className="flex flex-col items-center justify-center py-10">
              <h1>{t("whoIsUsing")}</h1>
              <p>
                抄袭：https://shadcn-landing-page-livid.vercel.app/
                还差滚动条没做，烦！！！
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
