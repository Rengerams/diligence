"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { get, run } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

function value(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

export async function createCategoryAction(form: FormData): Promise<void> {
  const user = await requirePermission("program.manage");
  const name = value(form, "name");
  if (!name) redirect("/locaties?error=Vul+een+naam+in.");
  const existing = get<{ id: string }>("SELECT id FROM categories WHERE lower(name) = lower(?)", name);
  if (existing) redirect("/locaties?error=Deze+categorie+bestaat+al.");
  const id = `cat-${randomUUID()}`;
  run("INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)", id, name, new Date().toISOString());
  writeAudit({
    actor: user,
    action: "category.create",
    entityType: "category",
    entityId: id,
    summary: `Categorie ${name} is aangemaakt.`,
    after: { name },
  });
  revalidatePath("/locaties");
  redirect("/locaties?ok=1");
}

export async function updateLocationAction(form: FormData): Promise<void> {
  const user = await requirePermission("program.manage");
  const id = value(form, "id");
  const existing = get<{
    name: string;
    address: string;
    postal_code: string;
    city: string;
    category_id: string | null;
  }>("SELECT name, address, postal_code, city, category_id FROM locations WHERE id = ?", id);
  if (!existing) redirect("/locaties?error=Locatie+niet+gevonden.");
  const name = value(form, "name");
  if (!name) redirect("/locaties?error=Vul+een+naam+in.");
  const address = value(form, "address");
  const postalCode = value(form, "postal_code");
  const city = value(form, "city");
  const categoryId = value(form, "category_id");
  run(
    "UPDATE locations SET name = ?, address = ?, postal_code = ?, city = ?, category_id = ? WHERE id = ?",
    name,
    address,
    postalCode,
    city,
    categoryId || null,
    id,
  );
  writeAudit({
    actor: user,
    action: "location.update",
    entityType: "location",
    entityId: id,
    summary: `Locatie ${name} is bijgewerkt.`,
    before: existing,
    after: { name, address, postalCode, city, categoryId: categoryId || null },
  });
  revalidatePath("/locaties");
  revalidatePath("/uitjes");
  redirect("/locaties?ok=1");
}

export async function createLocationAction(form: FormData): Promise<void> {
  const user = await requirePermission("program.manage");
  const name = value(form, "name");
  const address = value(form, "address");
  const postalCode = value(form, "postal_code");
  const city = value(form, "city");
  const categoryId = value(form, "category_id");
  if (!name) redirect("/locaties?error=Vul+een+naam+in.");
  const id = `loc-${randomUUID()}`;
  run(
    `INSERT INTO locations (id, name, address, postal_code, city, category_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    name,
    address,
    postalCode,
    city,
    categoryId || null,
    new Date().toISOString(),
  );
  writeAudit({
    actor: user,
    action: "location.create",
    entityType: "location",
    entityId: id,
    summary: `Locatie ${name} is aangemaakt.`,
    after: { name, address, postalCode, city, categoryId },
  });
  revalidatePath("/locaties");
  revalidatePath("/uitjes");
  redirect("/locaties?ok=1");
}
