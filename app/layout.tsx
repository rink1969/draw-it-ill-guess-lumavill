import type { Metadata } from "next";
import "./globals.css";

// Build-time base path. Matches the BASE_PATH env set by the GitHub Actions deploy
// workflow (empty for local npm start, which serves ./out at the root).
const BASE_PATH = normalizeBase(process.env.BASE_PATH);

function normalizeBase(raw: string | undefined): string {
  let base = raw || "";
  while (base.startsWith("/")) base = base.slice(1);
  while (base.endsWith("/")) base = base.slice(0, -1);
  return base;
}

function assetPath(path: string): string {
  const clean = normalizeBase(path);
  return BASE_PATH ? '/' + BASE_PATH + '/' + clean : '/' + clean;
}

export const metadata: Metadata = {
  title: "Draw It, I'll Guess! | LumaVill",
  description: "A cozy drawing and guessing mini game with Kaka.",
  icons: {
    icon: assetPath("/favicon.svg"),
    shortcut: assetPath("/favicon.svg"),
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
        {BASE_PATH
          ? <script dangerouslySetInnerHTML={{ __html: `window.__DSH_BASE_PATH=${JSON.stringify(BASE_PATH)};document.documentElement.style.setProperty('--room-backdrop', ${JSON.stringify('url(/' + BASE_PATH + '/cozy-room-reference.png)')});` }} />
          : null}
        {children}
      </body>
    </html>
  );
}
