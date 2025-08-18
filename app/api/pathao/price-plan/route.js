// app/api/pathao/price-plan/route.js
import { NextResponse } from "next/server";
import { pathaoPost, resolvePathaoStoreId } from "@/lib/pathaoClient";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    const {
      // Per Pathao docs
      item_type = 2,        // 1=document, 2=parcel
      delivery_type = 48,   // 48=normal, 12=on-demand
      item_weight = 0.5,    // kg (min 0.5)
      recipient_city,
      recipient_zone,
      // Optional override (e.g., for multi-store setups)
      store_id: overrideStoreId,
    } = body || {};

    if (!recipient_city || !recipient_zone) {
      return NextResponse.json(
        {
          success: false,
          message: "recipient_city and recipient_zone are required",
          data: {},
        },
        { status: 400 }
      );
    }

    // Resolve store_id via env PATHAO_STORE_ID or by fetching /stores
    const resolvedStoreId = await resolvePathaoStoreId();
    const store_id = Number(overrideStoreId ?? resolvedStoreId);

    if (!store_id || Number.isNaN(store_id)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to resolve Pathao store_id. Set PATHAO_STORE_ID or ensure your Pathao account has at least one active store.",
          data: {},
        },
        { status: 400 }
      );
    }

    const payload = {
      store_id,
      item_type: Number(item_type) || 2,
      delivery_type: Number(delivery_type) || 48,
      item_weight: Math.max(0.5, Number(item_weight) || 0.5),
      recipient_city: Number(recipient_city),
      recipient_zone: Number(recipient_zone),
    };

    const resp = await pathaoPost("/aladdin/api/v1/merchant/price-plan", payload);

    // Pathao returns: { message, type, code, data: { price, final_price, ... } }
    const data = resp?.data ?? resp;

    return NextResponse.json(
      {
        success: true,
        message: resp?.message || "price",
        data,
      },
      { status: 200 }
    );
  } catch (err) {
    const status = err?.response?.status ?? 500;
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Failed to fetch price plan";
    return NextResponse.json(
      {
        success: false,
        statusCode: status,
        message: msg,
        data: err?.response?.data || {},
      },
      { status }
    );
  }
}
