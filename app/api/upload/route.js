import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import Media from "@/models/Media.model";
import Tag from "@/models/Tag.model";
import { connectDB } from "@/lib/DB";

// Disable body parser for formData
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req) {
  try {
    await connectDB();

    const formData = await req.formData();
    const files = formData.getAll("files");
    const tagIdsRaw = formData.get("tags");

    if (!files || files.length === 0) {
      return Response.json({ error: "No files provided" }, { status: 400 });
    }

    if (!tagIdsRaw) {
      return Response.json({ error: "Tag is required" }, { status: 400 });
    }

    // tags can be a single ID or comma-separated string
    const tagIds = tagIdsRaw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    // Optional: validate if all tags exist
    const existingTags = await Tag.find({ _id: { $in: tagIds } });
    if (existingTags.length !== tagIds.length) {
      return Response.json({ error: "Some tags not found." }, { status: 400 });
    }

    const uploadedMedia = [];

    for (const file of files) {
      if (typeof file === "string") continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name);
      const fileName = `${uuidv4()}${ext}`;
      const uploadPath = path.join(process.cwd(), "public/uploads", fileName);

      await writeFile(uploadPath, buffer);

      const media = new Media({
        filename: file.name,
        path: `/uploads/${fileName}`,
        mimeType: file.type,
        size: file.size,
        alt: file.name, // optional alt
        tags: tagIds,
      });

      await media.save();
      uploadedMedia.push(media);
    }

    return Response.json({ success: true, media: uploadedMedia });
  } catch (err) {
    console.error("Upload Error:", err);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
  