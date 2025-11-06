import { connectDB } from "@/lib/DB";
import Tag from "@/models/Tag.model";

export async function PATCH(req, { params }) {
  try {
    await connectDB();
    const { id } = params;
    const { name } = await req.json();

    if (!name || name.trim() === "")
      return Response.json({ error: "Tag name is required." }, { status: 400 });

    const slug = name.toLowerCase().replace(/\s+/g, "-");

    const updatedTag = await Tag.findByIdAndUpdate(
      id,
      { name: name.trim(), slug },
      { new: true }
    );

    if (!updatedTag)
      return Response.json({ error: "Tag not found." }, { status: 404 });

    return Response.json(updatedTag);
  } catch (err) {
    console.error("PATCH /api/admin/tags/[id] error:", err);
    return Response.json({ error: "Failed to update tag." }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    await connectDB();
    const { id } = params;
    const deleted = await Tag.findByIdAndDelete(id);

    if (!deleted)
      return Response.json({ error: "Tag not found." }, { status: 404 });

    return Response.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/tags/[id] error:", err);
    return Response.json({ error: "Failed to delete tag." }, { status: 500 });
  }
}
