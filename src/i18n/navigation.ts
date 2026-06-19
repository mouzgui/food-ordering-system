// Re-export Next.js navigation primitives
// (We use next-intl without i18n routing, so no locale-prefixed URLs needed)
export { default as Link } from "next/link";
export { redirect } from "next/navigation";
export { usePathname, useRouter } from "next/navigation";
