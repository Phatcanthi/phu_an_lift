import { redirect } from "next/navigation";

// Staff and customers share one sign-in page, which lives in the public site (src/app/[locale]/login).
export default function AdminLoginRedirect() {
  redirect("/login");
}
