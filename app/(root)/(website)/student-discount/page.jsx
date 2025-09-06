// app/(root)/student-discount/page.jsx
import StudentDiscountClient from "./StudentDiscountClient";

export const metadata = {
  title: "Student Discount | Kick Lifestyle",
  description:
    "Apply for the Kick Lifestyle Student Discount. Verify your student status with your college ID to receive exclusive offers.",
  alternates: { canonical: "/student-discount" },
  openGraph: {
    title: "Student Discount | Kick Lifestyle",
    description:
      "Apply for the Kick Lifestyle Student Discount and unlock exclusive savings with your college ID.",
    url: "/student-discount",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  keywords: [
    "student discount",
    "college discount",
    "Kick Lifestyle student",
    "education pricing",
  ],
};

export default function Page() {
  return <StudentDiscountClient />;
}
