import { notFound } from "next/navigation";
import { validateAndAccessDelegation } from "@/lib/delegation/session-manager";
import PublicDelegationClient from "@/components/delegation/PublicDelegationClient";

interface PublicDelegationPageProps {
  params: Promise<{ delegationId: string }>;
  searchParams: Promise<{ sig?: string }>;
}

export default async function PublicDelegationPage({
  params,
  searchParams,
}: PublicDelegationPageProps) {
  const { delegationId } = await params;
  const { sig: signature } = await searchParams;

  try {
    // Validate delegation session on the server
    const { session, error } = await validateAndAccessDelegation(
      delegationId,
      signature
    );

    if (error || !session) {
      notFound();
    }

    return <PublicDelegationClient session={session} />;
  } catch (error) {
    console.error("Delegation validation error:", error);
    notFound();
  }
}
