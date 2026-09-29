import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Login | Qulf Construction QS ERP",
  description: "Secure login for Qulf Construction QS ERP system. Multi-tenant, bilingual (English & Arabic), and ZATCA-ready for Saudi contractors.",
  keywords: [
    "Construction ERP",
    "Quantity Surveying ERP",
    "Saudi Arabia Construction",
    "ZATCA E-Invoicing",
    "BOQ Management",
    "Contractor ERP Login",
  ],
  openGraph: {
    title: "Login | Qulf Construction QS ERP",
    description: "Multi-tenant QS & Construction ERP for Saudi Contractors",
    type: "website",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("qulf_access")?.value;

  // Server-side guard: If user already has an active session, redirect straight to dashboard
  if (token) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
