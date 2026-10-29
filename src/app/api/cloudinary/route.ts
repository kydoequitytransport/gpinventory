import { cloudinaryFolder } from "@/lib/cloudinary";
import { uploadCatalogImage } from "@/lib/cloudinary-upload";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const formData = await request.formData();
  const folder = cloudinaryFolder(String(formData.get("kind") ?? ""));
  if (!folder) return Response.json({ error: "Choose a product or category image." }, { status: 400 });

  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return Response.json({ error: "Choose an image file." }, { status: 400 });
  }

  const uploaded = await uploadCatalogImage(file, folder);
  if ("error" in uploaded) {
    const status = uploaded.error.includes("not set up") ? 503 : 400;
    return Response.json({ error: uploaded.error }, { status });
  }

  return Response.json({ url: uploaded.url });
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("gp_profiles")
    .select("role")
    .eq("id", data.claims.sub)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return Response.json({ error: "Only an admin can upload images." }, { status: 403 });
  }

  return null;
}
