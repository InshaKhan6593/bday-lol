"use client";

import { Paper, Table } from "@mantine/core";
import { MONTHS } from "@/lib/birthday";
import { formatUsd } from "@/lib/money";
import type { Revenue, RevenueCard, RevenueRow } from "@/server/admin";
import { PageHead } from "./AdminShell";
import classes from "./admin.module.css";

const paid = (row: RevenueRow) => row.claimsCents + row.boostsCents;

/** "2026-10-07" → "October 7, 2026"; "2026-10" → "October 2026". */
function periodLabel(period: string): string {
  const [year, month, day] = period.split("-").map(Number);
  const name = MONTHS[(month ?? 1) - 1];
  return day ? `${name} ${day}, ${year}` : `${name} ${year}`;
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Paper className={classes.stat}>
      <p className={classes.statLabel}>{label}</p>
      <p className={classes.statValue}>{value}</p>
      <p className={classes.statNote}>{note}</p>
    </Paper>
  );
}

function RevenueTable({ rows, empty }: { rows: RevenueRow[]; empty: string }) {
  if (rows.length === 0) return <Paper className={classes.tableCard}><p className={classes.empty}>{empty}</p></Paper>;
  return (
    <Paper className={classes.tableCard}>
      <Table className={classes.stackTable}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Period</Table.Th>
            <Table.Th>Claims</Table.Th>
            <Table.Th>Boosts</Table.Th>
            <Table.Th>Paid total</Table.Th>
            <Table.Th>Comped (not counted)</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => (
            <Table.Tr key={row.period}>
              <Table.Td fw={800} className={classes.stackTitle}>
                {periodLabel(row.period)}
              </Table.Td>
              <Table.Td className={classes.money} data-label="Claims">
                {formatUsd(row.claimsCents)} <span className={classes.statNote}>· {row.claims}</span>
              </Table.Td>
              <Table.Td className={classes.money} data-label="Boosts">
                {formatUsd(row.boostsCents)} <span className={classes.statNote}>· {row.boosts}</span>
              </Table.Td>
              <Table.Td className={classes.money} data-label="Paid total">
                {formatUsd(paid(row))}
              </Table.Td>
              <Table.Td className={classes.money} data-label="Comped (not counted)">
                {row.comped ? (
                  <>
                    {formatUsd(row.compedCents)} <span className={classes.statNote}>· {row.comped}</span>
                  </>
                ) : (
                  "–"
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}

const count = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/** "12 payments · 9 people". People are different payer emails: there are no accounts. */
const cardNote = (card: RevenueCard, what = "payment") => `${count(card.payments, what)} · ${count(card.people, "person", "people")}`;

/** Paid claims and boosts by month and by day, Eastern Time. Stripe stays the real record (07 B15). */
export function RevenueScreen({ revenue }: { revenue: Revenue }) {
  const { today, allTime, claims, boosts } = revenue.cards;
  return (
    <>
      <PageHead title="Revenue" lead="Paid claims and boosts in Eastern Time. Comped listings are never added in. Stripe is the record of what was actually charged." />
      <div className={classes.stats}>
        <Stat label="Today" value={formatUsd(today.cents)} note={cardNote(today)} />
        <Stat label="All time" value={formatUsd(allTime.cents)} note={cardNote(allTime)} />
        <Stat label="Birthday claims (all time)" value={formatUsd(claims.cents)} note={cardNote(claims, "claim")} />
        <Stat label="Boosts (all time)" value={formatUsd(boosts.cents)} note={cardNote(boosts, "boost")} />
      </div>
      <h2 className={classes.h2}>By month</h2>
      <RevenueTable rows={revenue.months} empty="No payments yet." />
      <h2 className={classes.h2}>Last 30 days</h2>
      <RevenueTable rows={revenue.days} empty="No payments in the last 30 days." />
    </>
  );
}
