"use client";

import React, { useState } from "react";
import Logo from "@/public/assets/images/logo-black.png";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { zSchema } from "@/lib/zodSchema";
import { WEBSITE_LOGIN } from "@/routes/WebsiteRoutes";
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
import UpdatePassword from "@/components/application/UpdatePassword";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";

/* Brand gold */
const GOLD = "#fcba17";

/* GlowBorder wrapper for desktop only */
const GlowBorder = ({ children }) => (
  <div className="relative hidden sm:block rounded-3xl p-[1px] overflow-hidden">
    <div className="absolute inset-0 opacity-60 blur-xl bg-[conic-gradient(at_top_left,_#fcba17,_#ffd75e,_#fcba17)]" />
    <div className="relative rounded-3xl bg-white/90 dark:bg-slate-900/70 backdrop-blur-xl border border-white/50 dark:border-white/10">
      {children}
    </div>
  </div>
);

const ResetPassword = () => {
  const FormSchema = zSchema.pick({ email: true });
  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: { email: "" },
  });

  const [emailVerficationLoading, setEmailVerficationLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpEmail, setOtpEmail] = useState(null);
  const [isOtpVerified, setIsOtpVerified] = useState(false);

  const handleEmailVerification = async (values) => {
    setEmailVerficationLoading(true);
    try {
      const response = await axios.post("/api/auth/reset-password/send-otp", values);
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
      const res = await axios.post("/api/auth/reset-password/verify-otp", { values });
      if (res?.error) throw new Error(res.error);

      showToast("success", "OTP verified successfully");
      setIsOtpVerified(true);
    } catch (error) {
      showToast("error", error.message || "Failed to verify OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  // Shared form content
  const FormContent = (
    <>
      <div className="mb-6 flex items-center justify-center">
        <Image
          src={Logo}
          alt="Kick Lifestyle"
          width={640}
          height={640}
          className="h-auto w-[140px] sm:w-[170px]"
          priority
        />
      </div>

      {!otpEmail ? (
        <>
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">
              Reset Password
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Enter your email to receive a reset OTP.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEmailVerification)} className="space-y-5">
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
                        autoComplete="email"
                        className="h-11 rounded-xl pl-3 focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
                        style={{ ["--gold"]: GOLD }}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <ButtonLoading
                type="submit"
                text="Send OTP"
                loading={emailVerficationLoading}
                className="w-full h-11 rounded-xl bg-[var(--gold)] hover:bg-[#e0a915] text-black font-semibold border border-black/5"
                style={{ ["--gold"]: GOLD }}
              />

              <p className="text-center text-sm text-slate-600 dark:text-slate-300">
                Back to{" "}
                <Link href={WEBSITE_LOGIN} className="text-[#b88a00] hover:underline">
                  Login
                </Link>
              </p>
            </form>
          </Form>
        </>
      ) : !isOtpVerified ? (
        <OTPVerification email={otpEmail} loading={otpLoading} onsubmit={handleOtpSubmit} />
      ) : (
        <UpdatePassword email={otpEmail} />
      )}
    </>
  );

  return (
    <>
      {/* Mobile: plain form */}
      <div className="sm:hidden px-4 py-6">{FormContent}</div>

      {/* Desktop: Glow card */}
      <GlowBorder>
        <Card className="border-0 shadow-2xl rounded-3xl hidden sm:block">
          <CardContent className="px-6 sm:px-8 pt-8 pb-8">{FormContent}</CardContent>
        </Card>
      </GlowBorder>
    </>
  );
};

export default ResetPassword;
