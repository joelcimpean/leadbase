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

import {
  resolveAccountCurrency,
} from "@/lib/account-currency";

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

function getInternalReturnTo(
  formData: FormData
) {
  const value = getText(
    formData,
    "returnTo"
  );

  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return null;
  }

  return value;
}


const PROJECT_MEDIA_BUCKET =
  "project-media";

const PROJECT_MEDIA_MAX_BYTES =
  6 * 1024 * 1024;

const PROJECT_MEDIA_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ]);

function safeProjectMediaFileName(
  name: string
) {
  return (
    name
      .toLowerCase()
      .replace(
        /[^a-z0-9._-]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      ) ||
    "project-image"
  );
}

function getProjectMediaFile(
  formData: FormData
) {
  const value =
    formData.get(
      "projectMedia"
    );

  if (
    !(value instanceof File) ||
    value.size <= 0
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

  const storedProfile = ((user.user_metadata ?? {}) as Record<string, unknown>).leadbase_profile as Record<string, unknown> | undefined;
  const accountCurrency = resolveAccountCurrency({
    storedCurrency: storedProfile?.currency,
    currencyMode: storedProfile?.currencyMode,
    location: typeof storedProfile?.location === "string" ? storedProfile.location : null,
  }).currency;

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

  const mediaFile =
    getProjectMediaFile(
      formData
    );

  const mediaMode =
    getText(
      formData,
      "mediaMode"
    ) ===
      "logo"
      ? "logo"
      : "cover";

  const sourceProposalId =
    getOptionalText(
      formData,
      "sourceProposalId"
    );

  const returnTo =
    getInternalReturnTo(
      formData
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

  if (
    mediaFile &&
    (
      mediaFile.size >
        PROJECT_MEDIA_MAX_BYTES ||
      !PROJECT_MEDIA_TYPES.has(
        mediaFile.type
      )
    )
  ) {
    redirect(
      `/projects/new?error=${encodeURIComponent(
        mediaFile.size >
          PROJECT_MEDIA_MAX_BYTES
          ? "Image must be smaller than 6 MB"
          : "Unsupported image type"
      )}`
    );
  }

  const {
    data:
      createdProject,
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
          accountCurrency,

        started_at:
          startedAt,

        completed_at:
          completedAt,

        notes,

        source_proposal_id:
          sourceProposalId,

        media_mode:
          mediaMode,
      })
      .select(
        "id"
      )
      .single();

  if (
    error ||
    !createdProject
  ) {
    console.error(
      "Could not create project:",
      error
    );

    redirect(
      `/projects/new?error=${encodeURIComponent(
        error?.message ??
          "Project could not be created"
      )}`
    );
  }

  if (
    mediaFile
  ) {
    const mediaPath =
      `${user.id}/${createdProject.id}/${Date.now()}-${safeProjectMediaFileName(
        mediaFile.name
      )}`;

    const {
      error:
        uploadError,
    } =
      await supabase.storage
        .from(
          PROJECT_MEDIA_BUCKET
        )
        .upload(
          mediaPath,
          mediaFile,
          {
            contentType:
              mediaFile.type,
            upsert:
              false,
          }
        );

    if (
      uploadError
    ) {
      console.error(
        "Could not upload project image:",
        uploadError
      );

      await supabase
        .from(
          "client_projects"
        )
        .delete()
        .eq(
          "id",
          createdProject.id
        )
        .eq(
          "user_id",
          user.id
        );

      redirect(
        `/projects/new?error=${encodeURIComponent(
          uploadError.message
        )}`
      );
    }

    const {
      data:
        publicUrlData,
    } =
      supabase.storage
        .from(
          PROJECT_MEDIA_BUCKET
        )
        .getPublicUrl(
          mediaPath
        );

    const {
      error:
        mediaUpdateError,
    } =
      await supabase
        .from(
          "client_projects"
        )
        .update({
          media_url:
            publicUrlData.publicUrl,
          media_path:
            mediaPath,
          media_mode:
            mediaMode,
          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          createdProject.id
        )
        .eq(
          "user_id",
          user.id
        );

    if (
      mediaUpdateError
    ) {
      await supabase.storage
        .from(
          PROJECT_MEDIA_BUCKET
        )
        .remove([
          mediaPath,
        ]);

      await supabase
        .from(
          "client_projects"
        )
        .delete()
        .eq(
          "id",
          createdProject.id
        )
        .eq(
          "user_id",
          user.id
        );

      redirect(
        `/projects/new?error=${encodeURIComponent(
          mediaUpdateError.message
        )}`
      );
    }
  }

  revalidatePath(
    "/projects"
  );

  revalidatePath(
    "/"
  );

  if (
    returnTo
  ) {
    revalidatePath(
      returnTo
    );

    redirect(
      returnTo
    );
  }

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

  const returnTo =
    getInternalReturnTo(
      formData
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
    `/projects/${projectId}`
  );

  revalidatePath(
    "/"
  );

  if (
    returnTo
  ) {
    revalidatePath(
      returnTo
    );

    redirect(
      returnTo
    );
  }

  redirect(
    `/projects/${projectId}`
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
    data:
      existingProject,
  } =
    await supabase
      .from(
        "client_projects"
      )
      .select(
        "media_path"
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

  if (
    existingProject?.media_path
  ) {
    const {
      error:
        storageError,
    } =
      await supabase.storage
        .from(
          "project-media"
        )
        .remove([
          existingProject.media_path,
        ]);

    if (
      storageError
    ) {
      console.error(
        "Could not remove project media:",
        storageError
      );
    }
  }

  revalidatePath(
    "/projects"
  );

  revalidatePath(
    "/"
  );
}