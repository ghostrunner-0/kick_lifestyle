import { connectDB } from "@/lib/DB";
import Contact from "@/models/Contact.model";

export async function POST(req) {
  try {
    await connectDB();

    const data = await req.json();
    const { name, email, phone, message } = data;

    // Basic validation
    if (!name || !email || !message) {
      return Response.json(
        { success: false, message: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    // Save to DB
    const newContact = await Contact.create({ name, email, phone, message });

    return Response.json(
      {
        success: true,
        ok:true,
        message: "Contact form submitted successfully.",
        data: newContact,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error submitting contact form:", error);
    return Response.json(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}
