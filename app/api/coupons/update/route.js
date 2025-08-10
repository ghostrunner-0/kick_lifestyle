import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import { zSchema, couponSchema } from "@/lib/zodSchema";
import Coupon from "@/models/Coupon.model";

export async function PUT(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const payload = await req.json();

    // Use the dedicated coupon schema + require _id (Category style)
    const formSchema = couponSchema.extend({
      _id: zSchema.shape._id, // reuse your global _id rule
    });

    const validate = formSchema.safeParse(payload);
    if (!validate.success) {
      return response(false, 400, "Invalid or missing fields", validate.error.format());
    }

    const {
      _id,
      code,
      discountType,
      discountAmount,
      individualUse,
      freeItem,            // null OR { variant: string|null, qty?: number }
      specificProducts = [],
      specificVariants = [],
      perUserLimit = 0,
      totalLimit = 0,
      changeAfterUsage = 0,
      newDiscountType,     // null | "percentage" | "fixed"
      newDiscountAmount,   // null | number
    } = validate.data;

    const coupon = await Coupon.findOne({ _id, deletedAt: null });
    if (!coupon) {
      return response(false, 404, "Coupon not found");
    }

    // Normalization
    const uniq = (arr) => Array.from(new Set((arr || []).map(String)));

    const normalizedFreeItem =
      freeItem == null
        ? null
        : {
            variant: freeItem.variant ?? null,
            qty: (freeItem.qty ?? 1),
          };

    const normalizedNewType = newDiscountType ?? null;
    const normalizedNewAmount = normalizedNewType ? (newDiscountAmount ?? null) : null;

    // Assign
    coupon.code = code;
    coupon.discountType = discountType;
    coupon.discountAmount = discountAmount;
    coupon.individualUse = !!individualUse;

    coupon.freeItem = normalizedFreeItem;

    coupon.specificProducts = uniq(specificProducts);
    coupon.specificVariants = uniq(specificVariants);

    coupon.perUserLimit = perUserLimit ?? 0;
    coupon.totalLimit = totalLimit ?? 0;

    coupon.changeAfterUsage = changeAfterUsage ?? 0;
    coupon.newDiscountType = normalizedNewType;
    coupon.newDiscountAmount = normalizedNewAmount;

    await coupon.save();

    return response(true, 200, "Coupon updated successfully", coupon);
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
