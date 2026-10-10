import type { Metadata } from "next";
import { connection } from "next/server";
import { ClaimForm } from "@/components/claim/ClaimForm";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { db } from "@/db";
import { parseClaimParams } from "@/lib/claim";
import { now } from "@/lib/clock";
import { getClaimPageData } from "@/server/claim-page";

export const metadata: Metadata = {
  title: "Claim a birthday",
  description: "Bid on a birthday. The highest bid owns the homepage.",
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ date?: string | string[]; rank?: string | string[] }> };

/** Claim a birthday: /claim, /claim?date=october-7, or /claim?date=october-7&rank=2 from "Claim #2". */
export default async function ClaimPage({ searchParams }: Props) {
  await connection();
  const { md, rank } = parseClaimParams(await searchParams);
  const page = await getClaimPageData(db, md, rank, now());

  return (
    <ClaimForm
      header={<SiteHeader omit={["claim"]} mobile="back" />}
      footer={<SiteFooter />}
      settings={page.settings}
      md={page.md}
      target={page.target}
      minCents={page.minCents}
      dayEnd={{ today: page.today, endsAt: page.dayEndsAt, serverNow: page.serverNow }}
    />
  );
}
