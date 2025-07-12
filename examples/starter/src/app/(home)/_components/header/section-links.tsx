"use client";
import { PRO_VERSION, SOURCE_CODE_URL } from "@/config/site";
import { useTranslations } from "next-intl";
import Link from "next/link";

export const headerLinks = [
  {
    label: "home",
    href: "/",
  },
  {
    label: "features",
    href: "#features",
  },
  {
    label: "team",
    href: "#team",
  },
  {
    label: "faq",
    href: "#faq",
  },
];

const SectionLinks = () => {
  const tHeader = useTranslations("Header");
  // const locale = useLocale();

  return (
    <div className="hidden md:flex flex-row items-center gap-x-4 font-bold">
      {headerLinks.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          title={tHeader(link.label)}
          prefetch={false}
          className="mx-2 hover:underline"
        >
          {tHeader(link.label)}
        </Link>
      ))}
    </div>
  );
};
export default SectionLinks;
