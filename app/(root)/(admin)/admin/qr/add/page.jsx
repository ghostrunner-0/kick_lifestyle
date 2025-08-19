"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import BreadCrumb from "@/components/application/admin/BreadCrumb";
import { ADMIN_DASHBOARD } from "@/routes/AdminRoutes";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import ButtonLoading from "@/components/application/ButtonLoading";
import MediaSelector from "@/components/application/admin/MediaSelector";
import { showToast } from "@/lib/ShowToast";
import Image from "next/image";
import { zSchema } from "@/lib/zodSchema";

const BreadCrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: "/admin/qr", label: "QR Payments" },
  { href: "", label: "Configure" },
];

const formSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required"),
  image: zSchema.shape.image, // {_id, alt, path}
});

const sanitizeMedia = (file) =>
  file
    ? {
        _id: file._id,
        alt: file.alt || "",
        path: file.path,
      }
    : undefined;

export default function AdminQrConfigPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
      image: undefined,
    },
  });

  // Load existing single-entry config (if any)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get("/api/admin/payments/qr/config", {
          withCredentials: true,
        });
        if (mounted && data?.success && data?.data) {
          setExistingId(data.data._id || null);
          form.reset({
            displayName: data.data.displayName || "",
            image: data.data.image || undefined,
          });
        }
      } catch (e) {
        // no config yet or error — ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [form]);

  const imagePreview = useMemo(() => {
    const img = form.getValues("image");
    return img?.path || "";
  }, [form.watch("image")]); // re-run on image change

  const onSubmit = async (values) => {
    try {
      setSaving(true);
      const method = existingId ? "put" : "post";
      console.log(method)
      const { data } = await axios({
        method,
        url: "/api/admin/payments/qr/config",
        data: values,
        withCredentials: true,
      });


      if (!data?.success) throw new Error(data?.message || "Save failed");

      setExistingId(data?.data?._id || existingId);
      showToast("success", "QR configuration saved.");
    } catch (e) {
      showToast("error", e?.response?.data?.message || e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />
      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="py-0 px-3 border-b [.border-b]:pb-2">
          <h4 className="text-xl font-semibold mt-3">QR Configuration</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Set the account name and upload the QR image shown on checkout.
          </p>
        </CardHeader>
        <CardContent className="pb-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* Name */}
              <div className="mb-5">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="e.g. Your Company Pvt. Ltd." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* QR Image */}
              <div className="mb-5">
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>QR Image</FormLabel>
                      <MediaSelector
                        multiple={false}
                        onSelect={(selected) => {
                          if (Array.isArray(selected) && selected.length > 0) {
                            field.onChange(sanitizeMedia(selected[0]));
                          } else if (selected) {
                            field.onChange(sanitizeMedia(selected));
                          } else {
                            field.onChange(undefined);
                          }
                        }}
                        triggerLabel={field.value ? "Change Image" : "Select Image"}
                      />
                      <div className="mt-3">
                        {imagePreview ? (
                          <div className="inline-block rounded-lg border bg-white p-2">
                            <Image
                              src={imagePreview}
                              alt={form.getValues("displayName") || "QR"}
                              width={220}
                              height={220}
                              className="rounded-md object-contain"
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No image selected.
                          </p>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mb-5">
                <ButtonLoading
                  type="submit"
                  text={existingId ? "Update" : "Save"}
                  loading={saving || loading}
                  className="w-full"
                />
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
