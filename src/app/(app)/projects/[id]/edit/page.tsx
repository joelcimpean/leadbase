import {
  redirect,
} from "next/navigation";

type EditProjectPageProps = {
  params: Promise<{
    id: string;
  }>;
};

/*
 * Project editing now happens in the shared inline modal.
 * Keep the old route alive for bookmarks / existing links,
 * but send it to the real Project Detail workspace.
 */
export default async function EditProjectPage({
  params,
}: EditProjectPageProps) {
  const {
    id,
  } =
    await params;

  redirect(
    `/projects/${id}`
  );
}
