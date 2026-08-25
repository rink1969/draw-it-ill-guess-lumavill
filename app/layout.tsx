import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Draw It, I'll Guess! | LumaVill",
  description: "A cozy drawing and guessing mini game with Kaka.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
