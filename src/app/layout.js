import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "CompanyIQ AI - Company Research Assistant",
  description:
    "Research any company instantly. Get comprehensive insights, competitor analysis, pain points, and professional PDF reports powered by OpenRouter and Serper.dev.",
  keywords: "company research, competitor analysis, business intelligence",
  openGraph: {
    title: "CompanyIQ AI - Company Research Assistant",
    description: "Company research, competitor analysis, and PDF report generation.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0a0f" />
      </head>
      <body>{children}</body>
    </html>
  );
}
