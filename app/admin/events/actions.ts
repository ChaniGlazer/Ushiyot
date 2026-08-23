"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";

function checkSecret(formData: FormData): string | null {
  const secret = String(formData.get("secret") ?? "");
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return null;
  }
  return secret;
}

function readEventFields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    sectors: formData.getAll("relevant_sectors").map(String),
    startDate: String(formData.get("start_date") ?? ""),
    endDate: String(formData.get("end_date") ?? ""),
    active: formData.get("active") === "on" ? 1 : 0,
  };
}

export async function createEvent(formData: FormData): Promise<void> {
  const secret = checkSecret(formData);
  if (!secret) {
    redirect("/admin/events");
  }

  const { title, description, sectors, startDate, endDate, active } = readEventFields(formData);

  if (title && description && startDate && endDate && sectors.length > 0) {
    db.prepare(
      `INSERT INTO current_events (title, description, relevant_sectors, start_date, end_date, active)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(title, description, JSON.stringify(sectors), startDate, endDate, active);
  }

  redirect(`/admin/events?secret=${encodeURIComponent(secret)}`);
}

export async function updateEvent(formData: FormData): Promise<void> {
  const secret = checkSecret(formData);
  if (!secret) {
    redirect("/admin/events");
  }

  const id = Number(formData.get("id"));
  const { title, description, sectors, startDate, endDate, active } = readEventFields(formData);

  if (id && title && description && startDate && endDate && sectors.length > 0) {
    db.prepare(
      `UPDATE current_events
       SET title = ?, description = ?, relevant_sectors = ?, start_date = ?, end_date = ?, active = ?
       WHERE id = ?`,
    ).run(title, description, JSON.stringify(sectors), startDate, endDate, active, id);
  }

  redirect(`/admin/events?secret=${encodeURIComponent(secret)}`);
}

export async function deleteEvent(formData: FormData): Promise<void> {
  const secret = checkSecret(formData);
  if (!secret) {
    redirect("/admin/events");
  }

  const id = Number(formData.get("id"));
  if (id) {
    db.prepare("DELETE FROM current_events WHERE id = ?").run(id);
  }

  redirect(`/admin/events?secret=${encodeURIComponent(secret)}`);
}
