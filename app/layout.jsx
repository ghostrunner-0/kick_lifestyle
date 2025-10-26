// app/layout.jsx
import "./globals.css";
import { Poppins } from "next/font/google";
import ClientProviders from "./providers/ClientProviders"; // <-- new client wrapper

const PoppinsFont = Poppins({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Kick Lifestyle",
  description:
    "Tech that fits your lifestyle — smart, sleek, and built to last.",
  icons: {
    icon: "/favicon.png", // Path inside /public
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* Extensions sometimes inject attributes before hydration; this avoids noisy warnings */}
      <body
        className={`${PoppinsFont.className} antialiased`}
        suppressHydrationWarning
      >
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
