import type { Metadata } from "next";
import "./globals.css";
import PhotoViewer from "@/components/PhotoViewer";

export const metadata: Metadata = {
  title: "Safar AI — Your Intelligent Trip Planner",
  description: "AI-powered trip planning with 3 collaborative agents. Build personalized itineraries with map-based UX, smart budgeting, and real-time updates.",
  keywords: ["trip planner", "AI travel", "itinerary", "budget travel", "India travel"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        {children}
        <PhotoViewer />
      </body>
    </html>
  );
}
