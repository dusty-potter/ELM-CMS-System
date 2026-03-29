import type { Metadata } from "next";

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
      <body>{children}</body>
    </html>
  );
}
