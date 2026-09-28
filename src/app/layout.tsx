import type { Metadata } from "next";
import { Toaster } from "sonner";
import { LEGACY_THEME_KEY, THEME_KEY } from "./files/browser-storage";
import "./styles.css";

export const metadata: Metadata = {
  title: "Kody Files",
  description: "Browse and edit files in a GitHub repository",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var key=${JSON.stringify(THEME_KEY)},old=${JSON.stringify(LEGACY_THEME_KEY)},stored=localStorage.getItem(key),legacy=localStorage.getItem(old);if(stored===null&&legacy!==null){localStorage.setItem(key,legacy);stored=legacy}if(legacy!==null)localStorage.removeItem(old);var theme=stored==='light'||stored==='dark'?stored:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',theme)})()` }} />
      </head>
      <body>
        {children}
        <Toaster richColors />
      </body>
    </html>
  );
}
