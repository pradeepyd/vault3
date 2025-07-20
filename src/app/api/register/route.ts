// app/api/register/route.ts
import { prisma } from "@/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, name, password } = await req.json();

    if (!email || !name || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashed,
      },
    });

    return NextResponse.json({ message: "User created", id: user.id });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
