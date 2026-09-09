import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

type ProductivityAction =
  | "start_timer"
  | "stop_timer"
  | "reset_timer"
  | "activity_ping";

function clampNumber(
  value: unknown,
  min: number,
  max: number
) {
  const number =
    typeof value ===
      "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return min;
  }

  return Math.min(
    max,
    Math.max(
      min,
      Math.round(number)
    )
  );
}

function getLocalDayBounds(
  offsetMinutes: number
) {
  const now =
    new Date();

  const shifted =
    new Date(
      now.getTime() -
        offsetMinutes *
          60_000
    );

  const year =
    shifted.getUTCFullYear();

  const month =
    shifted.getUTCMonth();

  const day =
    shifted.getUTCDate();

  const localMidnightAsUtc =
    Date.UTC(
      year,
      month,
      day
    );

  const start =
    new Date(
      localMidnightAsUtc +
        offsetMinutes *
          60_000
    );

  const end =
    new Date(
      start.getTime() +
        86_400_000
    );

  const localDate =
    `${year}-${String(
      month + 1
    ).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

  return {
    now,
    start,
    end,
    localDate,
  };
}

function durationWithinDay(
  startedAt: string,
  endedAt: string | null,
  dayStart: Date,
  dayEnd: Date,
  now: Date
) {
  const started =
    new Date(
      startedAt
    ).getTime();

  const ended =
    endedAt
      ? new Date(
          endedAt
        ).getTime()
      : now.getTime();

  const from =
    Math.max(
      started,
      dayStart.getTime()
    );

  const to =
    Math.min(
      ended,
      dayEnd.getTime(),
      now.getTime()
    );

  return Math.max(
    0,
    Math.floor(
      (to - from) /
        1000
    )
  );
}

export async function GET(
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

  const offsetMinutes =
    clampNumber(
      request.nextUrl.searchParams.get(
        "tzOffset"
      ),
      -840,
      840
    );

  const {
    now,
    start,
    end,
    localDate,
  } =
    getLocalDayBounds(
      offsetMinutes
    );

  const heatmapStart =
    new Date(
      `${localDate}T00:00:00.000Z`
    );

  heatmapStart.setUTCDate(
    heatmapStart.getUTCDate() -
      90
  );

  const heatmapStartDate =
    heatmapStart
      .toISOString()
      .slice(0, 10);

  const [
    openResult,
    todayResult,
    projectsResult,
    activityResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "time_entries"
        )
        .select(`
          id,
          title,
          project_id,
          started_at,
          ended_at
        `)
        .eq(
          "user_id",
          user.id
        )
        .is(
          "ended_at",
          null
        )
        .order(
          "started_at",
          {
            ascending:
              false,
          }
        )
        .limit(1)
        .maybeSingle(),

      supabase
        .from(
          "time_entries"
        )
        .select(`
          id,
          title,
          project_id,
          started_at,
          ended_at
        `)
        .eq(
          "user_id",
          user.id
        )
        .lt(
          "started_at",
          end.toISOString()
        )
        .or(
          `ended_at.gte.${start.toISOString()},ended_at.is.null`
        )
        .order(
          "started_at",
          {
            ascending:
              false,
          }
        )
        .limit(100),

      supabase
        .from(
          "client_projects"
        )
        .select(`
          id,
          project_name,
          client_name,
          status
        `)
        .eq(
          "user_id",
          user.id
        )
        .neq(
          "status",
          "CANCELLED"
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(50),

      supabase
        .from(
          "app_activity_daily"
        )
        .select(`
          activity_date,
          opens,
          active_minutes,
          actions,
          score
        `)
        .eq(
          "user_id",
          user.id
        )
        .gte(
          "activity_date",
          heatmapStartDate
        )
        .lte(
          "activity_date",
          localDate
        )
        .order(
          "activity_date",
          {
            ascending:
              true,
          }
        ),
    ]);

  const firstError =
    openResult.error ??
    todayResult.error ??
    projectsResult.error ??
    activityResult.error;

  if (
    firstError
  ) {
    console.error(
      "Could not load productivity dashboard:",
      firstError
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          firstError.message,
      },
      {
        status: 500,
      }
    );
  }

  const todayEntries =
    todayResult.data ??
    [];

  const openSession =
    openResult.data ??
    null;

  const seenIds =
    new Set(
      todayEntries.map(
        (
          entry
        ) =>
          entry.id
      )
    );

  const entriesForTotal =
    openSession &&
    !seenIds.has(
      openSession.id
    )
      ? [
          ...todayEntries,
          openSession,
        ]
      : todayEntries;

  const todaySeconds =
    entriesForTotal.reduce(
      (
        total,
        entry
      ) =>
        total +
        durationWithinDay(
          entry.started_at,
          entry.ended_at,
          start,
          end,
          now
        ),
      0
    );

  return NextResponse.json({
    ok: true,
    localDate,
    todaySeconds,
    openSession,
    entries:
      todayEntries.slice(
        0,
        8
      ),
    projects:
      projectsResult.data ??
      [],
    activity:
      activityResult.data ??
      [],
  });
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

  const action =
    body.action as
      | ProductivityAction
      | undefined;

  if (
    action ===
    "start_timer"
  ) {
    const title =
      typeof body.title ===
        "string"
        ? body.title
            .trim()
            .slice(0, 140)
        : "";

    const projectId =
      typeof body.projectId ===
        "string" &&
      body.projectId
        ? body.projectId
        : null;

    if (
      projectId
    ) {
      const {
        data:
          project,
      } =
        await supabase
          .from(
            "client_projects"
          )
          .select(
            "id"
          )
          .eq(
            "id",
            projectId
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

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
    }

    const {
      data:
        existing,
    } =
      await supabase
        .from(
          "time_entries"
        )
        .select(
          "id"
        )
        .eq(
          "user_id",
          user.id
        )
        .is(
          "ended_at",
          null
        )
        .limit(1)
        .maybeSingle();

    if (
      existing
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "A timer is already running",
        },
        {
          status: 409,
        }
      );
    }

    const {
      data:
        session,
      error,
    } =
      await supabase
        .from(
          "time_entries"
        )
        .insert({
          user_id:
            user.id,
          project_id:
            projectId,
          title:
            title ||
            null,
          started_at:
            new Date()
              .toISOString(),
        })
        .select(`
          id,
          title,
          project_id,
          started_at,
          ended_at
        `)
        .single();

    if (
      error
    ) {
      console.error(
        "Could not start timer:",
        error
      );

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
      session,
    });
  }

  if (
    action ===
    "stop_timer"
  ) {
    const {
      data:
        session,
      error,
    } =
      await supabase
        .from(
          "time_entries"
        )
        .update({
          ended_at:
            new Date()
              .toISOString(),
          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "user_id",
          user.id
        )
        .is(
          "ended_at",
          null
        )
        .select(`
          id,
          title,
          project_id,
          started_at,
          ended_at
        `)
        .maybeSingle();

    if (
      error
    ) {
      console.error(
        "Could not stop timer:",
        error
      );

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
      session,
    });
  }

  if (
    action ===
    "reset_timer"
  ) {
    const offsetMinutes =
      clampNumber(
        body.tzOffset,
        -840,
        840
      );

    const {
      start,
      end,
    } =
      getLocalDayBounds(
        offsetMinutes
      );

    const nowIso =
      new Date()
        .toISOString();

    const {
      error:
        closeError,
    } =
      await supabase
        .from(
          "time_entries"
        )
        .update({
          ended_at:
            nowIso,
          updated_at:
            nowIso,
        })
        .eq(
          "user_id",
          user.id
        )
        .is(
          "project_id",
          null
        )
        .is(
          "title",
          null
        )
        .is(
          "ended_at",
          null
        );

    if (
      closeError
    ) {
      console.error(
        "Could not close timer before reset:",
        closeError
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            closeError.message,
        },
        {
          status: 500,
        }
      );
    }

    const {
      error:
        deleteError,
    } =
      await supabase
        .from(
          "time_entries"
        )
        .delete()
        .eq(
          "user_id",
          user.id
        )
        .is(
          "project_id",
          null
        )
        .is(
          "title",
          null
        )
        .gte(
          "started_at",
          start.toISOString()
        )
        .lt(
          "started_at",
          end.toISOString()
        );

    if (
      deleteError
    ) {
      console.error(
        "Could not reset timer:",
        deleteError
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            deleteError.message,
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

  if (
    action ===
    "activity_ping"
  ) {
    const localDate =
      typeof body.localDate ===
        "string"
        ? body.localDate
        : "";

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        localDate
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid activity date",
        },
        {
          status: 400,
        }
      );
    }

    const opens =
      clampNumber(
        body.opens,
        0,
        2
      );

    const activeMinutes =
      clampNumber(
        body.activeMinutes,
        0,
        10
      );

    const actions =
      clampNumber(
        body.actions,
        0,
        30
      );

    const {
      error,
    } =
      await supabase.rpc(
        "increment_app_activity",
        {
          p_activity_date:
            localDate,
          p_opens:
            opens,
          p_active_minutes:
            activeMinutes,
          p_actions:
            actions,
        }
      );

    if (
      error
    ) {
      console.error(
        "Could not record app activity:",
        error
      );

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

  return NextResponse.json(
    {
      ok: false,
      error:
        "Unknown action",
    },
    {
      status: 400,
    }
  );
}
