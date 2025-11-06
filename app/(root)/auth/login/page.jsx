"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, getSession, signIn } from "next-auth/react";
import axios from "axios";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch } from "react-redux";
import { FcGoogle } from "react-icons/fc";
import { FaRegEyeSlash, FaRegEye } from "react-icons/fa6";
import { HiOutlineMail } from "react-icons/hi";
import { LuLock } from "react-icons/lu";

import { zSchema } from "@/lib/zodSchema";
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
import OTPVerification from "@/components/application/OTPVerification";
import { showToast } from "@/lib/ShowToast";
import { Login } from "@/store/reducer/AuthReducer";
import { Button } from "@/components/ui/button";
import AuthShell from "@/components/application/AuthShell";

// Admin routes
import {
  ADMIN_DASHBOARD,
  ADMIN_ORDERS_ALL,
  ADMIN_BANNERS_ALL,
} from "@/routes/AdminRoutes";

// Website routes
import {
  WEBSITE_FORGOT_PASSWORD,
  WEBSITE_REGISTER,
} from "@/routes/WebsiteRoutes";

/* ---------------- helpers ---------------- */
const toInternal = (url) => {
  if (!url) return "/account";
  return url.replace(/\/my-account\/?$/i, "/account");
};

const routeForRole = (role) => {
  switch ((role || "user").toLowerCase()) {
    case "admin":
      return ADMIN_DASHBOARD;
    case "sales":
      return ADMIN_ORDERS_ALL;
    case "editor":
      return ADMIN_BANNERS_ALL;
    default:
      return "/account";
  }
};

// ✅ now relative
const RESET_PASSWORD_URL = "/auth/reset-password";

export default function LoginPage() {
  const dispatch = useDispatch();
  const { data: session, status } = useSession();
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    if (session?.user) dispatch(Login(session.user));
  }, [session, dispatch]);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const cb = sp.get("callback");
      if (cb) {
        router.replace(toInternal(cb));
      } else {
        router.replace(routeForRole(session.user.role));
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

  /* ---------- OTP submit (Credentials) ---------- */
  const handleOtpSubmit = async (values) => {
    try {
      setOtpLoading(true);
      const res = await signIn("credentials", {
        redirect: false,
        email: otpEmail,
        otp: values.otp,
      });
      if (res?.error) throw new Error(res.error);

      const s = await getSession();
      if (s?.user) dispatch(Login(s.user));

      showToast("success", "OTP verified successfully");
      setOtpEmail(null);

      const cb = sp.get("callback");
      if (cb) {
        router.push(toInternal(cb));
      } else {
        router.push(routeForRole(s?.user?.role));
      }
    } catch (e) {
      showToast("error", e?.message || "Failed to verify OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  /* ---------- Login form submit (send OTP or redirect to reset) ---------- */
  const handleLoginSubmit = async (values) => {
    try {
      setLoading(true);
      const res = await axios.post("/api/auth/login", values);

      // success → OTP flow
      if (!res?.data?.success)
        throw new Error(res?.data?.message || "Login failed");
      showToast("success", res.data.message);
      setOtpEmail(values.email);
      form.reset();
    } catch (e) {
      const status = e?.response?.status;
      const action = e?.response?.data?.action;
      const redirectURL = e?.response?.data?.redirectURL;

      if (status === 409 && action === "RESET_REQUIRED") {
        showToast(
          "info",
          "Password reset required. Please set a new password to continue."
        );

        const target =
          redirectURL ||
          `${RESET_PASSWORD_URL}?email=${encodeURIComponent(values.email)}`;

        setOtpEmail(null);
        form.reset();

        router.push(
          `${target}${
            target.includes("?") ? "&" : "?"
          }email=${encodeURIComponent(values.email)}`
        );
        return;
      }

      showToast(
        "error",
        e?.response?.data?.message || e?.message || "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Google ---------- */
  const handleGoogleClick = async (e) => {
    e.preventDefault();
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const callbackUrl = toInternal(sp.get("callback") || "/account");
      await signIn("google", { callbackUrl });
    } catch (err) {
      showToast("error", err?.message || "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  if (status === "authenticated") return null;

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-[640px] sm:max-w-[720px]">
        <div className="mb-6 text-center">
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">
            Welcome back
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
            Sign in to continue
          </p>
        </div>

        {!otpEmail ? (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleLoginSubmit)}
              className="space-y-5"
            >
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <div className="relative">
                      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <HiOutlineMail size={18} />
                      </div>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          className="h-11 rounded-xl pl-10 focus-visible:ring-2 focus-visible:ring-[#fcba17]"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <div className="relative">
                      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <LuLock size={18} />
                      </div>
                      <FormControl>
                        <Input
                          type={isPasswordVisible ? "text" : "password"}
                          placeholder="Your password"
                          autoComplete="current-password"
                          className="h-11 rounded-xl pl-10 pr-10 focus-visible:ring-2 focus-visible:ring-[#fcba17]"
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        onClick={() => setIsPasswordVisible((p) => !p)}
                        aria-label={
                          isPasswordVisible ? "Hide password" : "Show password"
                        }
                      >
                        {isPasswordVisible ? <FaRegEye /> : <FaRegEyeSlash />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Meta row */}
              <div className="flex items-center justify-between text-sm">
                <div className="text-slate-500 dark:text-slate-400" />
                <Link
                  href={WEBSITE_FORGOT_PASSWORD}
                  className="text-[#b88a00] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Primary */}
              <ButtonLoading
                type="submit"
                text="Continue"
                loading={loading}
                className="w-full h-11 rounded-xl bg-[#fcba17] hover:bg-[#e0a915] text-black font-semibold border border-black/5"
              />

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white/90 dark:bg-slate-900/70 backdrop-blur px-2 text-slate-500 dark:text-slate-400">
                    or
                  </span>
                </div>
              </div>

              {/* Google */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 rounded-xl flex items-center gap-2 justify-center border-slate-300 hover:bg-slate-50"
                onClick={handleGoogleClick}
                disabled={googleLoading}
              >
                <FcGoogle size={20} />
                {googleLoading ? "Signing in…" : "Continue with Google"}
              </Button>

              {/* Register */}
              <p className="text-center text-sm text-slate-600 dark:text-slate-300">
                Don’t have an account?{" "}
                <Link
                  href={WEBSITE_REGISTER}
                  className="text-[#b88a00] hover:underline"
                >
                  Create an account
                </Link>
              </p>
            </form>
          </Form>
        ) : (
          <OTPVerification
            email={otpEmail}
            loading={otpLoading}
            onsubmit={handleOtpSubmit}
          />
        )}
      </div>
    </AuthShell>
  );
}
