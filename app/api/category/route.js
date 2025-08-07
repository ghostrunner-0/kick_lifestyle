import { isAuthenticated } from "@/lib/Authentication";
import { connectDB } from "@/lib/DB";
import { catchError, response } from "@/lib/helperFunctions";
import Category from "@/models/Category.model";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const admin = await isAuthenticated("admin"); // await if it's async
    if (!admin) return response(false, 403, "User Unauthorized");

    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const start = parseInt(searchParams.get("start") || 0, 10);
    const size = parseInt(searchParams.get("size") || 25, 10);
    const filters = JSON.parse(searchParams.get("filters") || "[]");
    const globalFilters = searchParams.get("globalFilter") || "";
    const sorting = JSON.parse(searchParams.get("sorting") || "[]");
    const deleType = searchParams.get("deleType");
    
    // Construct the matchQuery object based on filter conditions
    let matchQuery = {};
    
    if (deleType === "SD") {
      matchQuery = { deletedAt: null };
    } else if (deleType === "PD") {
      matchQuery = { deletedAt: { $ne: null } };
    }
    
    if (globalFilters) {
      matchQuery["$or"] = [
        { name: { $regex: globalFilters, $options: "i" } },
        { slug: { $regex: globalFilters, $options: "i" } },
      ];
    }
    
    // Apply additional filters
    filters.forEach((filter) => {
      if (filter.value) {
        matchQuery[filter.id] = { $regex: filter.value, $options: "i" }; // Case insensitive regex match
      }
    });
    
    // Sorting the results
    let sortQuery = {};
    sorting.forEach((sort) => {
      sortQuery[sort.id] = sort.desc ? -1 : 1;
    });
    
    // Aggregation pipeline for category filtering
    const aggregatePipeline = [
      { $match: matchQuery },
      { $sort: Object.keys(sortQuery).length ? sortQuery : { createdAt: -1 } },
      { $skip: start },
      { $limit: size },
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ];

    const getCategory = await Category.aggregate(aggregatePipeline);
    const rowCount = await Category.countDocuments(matchQuery);
    
    return NextResponse.json({
      data: getCategory,
      meta: { totalRowCount: rowCount },
    });
  } catch (error) {
    return catchError(error, "Something went wrong");
  }
}
