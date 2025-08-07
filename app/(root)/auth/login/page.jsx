"use client";

import { signIn } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // correct import for router
import { FcGoogle } from "react-icons/fc";
import Logo from "@/public/assets/images/logo-black.png";
import axios from "axios";
import { useSession, getSession } from "next-auth/react";

import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { FaRegEyeSlash } from "react-icons/fa";
import { FaRegEye } from "react-icons/fa6";
import { zodResolver } from "@hookform/resolvers/zod";
import { zSchema } from "@/lib/zodSchema";
import { Button } from "@/components/ui/button";
import {
  USER_DASHABOARD,
  WEBSITE_FORGOT_PASSWORD,
  WEBSITE_HOME,
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
import { ADMIN_DASHBOARD } from "@/routes/AdminRoutes";

const LoginPage = () => {
  const dispatch = useDispatch();
  const { data: session } = useSession();
  const router = useRouter();

  // Use URLSearchParams from window.location.search
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );

  // Update Redux when session changes
  useEffect(() => {
    if (session?.user) {
      dispatch(Login(session.user));
    }
  }, [session, dispatch]);

  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpEmail, setOtpEmail] = useState(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Form schema for login input (email + password)
  const formSchema = zSchema.pick({ email: true }).extend({
    password: z.string().min(3, { message: "Password field is required" }),
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Handle OTP verification by calling next-auth credentials provider
  const handleOtpSubmit = async (values) => {
    try {
      setOtpLoading(true);
      const res = await signIn("credentials", {
        redirect: false, // prevent automatic redirect to handle response manually
        email: otpEmail,
        otp: values.otp,
      });

      if (res?.error) {
        throw new Error(res.error);
      }

      showToast("success", "OTP verified successfully");

      setOtpEmail(null);

      const callbackUrl = searchParams.get("callback");
      const Mainsession = await getSession();

      if (callbackUrl) {
        router.push(callbackUrl);
      } else if (Mainsession?.user?.role === "admin") {
        router.push(ADMIN_DASHBOARD);
      } else {
        router.push(USER_DASHABOARD);
      }
    } catch (error) {
      showToast("error", error.message || "Failed to verify OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  // Initial login submission - calls your API to verify email+password and send OTP
  const handleLoginSubmit = async (values) => {
    try {
      setLoading(true);
      const { data: loginResponse } = await axios.post(
        "/api/auth/login",
        values
      );

      if (!loginResponse.success) {
        throw new Error(loginResponse.message);
      }

      showToast("success", loginResponse.message);
      setOtpEmail(values.email);
      form.reset();
    } catch (error) {
      showToast("error", error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-[400px]">
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
              <h1 className="text-3xl font-bold">Welcome Back!</h1>
              <p>Login into your account.</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleLoginSubmit)}>
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
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="relative">
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type={isPasswordVisible ? "text" : "password"}
                            placeholder="*******"
                            {...field}
                            className="pr-10"
                          />
                        </FormControl>
                        <button
                          type="button"
                          className="absolute right-3 top-[38px] transform -translate-y-1/2 text-gray-500"
                          onClick={() => setIsPasswordVisible((prev) => !prev)}
                        >
                          {isPasswordVisible ? <FaRegEye /> : <FaRegEyeSlash />}
                        </button>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mb-5">
                  <ButtonLoading
                    type="submit"
                    text="Login"
                    loading={loading}
                    className="w-full"
                  />
                </div>

                <div className="mb-5">
                  <Button
                    variant="outline"
                    className="w-full flex items-center gap-2 justify-center"
                    onClick={() => signIn("google", { callbackUrl: "/" })}
                  >
                    <FcGoogle size={20} />
                    Continue with Google
                  </Button>
                </div>

                <div className="text-center text-xs">
                  <p className="mb-2">
                    Don’t have an account?{" "}
                    <Link
                      href={WEBSITE_REGISTER}
                      className="text-primary underline"
                    >
                      Create an Account!
                    </Link>
                  </p>
                  <Link
                    href={WEBSITE_FORGOT_PASSWORD}
                    className="text-primary underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
              </form>
            </Form>
          </>
        ) : (
          <OTPVerification
            email={otpEmail}
            loading={otpLoading}
            onsubmit={handleOtpSubmit}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default LoginPage;
