import "./globals.css";
import { Inter } from "next/font/google";
import AppShell from "@/components/AppShell";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata = { title: "Qulf ERP", description: "Construction QS ERP - Saudi Arabia" };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}><AppShell>{children}</AppShell></body>
    </html>
  );
}
