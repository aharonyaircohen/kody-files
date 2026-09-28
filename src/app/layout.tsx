import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./styles.css";

export const metadata: Metadata = {
  title: "GitHub Files",
  description: "Browse and edit files in a GitHub repository",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster richColors />
      </body>
    </html>
  );
}
