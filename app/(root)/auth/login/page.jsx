"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, getSession, signIn } from "next-auth/react";
import axios from "axios";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";

import Logo from "@/public/assets/images/logo-black.png";
import { FcGoogle } from "react-icons/fc";
import { FaRegEyeSlash } from "react-icons/fa";
import { FaRegEye } from "react-icons/fa6";

import { zSchema } from "@/lib/zodSchema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import ButtonLoading from "@/components/application/ButtonLoading";
import OTPVerification from "@/components/application/OTPVerification";
import { showToast } from "@/lib/ShowToast";

import { useDispatch } from "react-redux";
import { Login } from "@/store/reducer/AuthReducer";

import {
  USER_DASHABOARD,
  WEBSITE_FORGOT_PASSWORD,
  WEBSITE_REGISTER,
} from "@/routes/WebsiteRoutes";
import { ADMIN_DASHBOARD } from "@/routes/AdminRoutes";

const LoginPage = () => {
  const dispatch = useDispatch();
  const { data: session, status } = useSession();
  const router = useRouter();
  const sp = useSearchParams();

  // Keep Redux synced with NextAuth
  useEffect(() => {
    if (session?.user) dispatch(Login(session.user));
  }, [session, dispatch]);

  // If already logged in, bounce out of /auth/login immediately
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // same redirect logic used after OTP/Google
      const callbackUrl = sp.get("callback");
      if (callbackUrl) {
        router.replace(callbackUrl);
      } else if (session.user.role === "admin") {
        router.replace(ADMIN_DASHBOARD);
      } else {
        router.replace(USER_DASHABOARD);
      }
    }
  }, [status, session, router, sp]);

  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [otpEmail, setOtpEmail] = useState(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const formSchema = zSchema.pick({ email: true }).extend({
    password: z.string().min(3, { message: "Password field is required" }),
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  // --- OTP step (credentials) ---
  const handleOtpSubmit = async (values) => {
    try {
      setOtpLoading(true);
      const res = await signIn("credentials", {
        redirect: false,
        email: otpEmail,
        otp: values.otp,
      });
      if (res?.error) throw new Error(res.error);

      // Pull session, push to Redux (extra safety)
      const s = await getSession();
      if (s?.user) dispatch(Login(s.user));

      showToast("success", "OTP verified successfully");
      setOtpEmail(null);

      const callbackUrl = sp.get("callback");
      if (callbackUrl) router.push(callbackUrl);
      else if (s?.user?.role === "admin") router.push(ADMIN_DASHBOARD);
      else router.push(USER_DASHABOARD);
    } catch (e) {
      showToast("error", e?.message || "Failed to verify OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  // Step 1 for OTP flow — call your API
  const handleLoginSubmit = async (values) => {
    try {
      setLoading(true);
      const { data } = await axios.post("/api/auth/login", values);
      if (!data?.success) throw new Error(data?.message || "Login failed");

      showToast("success", data.message);
      setOtpEmail(values.email);
      form.reset();
    } catch (e) {
      showToast("error", e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // --- Google OAuth — non-submit button, plus dispatch after session is ready ---
  const handleGoogleClick = async (e) => {
    e.preventDefault();
    if (googleLoading) return;
    setGoogleLoading(true);

    try {
      const callbackUrl = sp.get("callback") || "/";
      // Use redirect: true for a clean flow; Redux will be updated on return via useSession effect
      await signIn("google", { callbackUrl });
    } catch (err) {
      showToast("error", err?.message || "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  // While we’re redirecting an authenticated user, render nothing
  if (status === "authenticated") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="grid place-items-center min-h-[70vh] p-4"
    >
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        <Card className="w-[400px] max-w-full">
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
                              <Input type="email" placeholder="example@gmail.com" {...field} />
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
                              className="absolute right-3 top-[38px] -translate-y-1/2 text-gray-500"
                              onClick={() => setIsPasswordVisible((p) => !p)}
                              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                            >
                              {isPasswordVisible ? <FaRegEye /> : <FaRegEyeSlash />}
                            </button>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="mb-5">
                      <ButtonLoading type="submit" text="Login" loading={loading} className="w-full" />
                    </div>

                    <motion.div
                      className="mb-5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25, delay: 0.05 }}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full flex items-center gap-2 justify-center"
                        onClick={handleGoogleClick}
                        disabled={googleLoading}
                      >
                        <FcGoogle size={20} />
                        {googleLoading ? "Signing in..." : "Continue with Google"}
                      </Button>
                    </motion.div>

                    <div className="text-center text-xs">
                      <p className="mb-2">
                        Don’t have an account?{" "}
                        <Link href={WEBSITE_REGISTER} className="text-primary underline">
                          Create an Account!
                        </Link>
                      </p>
                      <Link href={WEBSITE_FORGOT_PASSWORD} className="text-primary underline">
                        Forgot Password?
                      </Link>
                    </div>
                  </form>
                </Form>
              </>
            ) : (
              <OTPVerification email={otpEmail} loading={otpLoading} onsubmit={handleOtpSubmit} />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default LoginPage;
