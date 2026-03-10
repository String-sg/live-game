import "./globals.css";
import { Inter, Playfair_Display, DM_Mono } from "next/font/google";

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
      <body className={`${inter.variable} ${playfair.variable} ${dm_mono.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
