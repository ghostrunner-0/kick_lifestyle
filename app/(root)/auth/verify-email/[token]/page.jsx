"use client";
import { Card, CardContent } from "@/components/ui/card";
import axios from "axios";
import { useEffect, useState,use } from "react";
import Image from "next/image";
import VerifiedImg from "@/public/assets/images/verified.gif";
import VerifiedFailedImg from "@/public/assets/images/verification-failed.gif";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { WEBSITE_HOME } from "@/routes/WebsiteRoutes";

const EMailVerification = ({ params }) => {
  const [isVerified, setIsVerified] = useState(false);
  const { token } = use(params);

  useEffect(() => {
    const verify = async () => {
      try {
        const { data: EMailVerification } = await axios.post(
          "/api/auth/verify-email",
          { token }
        );
        if (EMailVerification.success) {
          setIsVerified(true);
        }
      } catch (error) {
        setIsVerified(false);
      }
    };
    verify();
  }, [token]);

  return (
    <div className="flex items-center justify-center min-h-screen p-4 ">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center text-center gap-6 py-8">
          <Image
            src={isVerified ? VerifiedImg : VerifiedFailedImg}
            height={200}
            width={200}
            alt={isVerified ? "Verified" : "Verification Failed"}
            className="h-[100px] w-auto"
          />
          <h1
            className={`text-2xl font-bold ${
              isVerified ? "text-green-500" : "text-red-500"
            }`}
          >
            {isVerified
              ? "Email Verification Success!"
              : "Email Verification Failed!"}
          </h1>
          <Button asChild>
            <Link href={WEBSITE_HOME}>Continue Shopping</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EMailVerification;
