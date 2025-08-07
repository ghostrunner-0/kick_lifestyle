import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { zSchema } from "@/lib/zodSchema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import ButtonLoading from "@/components/application/ButtonLoading";
import { Button } from "@/components/ui/button";
import { set } from "mongoose";
import axios from "axios";
import { da } from "zod/v4/locales";
import { showToast } from "@/lib/ShowToast";
const OTPVerification = ({ email, onsubmit, loading }) => {
  const [reSendingOTP, setReSendingOTP] = React.useState(false);
  const resendOTP = async (email) => {
    try {
      setReSendingOTP(true);
      const { data: res } = await axios.post("/api/auth/resend-otp", { email });
      if (!res.success) {
        throw new Error(res.message || "Failed to resend OTP");
      }
      showToast("success", res.message);
    } catch (error) {
      showToast("error", error.message || "Failed to resend OTP");
    } finally {
      setReSendingOTP(false);
    }
  };
  const formSchema = zSchema.pick({
    otp: true,
    email: true,
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      otp: "",
      email: email || "",
    },
  });

  const handleOtpVerification = async (values) => {
    onsubmit(values);
  };

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleOtpVerification)}>
          <div className="text-center px-4">
            <h1 className="text-base font-bold mb-1">
              Please Complete Verification
            </h1>
            <p className="text-xs text-gray-600">
              We have sent a one-time password (OTP) to your registered email
              address.
              <br />
              The OTP is valid for <strong>10 minutes</strong> only.
            </p>
          </div>

          <div className="mb-5 mt-5 flex justify-center">
            <FormField
              control={form.control}
              name="otp"
              render={({ field }) => (
                <FormItem className="flex flex-col items-center">
                  <FormLabel className="font-semibold">OTP</FormLabel>
                  <FormControl>
                    <InputOTP maxLength={6} {...field}>
                      <InputOTPGroup>
                        {[...Array(6)].map((_, idx) => (
                          <InputOTPSlot
                            className="text-xl size-10"
                            key={idx}
                            index={idx}
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mb-5 text-center">
            <ButtonLoading
              type="submit"
              text="Verify OTP"
              loading={loading}
              className="w-full"
            />
            <button
              type="button"
              onClick={() => resendOTP(email)}
              className="text-yellow-300 cursor-pointer hover:underline mt-5"
            >
              Resend OTP
            </button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default OTPVerification;
