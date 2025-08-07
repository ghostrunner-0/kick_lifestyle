import { connectDB } from "@/lib/DB";
import Tag from "@/models/Tag.model";

export async function GET() {
  try {
    await connectDB();
    const tags = await Tag.find().sort({ createdAt: -1 }).lean();
    return Response.json(tags);
  } catch (err) {
    console.error("GET /api/tags error:", err);
    return Response.json({ error: "Failed to fetch tags." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const { name } = await req.json();

    if (!name || name.trim() === "") {
      return Response.json({ error: "Tag name is required." }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/\s+/g, "-");

    // Check for existing tag
    let existing = await Tag.findOne({ slug });
    if (existing) {
      return Response.json(existing); // Return existing instead of error
    }

    const tag = new Tag({ name: name.trim(), slug });
    await tag.save();

    return Response.json(tag);
  } catch (err) {
    console.error("POST /api/tags error:", err);
    return Response.json({ error: "Failed to create tag." }, { status: 500 });
  }
}
