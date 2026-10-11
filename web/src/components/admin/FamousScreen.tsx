"use client";

import { Badge, Button, Paper, Table, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { formatLong, parseKey } from "@/lib/birthday";
import { routes } from "@/lib/routes";
import { adminSetFamousHidden } from "@/server/actions/admin";
import type { AdminFamous } from "@/server/admin";
import { PageHead } from "./AdminShell";
import { DateSelect } from "./DateSelect";
import classes from "./admin.module.css";

type Props = {
  /** "10-07". */
  date: string;
  people: AdminFamous[];
  /** How many of them the date page lists. */
  listed: number;
};

/** "Famous people born on…" for one date: hide someone and the next name moves up (spec §10). */
export function FamousScreen({ date, people, listed }: Props) {
  const router = useRouter();
  const [working, startWork] = useTransition();
  const md = parseKey(date)!;
  let position = 0;

  function toggle(person: AdminFamous) {
    startWork(async () => {
      const result = await adminSetFamousHidden(person.source, person.sourceId, !person.hidden);
      notifications.show(
        result.ok ? { message: result.message, color: "green" } : { message: result.errors?.form ?? "That didn’t work.", color: "red" },
      );
      router.refresh();
    });
  }

  return (
    <>
      <PageHead
        title="Famous people"
        lead={`Born on ${formatLong(md)}, best known first. The date page shows the first ${listed} that aren’t hidden.`}
      />
      <div className={classes.filters}>
        <DateSelect value={date} onChange={(key) => key && router.push(`${routes.admin.famous}?date=${key}` as Route)} />
      </div>
      <Paper className={classes.tableCard}>
        {people.length === 0 ? (
          <p className={classes.empty}>No famous people are stored for this date yet. The list fills in with the monthly refresh.</p>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Known for</Table.Th>
                <Table.Th>Born</Table.Th>
                <Table.Th>On the site</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {people.map((person) => {
                const shownAt = person.hidden ? null : ++position;
                return (
                  <Table.Tr key={`${person.source}:${person.sourceId}`}>
                    <Table.Td className={classes.rank}>{shownAt ?? "–"}</Table.Td>
                    <Table.Td>
                      <span className={classes.personName} data-removed={person.hidden || undefined}>
                        {person.name}
                      </span>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{person.knownFor}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{person.birthDate.slice(0, 4)}</Text>
                    </Table.Td>
                    <Table.Td>
                      {person.hidden ? (
                        <Badge className={classes.badgeRemoved}>Hidden</Badge>
                      ) : shownAt! <= listed ? (
                        <Badge className={classes.badgeLive}>Listed</Badge>
                      ) : (
                        <Badge className={classes.badgeChild}>Next in line</Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Button variant="default" size="xs" loading={working} onClick={() => toggle(person)} style={{ float: "right" }}>
                        {person.hidden ? "Show again" : "Hide this person"}
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Paper>
    </>
  );
}
