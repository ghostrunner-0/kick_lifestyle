"use client";

import { signIn } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import Logo from "@/public/assets/images/logo-black.png";
import axios from "axios";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { FaRegEyeSlash } from "react-icons/fa";
import { FaRegEye } from "react-icons/fa6";
import { zodResolver } from "@hookform/resolvers/zod";
import { zSchema } from "@/lib/zodSchema";
import { Button } from "@/components/ui/button";
import {
  WEBSITE_FORGOT_PASSWORD,
  WEBSITE_LOGIN,
  WEBSITE_REGISTER,
} from "@/routes/WebsiteRoutes";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import ButtonLoading from "@/components/application/ButtonLoading";
import Link from "next/link";
import { showToast } from "@/lib/ShowToast";
import OTPVerification from "@/components/application/OTPVerification";
import { useDispatch } from "react-redux";
import { Login } from "@/store/reducer/AuthReducer";
import UpdatePassword from "@/components/application/UpdatePassword";

const ResetPassword = () => {
  const FormSchema = zSchema.pick({ email: true });
  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
    },
  });

  const [emailVerficationLoading, setEmailVerficationLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpEmail, setOtpEmail] = useState(null);
  const [isOtpVerified, setIsOtpVerified] = useState(false);

  const handleEmailVerification = async (values) => {
    setEmailVerficationLoading(true);
    try {
      const response = await axios.post(
        "/api/auth/reset-password/send-otp",
        values
      );

      if (response.data.success) {
        showToast("success", response.data.message);
        setOtpEmail(values.email);
      } else {
        showToast("error", response.data.message);
      }
    } catch (error) {
      showToast("error", error.response?.data?.message || "Failed to send OTP");
    } finally {
      setEmailVerficationLoading(false);
    }
  };

  const handleOtpSubmit = async (values) => {
    try {
      setOtpLoading(true);
      const res = await axios.post("/api/auth/reset-password/verify-otp", {
        values,
      });

      if (res?.error) {
        throw new Error(res.error);
      }

      showToast("success", "OTP verified successfully");
      setIsOtpVerified(true);
    } catch (error) {
      showToast("error", error.message || "Failed to verify OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-center mb-4">
          <Image
            src={Logo}
            alt="Logo"
            width={Logo.width}
            height={Logo.height}
            className="max-w-[150px]"
            priority
          />
        </div>

        {!otpEmail ? (
          <>
            <div className="text-center mb-4">
              <h1 className="text-3xl font-bold">Reset Password</h1>
              <p>Enter your email for password reset.</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEmailVerification)}>
                <div className="mb-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="example@gmail.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mb-5">
                  <ButtonLoading
                    type="submit"
                    text="Reset Password"
                    loading={emailVerficationLoading}
                    className="w-full"
                  />
                </div>

                <div className="text-center text-xs">
                  <p className="mb-2">
                    Don’t have an account?{" "}
                    <Link
                      href={WEBSITE_LOGIN}
                      className="text-primary underline"
                    >
                      Back to Login
                    </Link>
                  </p>
                </div>
              </form>
            </Form>
          </>
        ) : !isOtpVerified ? (
          <OTPVerification
            email={otpEmail}
            loading={otpLoading}
            onsubmit={handleOtpSubmit}
          />
        ) : (
          <UpdatePassword email={otpEmail} />
        )}
      </CardContent>
    </Card>
  );
};

export default ResetPassword;
