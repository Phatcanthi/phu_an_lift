import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LoginExperience } from "@/components/login/LoginExperience";
import { getSite } from "@/content";
import { isLocale } from "@/i18n/config";
import { messages } from "@/i18n/messages";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { title, description } = messages[locale].login;
  // A sign-in form has no business in search results.
  return { title, description, robots: { index: false, follow: false } };
}

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { company } = getSite(locale);
  return <LoginExperience slogan={company.slogan} />;
}
