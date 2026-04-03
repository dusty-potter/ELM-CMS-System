import type { Metadata } from "next";
import "./globals.css";
import Nav from "./components/Nav";

export const metadata: Metadata = {
  title: "ELM CMS",
  description: "Ear Level Marketing — structured content distribution system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <div className="pt-14">{children}</div>
      </body>
    </html>
  );
}
