"use client";

import { Alert, Anchor, Badge, Button, Group, Modal, Pagination, Paper, SegmentedControl, Table, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from "react";
import { THEMES } from "@/config/themes";
import { formatLong, parseKey } from "@/lib/birthday";
import { formatUsd } from "@/lib/money";
import { initials } from "@/lib/people";
import { routes } from "@/lib/routes";
import { adminSaveListing, adminSetStatus, type AdminActionState } from "@/server/actions/admin";
import type { AdminEntry } from "@/server/admin";
import { PageHead } from "./AdminShell";
import { DateSelect } from "./DateSelect";
import { ListingFields } from "./ListingFields";
import classes from "./admin.module.css";

type Filter = { date: string; q: string; status: "all" | "live" | "removed" };

type Props = {
  entries: AdminEntry[];
  filter: Filter;
  /** Which page this is, and how many listings match in all. */
  paging: { page: number; total: number; pageSize: number };
  /** The comped part of each comped listing's total. */
  compedCents: Record<string, number>;
  limits: { nameMaxLength: number; bioMaxLength: number };
  /** Just added a comped listing: say so once. */
  justAdded: boolean;
};

function listingsUrl(filter: Filter, page = 1): Route {
  const params = new URLSearchParams();
  if (filter.date) params.set("date", filter.date);
  if (filter.q.trim()) params.set("q", filter.q.trim());
  if (filter.status !== "all") params.set("status", filter.status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return (query ? `${routes.admin.listings}?${query}` : routes.admin.listings) as Route;
}

/** Everyone on the open boards: find a listing, edit it, take it down or put it back. */
export function ListingsScreen({ entries, filter, paging, compedCents, limits, justAdded }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(filter.q);
  const [editing, setEditing] = useState<AdminEntry | null>(null);
  const [confirming, setConfirming] = useState<AdminEntry | null>(null);
  const [working, startWork] = useTransition();
  // A new search starts again from the first page.
  const go = (next: Partial<Filter>) => router.push(listingsUrl({ ...filter, q, ...next }));
  const pages = Math.max(1, Math.ceil(paging.total / paging.pageSize));
  const firstShown = (paging.page - 1) * paging.pageSize + 1;

  useEffect(() => {
    if (justAdded) notifications.show({ message: "Comped listing added. It’s live on the board.", color: "green" });
  }, [justAdded]);

  function setStatus(entry: AdminEntry, status: "live" | "removed") {
    startWork(async () => {
      const result = await adminSetStatus(entry.id, status);
      notifications.show(
        result.ok ? { message: result.message, color: "green" } : { message: result.errors?.form ?? "That didn’t work.", color: "red" },
      );
      setConfirming(null);
      router.refresh();
    });
  }

  const md = parseKey(filter.date);
  return (
    <>
      <PageHead
        title="Listings"
        lead={md ? `Everyone on ${formatLong(md)}’s board, in rank order.` : "The newest listings on every open board."}
      >
        <Button component={Link} href={routes.admin.comped}>
          Add comped listing
        </Button>
      </PageHead>

      <form
        className={classes.filters}
        onSubmit={(e) => {
          e.preventDefault();
          go({});
        }}
      >
        <DateSelect value={filter.date} onChange={(date) => go({ date })} allowAll />
        <TextInput label="Name" placeholder="Search names" value={q} onChange={(e) => setQ(e.currentTarget.value)} style={{ flex: "1 1 200px" }} />
        <SegmentedControl
          value={filter.status}
          onChange={(status) => go({ status: status as Filter["status"] })}
          data={[
            { value: "all", label: "All" },
            { value: "live", label: "Live" },
            { value: "removed", label: "Removed" },
          ]}
        />
        <Button type="submit" variant="default">
          Search
        </Button>
      </form>

      <Paper className={classes.tableCard}>
        {entries.length === 0 ? (
          <p className={classes.empty}>No listings match. Try another date or name.</p>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>Person</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {entries.map((entry) => {
                const date = parseKey(entry.boardKey)!;
                const removed = entry.status === "removed";
                return (
                  <Table.Tr key={entry.id}>
                    <Table.Td className={classes.rank}>{entry.rank ?? "–"}</Table.Td>
                    <Table.Td>
                      <div className={classes.person}>
                        {entry.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- small avatars from photo storage
                          <img src={entry.photoUrl} alt="" className={classes.avatar} loading="lazy" />
                        ) : (
                          <span className={classes.avatar} style={{ background: THEMES[entry.theme].ground }}>
                            {initials(entry.name)}
                          </span>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div className={classes.personName} data-removed={removed || undefined}>
                            {entry.name}
                          </div>
                          <div className={classes.personSub}>{entry.bio || entry.ownerEmail || "No bio"}</div>
                        </div>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Anchor component={Link} href={routes.person(date, removed ? null : entry.slug)} target="_blank" c="inherit" fw={600} underline="always">
                        {formatLong(date)}
                      </Anchor>
                      <Text size="xs" c="dimmed">
                        {entry.year}
                      </Text>
                    </Table.Td>
                    <Table.Td className={classes.money}>{formatUsd(entry.totalCents)}</Table.Td>
                    <Table.Td>
                      <Group gap={6}>
                        {removed ? (
                          <Badge className={classes.badgeRemoved}>Removed</Badge>
                        ) : (
                          <Badge className={classes.badgeLive}>Live</Badge>
                        )}
                        {entry.isComped && <Badge className={classes.badgeComped}>Comped</Badge>}
                        {entry.isMinor && <Badge className={classes.badgeChild}>Child</Badge>}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end" wrap="nowrap">
                        <Button variant="default" size="xs" onClick={() => setEditing(entry)}>
                          Edit
                        </Button>
                        {removed ? (
                          <Button variant="default" size="xs" loading={working} onClick={() => setStatus(entry, "live")}>
                            Restore
                          </Button>
                        ) : (
                          <Button variant="default" size="xs" c="red.8" onClick={() => setConfirming(entry)}>
                            Remove
                          </Button>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      {paging.total > 0 && (
        <Group justify="space-between" mt="lg">
          <Text size="sm" fw={600} c="dimmed">
            Showing {firstShown}–{firstShown + entries.length - 1} of {paging.total}
          </Text>
          {pages > 1 && (
            <Pagination
              total={pages}
              value={paging.page}
              onChange={(page) => router.push(listingsUrl({ ...filter, q: filter.q }, page))}
              radius="xl"
              getControlProps={(control) => ({ "aria-label": `${control} page` })}
            />
          )}
        </Group>
      )}

      <Modal opened={Boolean(editing)} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.name}` : ""} size="lg">
        {editing && (
          <EditForm
            key={editing.id}
            entry={editing}
            compedCents={compedCents[editing.id] ?? null}
            limits={limits}
            onDone={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        )}
      </Modal>

      <Modal opened={Boolean(confirming)} onClose={() => setConfirming(null)} title="Take this listing down?" size="sm">
        {confirming && (
          <>
            <Text>
              {confirming.name} comes off {formatLong(parseKey(confirming.boardKey)!)}’s board and everyone below moves up
              {confirming.rank === 1 ? ", so #2 takes the top spot" : ""}. Nothing is refunded, and you can put the listing back later.
            </Text>
            <Group justify="flex-end" mt="lg">
              <Button variant="default" onClick={() => setConfirming(null)}>
                Keep it
              </Button>
              <Button color="red.8" loading={working} onClick={() => setStatus(confirming, "removed")}>
                Take it down
              </Button>
            </Group>
          </>
        )}
      </Modal>
    </>
  );
}

function EditForm({
  entry,
  compedCents,
  limits,
  onDone,
}: {
  entry: AdminEntry;
  compedCents: number | null;
  limits: Props["limits"];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(adminSaveListing, {});
  const photo = useRef<Blob | null>(null);

  useEffect(() => {
    if (!state.ok) return;
    notifications.show({ message: state.message, color: "green" });
    onDone();
  }, [state, onDone]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        if (photo.current) form.set("photo", photo.current, "photo.jpg");
        startTransition(() => action(form));
      }}
    >
      <input type="hidden" name="entryId" value={entry.id} />
      {state.errors?.form && (
        <Alert color="red" variant="light" mb="md" role="alert">
          {state.errors.form}
        </Alert>
      )}
      <ListingFields initial={entry} errors={state.errors} limits={limits} onPhoto={(blob) => (photo.current = blob)} />
      {compedCents !== null && (
        <TextInput
          mt="lg"
          name="amount"
          label="Comped amount"
          description="Whole dollars. Boosts people paid on top are kept."
          defaultValue={String(compedCents / 100)}
          leftSection="$"
          inputMode="numeric"
          error={state.errors?.amount}
          w={220}
        />
      )}
      <Group justify="flex-end" mt="xl">
        <Button type="submit" loading={pending}>
          Save listing
        </Button>
      </Group>
    </form>
  );
}
