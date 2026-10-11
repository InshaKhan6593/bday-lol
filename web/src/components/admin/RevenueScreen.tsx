"use client";

import { Paper, Table } from "@mantine/core";
import { MONTHS } from "@/lib/birthday";
import { formatUsd } from "@/lib/money";
import type { Revenue, RevenueRow } from "@/server/admin";
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
      <Table>
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
              <Table.Td fw={800}>{periodLabel(row.period)}</Table.Td>
              <Table.Td className={classes.money}>
                {formatUsd(row.claimsCents)} <span className={classes.statNote}>· {row.claims}</span>
              </Table.Td>
              <Table.Td className={classes.money}>
                {formatUsd(row.boostsCents)} <span className={classes.statNote}>· {row.boosts}</span>
              </Table.Td>
              <Table.Td className={classes.money}>{formatUsd(paid(row))}</Table.Td>
              <Table.Td className={classes.money}>
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

/** Paid claims and boosts by month and by day, Eastern Time. Stripe stays the real record (07 B15). */
export function RevenueScreen({ revenue, today, thisMonth }: { revenue: Revenue; today: string; thisMonth: string }) {
  const day = revenue.days.find((d) => d.period === today);
  const month = revenue.months.find((m) => m.period === thisMonth);
  const count = (row: RevenueRow | undefined) => `${(row?.claims ?? 0) + (row?.boosts ?? 0)} payments`;
  return (
    <>
      <PageHead title="Revenue" lead="Paid claims and boosts in Eastern Time. Comped listings are shown apart and never added in. Stripe is the record of what was actually charged." />
      <div className={classes.stats}>
        <Stat label="Today" value={formatUsd(day ? paid(day) : 0)} note={count(day)} />
        <Stat label="This month" value={formatUsd(month ? paid(month) : 0)} note={count(month)} />
        <Stat label="All time" value={formatUsd(paid(revenue.allTime))} note={count(revenue.allTime)} />
        <Stat label="Comped" value={formatUsd(revenue.allTime.compedCents)} note={`${revenue.allTime.comped} listings, not revenue`} />
      </div>
      <h2 className={classes.h2}>By month</h2>
      <RevenueTable rows={revenue.months} empty="No payments yet." />
      <h2 className={classes.h2}>Last 30 days</h2>
      <RevenueTable rows={revenue.days} empty="No payments in the last 30 days." />
    </>
  );
}
