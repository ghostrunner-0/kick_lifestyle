// /app/api/coupons/create/route.js
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import { isAuthenticated } from "@/lib/Authentication";
import Coupon from "@/models/Coupon.model";
import { couponSchema } from "@/lib/zodSchema"; // make sure this is exported

export async function POST(req) {
  try {
    const admin = await isAuthenticated("admin");
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();

    const payload = await req.json();

    // Validate incoming data; omit fields the server controls
    const formSchema = couponSchema.omit({
      redemptionsTotal: true,
      deletedAt: true,
    });

    const parsed = formSchema.safeParse(payload);
    if (!parsed.success) {
      return response(
        false,
        400,
        "Invalid or missing fields",
        parsed.error.format()
      );
    }

    // Normalize + extra safety
    const data = parsed.data;

    // Uppercase code (also handled in model pre-save, but we do it here for queries)
    const code = String(data.code).trim().toUpperCase();

    // If percentage, keep it sane (0–100)
    if (data.discountType === "percentage" && data.discountAmount > 100) {
      return response(false, 400, "Percentage discount cannot exceed 100%");
    }

    // If changeAfterUsage is set, you *can* optionally require newDiscountType/Amount
    // Uncomment to enforce:
    // if (data.changeAfterUsage > 0 && (!data.newDiscountType || data.newDiscountAmount == null)) {
    //   return response(false, 400, "Provide newDiscountType and newDiscountAmount when changeAfterUsage > 0");
    // }

    // Prevent duplicate active code (ignoring soft-deleted)
    const dup = await Coupon.findOne({ code, deletedAt: null }).lean();
    if (dup) {
      return response(false, 409, "A coupon with this code already exists");
    }

    // Build doc
    const doc = {
      code,
      discountType: data.discountType,
      discountAmount: data.discountAmount,
      individualUse: !!data.individualUse,

      freeItem: data.freeItem
        ? {
            variant: data.freeItem.variant ?? null,
            qty: data.freeItem.qty ?? 1,
          }
        : { variant: null, qty: 1 },

      specificProducts: Array.isArray(data.specificProducts)
        ? data.specificProducts
        : [],
      specificVariants: Array.isArray(data.specificVariants)
        ? data.specificVariants
        : [],

      perUserLimit:
        data.perUserLimit == null ? 0 : Number(data.perUserLimit || 0),
      totalLimit: data.totalLimit == null ? 0 : Number(data.totalLimit || 0),

      // advanced switching (optional)
      changeAfterUsage:
        data.changeAfterUsage == null
          ? 0
          : Number(data.changeAfterUsage || 0),
      newDiscountType: data.newDiscountType ?? null,
      newDiscountAmount:
        data.newDiscountAmount == null ? null : Number(data.newDiscountAmount),
      // redemptionsTotal starts at 0 by default (schema)
    };

    const created = await Coupon.create(doc);
    return response(true, 201, "Coupon created successfully!", created);
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
