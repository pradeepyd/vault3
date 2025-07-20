// pages/api/vault/save.ts
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: "Unauthorized" });

  if (req.method !== "POST") return res.status(405).end();

  const { data } = req.body;
  if (!data || typeof data !== "string") {
    return res.status(400).json({ error: "Missing encrypted vault data" });
  }

  try {
    const existing = await prisma.vault.findFirst({
      where: { userId: session.user.id },
    });

    if (existing) {
      await prisma.vault.update({
        where: { id: existing.id },
        data: { data },
      });
    } else {
      await prisma.vault.create({
        data: {
          userId: session.user.id,
          data,
        },
      });
    }

    res.status(200).json({ message: "Vault saved" });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
}
