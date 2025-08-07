"use client";
import { Card, CardContent } from "@/components/ui/card";
import React, { useState } from "react";
import Logo from "@/public/assets/images/logo-black.png";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { FaRegEyeSlash } from "react-icons/fa";
import { FaRegEye } from "react-icons/fa6";
import { zodResolver } from "@hookform/resolvers/zod";
import { zSchema } from "@/lib/zodSchema";
import { Button } from "@/components/ui/button";
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
import { FcGoogle } from "react-icons/fc";
import { signIn } from "next-auth/react";
import axios from "axios";
import { showToast } from "@/lib/ShowToast";

const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConPasswordVisible, setIsConPasswordVisible] = useState(false);

  const formSchema = zSchema
    .pick({
      email: true,
      password: true,
      name: true,
    })
    .extend({
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: `Passwords don't match`,
      path: ["confirmPassword"],
    });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleRegisterSubmit = async (values) => {
    try {
      setLoading(true);
      const { data: registerResponse } = await axios.post(
        "/api/auth/register",
        values
      );
      if (!registerResponse.success) {
        throw new Error(registerResponse.message);
      }
      form.reset();
      showToast("success", registerResponse.message);
    } catch (error) {
      showToast("error", error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-[400px]">
      <CardContent>
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

        <div className="text-center mb-6">
          <h1 className="lg:text-3xl font-bold md:text-xl mt-3">
            Create An Account
          </h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleRegisterSubmit)}>
            <div className="mb-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Kick Lifestyle"
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
                      onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                    >
                      {isPasswordVisible ? <FaRegEye /> : <FaRegEyeSlash />}
                    </button>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mb-5">
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type={isConPasswordVisible ? "text" : "password"}
                        placeholder="*******"
                        {...field}
                        className="pr-10"
                      />
                    </FormControl>
                    <button
                      type="button"
                      className="absolute right-3 top-[38px] transform -translate-y-1/2 text-gray-500"
                      onClick={() =>
                        setIsConPasswordVisible(!isConPasswordVisible)
                      }
                    >
                      {isConPasswordVisible ? <FaRegEye /> : <FaRegEyeSlash />}
                    </button>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mb-5">
              <ButtonLoading
                type="submit"
                text="Register"
                loading={loading}
                className="w-full cursor-pointer"
              />
            </div>

            <div className="mb-5">
              <Button
                variant="outline"
                className="w-full flex items-center gap-2 justify-center"
                onClick={() => signIn("google", { callbackUrl: "/" })}
                type="button"
              >
                <FcGoogle size={20} />
                Continue with Google
              </Button>
            </div>

            <div className="text-center text-xs">
              <p className="mb-2">
                Already have an account?{" "}
                <Link href={WEBSITE_LOGIN} className="text-primary underline">
                  Login
                </Link>
              </p>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default RegisterPage;
