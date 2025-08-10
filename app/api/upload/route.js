import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { connectDB } from "@/lib/DB";
import Media from "@/models/Media.model";
import Tag from "@/models/Tag.model";

export const config = {
  api: {
    bodyParser: false, // important for formData()
  },
};

export async function POST(req) {
  try {
    await connectDB();

    // You can add your isAuthenticated check here if needed
    // const user = await isAuthenticated(req);
    // if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const files = formData.getAll("files");
    const tagIdsRaw = formData.get("tags");

    if (!files || files.length === 0) {
      return Response.json({ error: "No files provided" }, { status: 400 });
    }

    if (!tagIdsRaw) {
      return Response.json({ error: "Tag is required" }, { status: 400 });
    }

    const tagIds = tagIdsRaw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    // Optional: verify tags exist
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

      // Save in /shared folder in your project root
      const uploadDir = path.join(process.cwd(), "shared");

      // Make sure shared folder exists, else create it (optional)
      try {
        await writeFile(path.join(uploadDir, ".keep"), ""); // try touching a file to check folder
      } catch {
        await import("fs").then(fs => fs.promises.mkdir(uploadDir, { recursive: true }));
      }

      const uploadPath = path.join(uploadDir, fileName);

      await writeFile(uploadPath, buffer);

      const media = new Media({
        filename: file.name,
        path: `/shared/${fileName}`, // Path for your Next.js config rewrite
        mimeType: file.type,
        size: file.size,
        alt: file.name,
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
