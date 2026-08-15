import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ModelType } from "@prisma/client";

export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const modelParam = searchParams.get("model") || "Deepseek";

  // Validate model param against enum
  const validModels = Object.values(ModelType) as string[];
  const model = validModels.includes(modelParam)
    ? (modelParam as ModelType)
    : ModelType.Deepseek;

  const chat = await prisma.chat.findMany({
    where: {
      model,
    },
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      tradings: {
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  return NextResponse.json({
    data: chat,
    model,
  });
};
