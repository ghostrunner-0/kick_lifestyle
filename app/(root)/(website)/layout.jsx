// app/layout.jsx
import Footer from "@/components/application/website/Footer";
import Header from "@/components/application/website/Header";
import React from "react";
import { Poppins } from "next/font/google";

// Google Fonts: Poppins
const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"], // Add weights you need
});

const Layout = ({ children }) => {
  return (
    <div  className={poppins.className}>
        <Header />
        <main>{children}</main>
        <Footer />
    </div>
  );
};

export default Layout;
