import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

function cleanText(
  value: unknown,
  max: number
) {
  return typeof value ===
    "string"
    ? value
        .trim()
        .slice(0, max)
    : "";
}

export async function POST(
  request: NextRequest
) {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (
    !user
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Not authenticated",
      },
      {
        status: 401,
      }
    );
  }

  let body:
    Record<string, unknown>;

  try {
    body =
      (await request.json()) as Record<
        string,
        unknown
      >;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Invalid JSON",
      },
      {
        status: 400,
      }
    );
  }

  const title =
    cleanText(
      body.title,
      180
    );

  const note =
    cleanText(
      body.note,
      4000
    );

  const dueAt =
    typeof body.dueAt ===
      "string" &&
    body.dueAt
      ? body.dueAt
      : null;

  if (
    !title
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Title required",
      },
      {
        status: 400,
      }
    );
  }

  const parsedDueAt =
    dueAt
      ? new Date(
          dueAt
        )
      : null;

  if (
    parsedDueAt &&
    Number.isNaN(
      parsedDueAt.getTime()
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Invalid due date",
      },
      {
        status: 400,
      }
    );
  }

  const {
    data:
      reminder,
    error,
  } =
    await supabase
      .from(
        "user_reminders"
      )
      .insert({
        user_id:
          user.id,
        title,
        note:
          note ||
          null,
        due_at:
          parsedDueAt
            ?.toISOString() ??
          null,
      })
      .select(`
        id,
        title,
        note,
        due_at,
        completed_at,
        created_at,
        updated_at
      `)
      .single();

  if (
    error
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    ok: true,
    reminder,
  });
}

export async function PATCH(
  request: NextRequest
) {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (
    !user
  ) {
    return NextResponse.json(
      {
        ok: false,
      },
      {
        status: 401,
      }
    );
  }

  const body =
    (await request.json()) as Record<
      string,
      unknown
    >;

  const id =
    cleanText(
      body.id,
      80
    );

  if (
    !id
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing id",
      },
      {
        status: 400,
      }
    );
  }

  const update:
    Record<string, unknown> = {
    updated_at:
      new Date()
        .toISOString(),
  };

  if (
    typeof body.completed ===
    "boolean"
  ) {
    update.completed_at =
      body.completed
        ? new Date()
            .toISOString()
        : null;
  }

  const title =
    cleanText(
      body.title,
      180
    );

  if (
    title
  ) {
    update.title =
      title;
  }

  if (
    typeof body.note ===
    "string"
  ) {
    update.note =
      cleanText(
        body.note,
        4000
      ) ||
      null;
  }

  const {
    data:
      reminder,
    error,
  } =
    await supabase
      .from(
        "user_reminders"
      )
      .update(
        update
      )
      .eq(
        "id",
        id
      )
      .eq(
        "user_id",
        user.id
      )
      .select(`
        id,
        title,
        note,
        due_at,
        completed_at,
        created_at,
        updated_at
      `)
      .maybeSingle();

  if (
    error
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    ok: true,
    reminder,
  });
}

export async function DELETE(
  request: NextRequest
) {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (
    !user
  ) {
    return NextResponse.json(
      {
        ok: false,
      },
      {
        status: 401,
      }
    );
  }

  const id =
    request.nextUrl.searchParams.get(
      "id"
    ) ??
    "";

  if (
    !id
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing id",
      },
      {
        status: 400,
      }
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "user_reminders"
      )
      .delete()
      .eq(
        "id",
        id
      )
      .eq(
        "user_id",
        user.id
      );

  if (
    error
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    ok: true,
  });
}
