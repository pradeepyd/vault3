// pages/api/vault/load.ts
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: "Unauthorized" });

  if (req.method !== "GET") return res.status(405).end();

  try {
    const vault = await prisma.vault.findFirst({
      where: { userId: session.user.id },
    });

    if (!vault) return res.status(404).json({ error: "No vault found" });

    res.status(200).json({ data: vault.data });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
}
