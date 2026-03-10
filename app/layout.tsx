import "./globals.css";
import { Inter, Playfair_Display, DM_Mono } from "next/font/google";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const dm_mono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-dm-mono" });

export const metadata = {
  title: "Pearl Exchange | Live Market Simulation",
  description: "Market simulation for classrooms",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-K9SYMPYVZR"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-K9SYMPYVZR');
          `}
        </Script>
      </head>
      <body className={`${inter.variable} ${playfair.variable} ${dm_mono.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
