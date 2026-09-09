import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

const BUCKET =
  "project-media";

const MAX_FILE_BYTES =
  6 * 1024 * 1024;

const ALLOWED_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ]);

function safeFileName(
  name: string
) {
  const cleaned =
    name
      .toLowerCase()
      .replace(
        /[^a-z0-9._-]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  return cleaned ||
    "project-image";
}

async function getOwnedProject(
  projectId: string
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
    return {
      supabase,
      user: null,
      project: null,
    };
  }

  const {
    data:
      project,
  } =
    await supabase
      .from(
        "client_projects"
      )
      .select(`
        id,
        media_url,
        media_path,
        media_mode
      `)
      .eq(
        "id",
        projectId
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  return {
    supabase,
    user,
    project,
  };
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const {
    id,
  } =
    await context.params;

  const {
    supabase,
    user,
    project,
  } =
    await getOwnedProject(
      id
    );

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

  if (
    !project
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Project not found",
      },
      {
        status: 404,
      }
    );
  }

  const formData =
    await request.formData();

  const file =
    formData.get(
      "file"
    );

  const modeRaw =
    formData.get(
      "mode"
    );

  const mode =
    modeRaw ===
      "logo"
      ? "logo"
      : "cover";

  if (
    !(file instanceof File)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No file selected",
      },
      {
        status: 400,
      }
    );
  }

  if (
    file.size <= 0 ||
    file.size >
      MAX_FILE_BYTES
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Image must be smaller than 6 MB",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !ALLOWED_TYPES.has(
      file.type
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Unsupported image type",
      },
      {
        status: 400,
      }
    );
  }

  const path =
    `${user.id}/${id}/${Date.now()}-${safeFileName(
      file.name
    )}`;

  const {
    error:
      uploadError,
  } =
    await supabase.storage
      .from(
        BUCKET
      )
      .upload(
        path,
        file,
        {
          contentType:
            file.type,
          upsert:
            false,
        }
      );

  if (
    uploadError
  ) {
    console.error(
      "Could not upload project media:",
      uploadError
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          uploadError.message,
      },
      {
        status: 500,
      }
    );
  }

  const {
    data:
      publicUrlData,
  } =
    supabase.storage
      .from(
        BUCKET
      )
      .getPublicUrl(
        path
      );

  const publicUrl =
    publicUrlData.publicUrl;

  const {
    error:
      updateError,
  } =
    await supabase
      .from(
        "client_projects"
      )
      .update({
        media_url:
          publicUrl,
        media_path:
          path,
        media_mode:
          mode,
        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        id
      )
      .eq(
        "user_id",
        user.id
      );

  if (
    updateError
  ) {
    await supabase.storage
      .from(
        BUCKET
      )
      .remove([
        path,
      ]);

    return NextResponse.json(
      {
        ok: false,
        error:
          updateError.message,
      },
      {
        status: 500,
      }
    );
  }

  if (
    project.media_path
  ) {
    await supabase.storage
      .from(
        BUCKET
      )
      .remove([
        project.media_path,
      ]);
  }

  return NextResponse.json({
    ok: true,
    mediaUrl:
      publicUrl,
    mediaPath:
      path,
    mediaMode:
      mode,
  });
}

export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const {
    id,
  } =
    await context.params;

  const {
    supabase,
    user,
    project,
  } =
    await getOwnedProject(
      id
    );

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

  if (
    !project
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Project not found",
      },
      {
        status: 404,
      }
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "client_projects"
      )
      .update({
        media_url:
          null,
        media_path:
          null,
        updated_at:
          new Date()
            .toISOString(),
      })
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

  if (
    project.media_path
  ) {
    await supabase.storage
      .from(
        BUCKET
      )
      .remove([
        project.media_path,
      ]);
  }

  return NextResponse.json({
    ok: true,
  });
}

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const {
    id,
  } =
    await context.params;

  const {
    supabase,
    user,
    project,
  } =
    await getOwnedProject(
      id
    );

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

  if (
    !project
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Project not found",
      },
      {
        status: 404,
      }
    );
  }

  const body =
    (await request.json()) as {
      mode?: string;
    };

  const mode =
    body.mode ===
      "logo"
      ? "logo"
      : "cover";

  const {
    error,
  } =
    await supabase
      .from(
        "client_projects"
      )
      .update({
        media_mode:
          mode,
        updated_at:
          new Date()
            .toISOString(),
      })
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
    mediaMode:
      mode,
  });
}
