// /app/api/warranty/items/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import WarrantyRegistration from "@/models/WarrantyRegistration.model";

export const runtime = "nodejs";

/**
 * GET /api/warranty/items
 * Query:
 *  - page=1
 *  - pageSize=20 (max 200)
 *  - q= (serial/product/variant/name/phone/shop)
 *  - channel=kick|daraz|offline|khalti|all
 *  - status=all|active|expired  (createdAt + warrantyMonths)
 */
export async function GET(req) {
  try {
    const staff = await isAuthenticated(["admin", "sales"]);
    if (!staff)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(
      200,
      Math.max(1, Number(searchParams.get("pageSize") || 20))
    );
    const q = (searchParams.get("q") || "").trim();
    const channel = (searchParams.get("channel") || "all").toLowerCase();
    const status = (searchParams.get("status") || "all").toLowerCase();

    const now = new Date();

    const match = {};
    if (channel && channel !== "all") match.channel = channel;

    const rx = q
      ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      : null;

    const pipeline = [
      { $match: match },
      { $unwind: "$items" },
      {
        $addFields: {
          expiryDate: {
            $dateAdd: {
              startDate: "$createdAt", // <-- fixed key
              unit: "month",
              amount: { $ifNull: ["$items.warrantyMonths", 12] },
              // timezone: "UTC" // optional
            },
          },
        },
      },
    ];

    if (rx) {
      pipeline.push({
        $match: {
          $or: [
            { "items.serial": rx },
            { "items.product.productName": rx },
            { "items.product.variantName": rx },
            { "customer.name": rx },
            { "customer.phone": rx },
            { shopName: rx },
          ],
        },
      });
    }

    if (status === "active") {
      pipeline.push({ $match: { expiryDate: { $gt: now } } });
    } else if (status === "expired") {
      pipeline.push({ $match: { expiryDate: { $lte: now } } });
    }

    pipeline.push(
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $facet: {
          rows: [
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
            {
              $project: {
                _id: 0,
                registrationId: "$_id",
                createdAt: 1,
                channel: 1,
                shopName: 1,
                darazOrderId: 1,
                customer: 1,
                product: "$items.product",
                serial: "$items.serial",
                warrantyMonths: "$items.warrantyMonths",
                expiryDate: 1,
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      }
    );

    const res = await WarrantyRegistration.aggregate(pipeline);
    const rows = res?.[0]?.rows || [];
    const total = res?.[0]?.totalCount?.[0]?.count || 0;

    return NextResponse.json({ page, pageSize, total, items: rows });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "List failed" },
      { status: 500 }
    );
  }
}
