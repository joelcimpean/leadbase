import {
  redirect,
} from "next/navigation";

type EditLeadPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditLeadPage({
  params,
}: EditLeadPageProps) {
  const {
    id,
  } =
    await params;

  redirect(
    `/leads/${id}`
  );
}
