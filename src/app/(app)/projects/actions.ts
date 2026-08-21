"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  languageCopy,
} from "@/lib/i18n";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   HELPERS
========================================================= */

function getText(
  formData: FormData,
  key: string
) {
  const value =
    formData.get(
      key
    );

  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function getOptionalText(
  formData: FormData,
  key: string
) {
  const value =
    getText(
      formData,
      key
    );

  return value ||
    null;
}

function getMoney(
  formData: FormData,
  key: string
) {
  const raw =
    getText(
      formData,
      key
    );

  if (
    !raw
  ) {
    return 0;
  }

  const normalized =
    raw.replace(
      ",",
      "."
    );

  const value =
    Number(
      normalized
    );

  if (
    !Number.isFinite(
      value
    ) ||
    value <
      0
  ) {
    return null;
  }

  return value;
}

/* =========================================================
   CREATE
========================================================= */

export async function createProject(
  formData:
    FormData
) {
  const [
    supabase,
    language,
  ] =
    await Promise.all([
      createClient(),
      getAppLanguage(),
    ]);

  const text =
    languageCopy[
      language
    ].projects;

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (
    !user
  ) {
    redirect(
      "/login"
    );
  }

  const clientName =
    getText(
      formData,
      "clientName"
    );

  const projectName =
    getText(
      formData,
      "projectName"
    );

  const websiteUrl =
    getOptionalText(
      formData,
      "websiteUrl"
    );

  const status =
    getText(
      formData,
      "status"
    ) ||
    "COMPLETED";

  const totalValue =
    getMoney(
      formData,
      "totalValue"
    );

  const amountPaid =
    getMoney(
      formData,
      "amountPaid"
    );

  const startedAt =
    getOptionalText(
      formData,
      "startedAt"
    );

  const completedAt =
    getOptionalText(
      formData,
      "completedAt"
    );

  const notes =
    getOptionalText(
      formData,
      "notes"
    );

  if (
    !clientName ||
    !projectName
  ) {
    redirect(
      `/projects/new?error=${encodeURIComponent(
        text.clientProjectRequiredError
      )}`
    );
  }

  if (
    totalValue ===
      null ||
    amountPaid ===
      null
  ) {
    redirect(
      `/projects/new?error=${encodeURIComponent(
        text.invalidValueError
      )}`
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "client_projects"
      )
      .insert({
        user_id:
          user.id,

        client_name:
          clientName,

        project_name:
          projectName,

        website_url:
          websiteUrl,

        status,

        total_value:
          totalValue,

        amount_paid:
          amountPaid,

        currency:
          "EUR",

        started_at:
          startedAt,

        completed_at:
          completedAt,

        notes,
      });

  if (
    error
  ) {
    console.error(
      "Could not create project:",
      error
    );

    redirect(
      `/projects/new?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidatePath(
    "/projects"
  );

  revalidatePath(
    "/"
  );

  redirect(
    "/projects"
  );
}

/* =========================================================
   UPDATE
========================================================= */

export async function updateProject(
  formData:
    FormData
) {
  const [
    supabase,
    language,
  ] =
    await Promise.all([
      createClient(),
      getAppLanguage(),
    ]);

  const text =
    languageCopy[
      language
    ].projects;

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (
    !user
  ) {
    redirect(
      "/login"
    );
  }

  const projectId =
    getText(
      formData,
      "projectId"
    );

  const clientName =
    getText(
      formData,
      "clientName"
    );

  const projectName =
    getText(
      formData,
      "projectName"
    );

  const websiteUrl =
    getOptionalText(
      formData,
      "websiteUrl"
    );

  const status =
    getText(
      formData,
      "status"
    );

  const totalValue =
    getMoney(
      formData,
      "totalValue"
    );

  const amountPaid =
    getMoney(
      formData,
      "amountPaid"
    );

  const startedAt =
    getOptionalText(
      formData,
      "startedAt"
    );

  const completedAt =
    getOptionalText(
      formData,
      "completedAt"
    );

  const notes =
    getOptionalText(
      formData,
      "notes"
    );

  if (
    !projectId ||
    !clientName ||
    !projectName
  ) {
    redirect(
      `/projects/${projectId}/edit?error=${encodeURIComponent(
        text.missingInformationError
      )}`
    );
  }

  if (
    totalValue ===
      null ||
    amountPaid ===
      null
  ) {
    redirect(
      `/projects/${projectId}/edit?error=${encodeURIComponent(
        text.invalidValueError
      )}`
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
        client_name:
          clientName,

        project_name:
          projectName,

        website_url:
          websiteUrl,

        status,

        total_value:
          totalValue,

        amount_paid:
          amountPaid,

        started_at:
          startedAt,

        completed_at:
          completedAt,

        notes,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        projectId
      )
      .eq(
        "user_id",
        user.id
      );

  if (
    error
  ) {
    console.error(
      "Could not update project:",
      error
    );

    redirect(
      `/projects/${projectId}/edit?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidatePath(
    "/projects"
  );

  revalidatePath(
    "/"
  );

  redirect(
    "/projects"
  );
}

/* =========================================================
   DELETE
========================================================= */

export async function deleteProject(
  projectId:
    string
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
    redirect(
      "/login"
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "client_projects"
      )
      .delete()
      .eq(
        "id",
        projectId
      )
      .eq(
        "user_id",
        user.id
      );

  if (
    error
  ) {
    console.error(
      "Could not delete project:",
      error
    );

    return;
  }

  revalidatePath(
    "/projects"
  );

  revalidatePath(
    "/"
  );
}