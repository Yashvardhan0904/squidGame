import "./globals.css";

export const metadata = {
  title: "ACM Squid Game — 25 Days DSA Survival Arena",
  description:
    "Solve or be eliminated. A 25-day DSA survival challenge inspired by Squid Game. Three strikes and you're out.",
  keywords: "DSA, coding challenge, squid game, competitive programming, ACM, USAR",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-squid-black text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
