"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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
import { FaRegEyeSlash } from "react-icons/fa";
import { FaRegEye } from "react-icons/fa6";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { zSchema } from "@/lib/zodSchema";
import { WEBSITE_LOGIN } from "@/routes/WebsiteRoutes";
import { showToast } from "@/lib/ShowToast";
import axios from "axios";

const UpdatePassword = ({ email }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConPasswordVisible, setIsConPasswordVisible] = useState(false);

  const formSchema = zSchema
    .pick({ password: true })
    .extend({
      confirmPassword: z.string(),
      email: z.string().email(), // add email validation here
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: `Passwords don't match`,
      path: ["confirmPassword"],
    });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: email || "",
      password: "",
      confirmPassword: "",
    },
  });

  const handlePasswordUpdate = async (values) => {
    try {
      setLoading(true);
      const { data: registerResponse } = await axios.put(
        "/api/auth/reset-password/update-password",
        values
      );
      if (!registerResponse.success) {
        throw new Error(registerResponse.message);
      }
      form.reset();
      showToast("success", registerResponse.message);
      router.push(WEBSITE_LOGIN);
    } catch (error) {
      showToast("error", error.message || "Password update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="lg:text-3xl font-bold md:text-xl mt-3">
          Create New Password
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handlePasswordUpdate)}>
          {/* Hidden email field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => <input type="hidden" {...field} />}
          />

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
              text="Update Password"
              loading={loading}
              className="w-full cursor-pointer"
            />
          </div>
        </form>
      </Form>
    </div>
  );
};

export default UpdatePassword;
