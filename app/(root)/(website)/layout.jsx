import Footer from "@/components/application/website/Footer";
import Header from "@/components/application/website/Header"; // reads from categories context
import React from "react";
import { Poppins } from "next/font/google";

import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import { CategoriesProvider } from "@/components/providers/CategoriesProvider";
import { ProductProvider } from "@/components/providers/ProductProvider";

const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export default function Layout({ children }) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <ReactQueryProvider>
          <CategoriesProvider>
            <ProductProvider>
              <Header />
              <main>{children}</main>
              <Footer />
            </ProductProvider>
          </CategoriesProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
