import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./styles.css";

export const metadata: Metadata = {
  title: "GitHub Files",
  description: "Browse and edit files in a GitHub repository",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var stored=localStorage.getItem('github-files-theme');var theme=stored==='light'||stored==='dark'?stored:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',theme)})()` }} />
      </head>
      <body>
        {children}
        <Toaster richColors />
      </body>
    </html>
  );
}
