"use client";

import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { FaRegEyeSlash } from "react-icons/fa";
import { FaRegEye } from "react-icons/fa6";
import { HiOutlineUser, HiOutlineMail, HiOutlinePhone } from "react-icons/hi";
import { LuLock } from "react-icons/lu";

import { zSchema } from "@/lib/zodSchema";
import { WEBSITE_LOGIN } from "@/routes/WebsiteRoutes";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import ButtonLoading from "@/components/application/ButtonLoading";
import { signIn } from "next-auth/react";
import { showToast } from "@/lib/ShowToast";
import AuthShell from "@/components/application/AuthShell";

const GOLD = "#fcba17";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConPasswordVisible, setIsConPasswordVisible] = useState(false);

  const formSchema = zSchema
    .pick({ email: true, password: true, name: true })
    .extend({
      phone: z.string()
        .min(10, "Phone number must be at least 10 digits")
        .max(15, "Phone number must be no more than 15 digits")
        .regex(/^[0-9]+$/, "Phone number must contain only digits"),
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "" },
  });

  const handleRegisterSubmit = async (values) => {
    try {
      setLoading(true);
      const { data } = await axios.post("/api/auth/register", values);
      if (!data?.success) throw new Error(data?.message || "Registration failed");
      form.reset();
      showToast("success", data.message);
    } catch (error) {
      showToast("error", error?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">Create your account</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Join Kick Lifestyle and unlock member benefits
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleRegisterSubmit)} className="space-y-5">
          {/* Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <HiOutlineUser size={18} />
                    </div>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Kick Lifestyle"
                        className="h-11 rounded-xl pl-10 focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
                        style={{ ["--gold"]: GOLD }}
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <HiOutlinePhone size={18} />
                    </div>
                    <FormControl>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        placeholder="98XXXXXXXX"
                        className="h-11 rounded-xl pl-10 focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
                        style={{ ["--gold"]: GOLD }}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
                      placeholder="example@gmail.com"
                      autoComplete="email"
                      className="h-11 rounded-xl pl-10 focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
                      style={{ ["--gold"]: GOLD }}
                      {...field}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password + Confirm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="h-11 rounded-xl pl-10 pr-10 focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
                        style={{ ["--gold"]: GOLD }}
                        {...field}
                      />
                    </FormControl>
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      onClick={() => setIsPasswordVisible((p) => !p)}
                    >
                      {isPasswordVisible ? <FaRegEye /> : <FaRegEyeSlash />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <LuLock size={18} />
                    </div>
                    <FormControl>
                      <Input
                        type={isConPasswordVisible ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="h-11 rounded-xl pl-10 pr-10 focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
                        style={{ ["--gold"]: GOLD }}
                        {...field}
                      />
                    </FormControl>
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      onClick={() => setIsConPasswordVisible((p) => !p)}
                    >
                      {isConPasswordVisible ? <FaRegEye /> : <FaRegEyeSlash />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Submit */}
          <ButtonLoading
            type="submit"
            text="Create account"
            loading={loading}
            className="w-full h-11 rounded-xl bg-[var(--gold)] hover:bg-[#e0a915] text-black font-semibold border border-black/5"
            style={{ ["--gold"]: GOLD }}
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
            variant="outline"
            className="w-full h-11 rounded-xl flex items-center gap-2 justify-center border-slate-300 hover:bg-slate-50"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            type="button"
          >
            <FcGoogle size={20} />
            Continue with Google
          </Button>

          {/* Login Link */}
          <p className="text-center text-sm text-slate-600 dark:text-slate-300">
            Already have an account?{" "}
            <Link href={WEBSITE_LOGIN} className="text-[#b88a00] hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </Form>
    </AuthShell>
  );
}
