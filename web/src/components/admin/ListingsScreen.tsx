"use client";

import { ActionIcon, Alert, Anchor, Badge, Button, Group, Menu, Modal, Pagination, Paper, SegmentedControl, Select, Table, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { ArrowCounterClockwiseIcon, CaretDownIcon, CaretUpIcon, DotsThreeIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from "react";
import { THEMES } from "@/config/themes";
import { formatLong, formatShort, parseKey } from "@/lib/birthday";
import { formatUsd } from "@/lib/money";
import { initials } from "@/lib/people";
import { routes } from "@/lib/routes";
import { adminSaveListing, adminSetStatus, type AdminActionState } from "@/server/actions/admin";
import type { AdminCounts, AdminEntry, AdminSort, AdminView } from "@/server/admin";
import { LoadingBar, PageHead } from "./AdminShell";
import { DateSelect } from "./DateSelect";
import { ListingFields } from "./ListingFields";
import classes from "./admin.module.css";

type Filter = { date: string; q: string; status: AdminView; sort: AdminSort };

const VIEWS: Array<{ value: AdminView; label: string }> = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "removed", label: "Removed" },
  { value: "comped", label: "Comped" },
];

/** On a phone the table is a list of cards with no headings to click, so the same orders are in one list. */
const SORT_CHOICES: Array<{ value: string; label: string }> = [
  { value: "added:desc", label: "Newest first" },
  { value: "added:asc", label: "Oldest first" },
  { value: "name:asc", label: "Name, A to Z" },
  { value: "name:desc", label: "Name, Z to A" },
  { value: "total:desc", label: "Total, high to low" },
  { value: "total:asc", label: "Total, low to high" },
  { value: "date:asc", label: "Birthday, Jan to Dec" },
  { value: "date:desc", label: "Birthday, Dec to Jan" },
  { value: "rank:asc", label: "Rank, #1 first" },
  { value: "status:asc", label: "Status" },
];

/** The sortable columns, and which way each one starts when it is first clicked. */
const COLUMNS: Array<{ by: AdminSort["by"]; label: string; first: AdminSort["dir"] }> = [
  { by: "rank", label: "#", first: "asc" },
  { by: "name", label: "Person", first: "asc" },
  { by: "date", label: "Date", first: "asc" },
  { by: "total", label: "Total", first: "desc" },
  { by: "status", label: "Status", first: "asc" },
  { by: "added", label: "Added", first: "desc" },
];

type Props = {
  entries: AdminEntry[];
  filter: Filter;
  /** How many listings each tab holds, on every open board. */
  counts: AdminCounts;
  /** The site's time zone, for the "Added" column. */
  timeZone: string;
  /** Which page this is, and how many listings match in all. */
  paging: { page: number; total: number; pageSize: number };
  limits: { nameMaxLength: number; bioMaxLength: number };
  /** Just added a comped listing: say so once. */
  justAdded: boolean;
};

function listingsUrl(filter: Filter, page = 1): Route {
  const params = new URLSearchParams();
  if (filter.date) params.set("date", filter.date);
  if (filter.q.trim()) params.set("q", filter.q.trim());
  if (filter.status !== "all") params.set("status", filter.status);
  if (filter.sort.by !== "added" || filter.sort.dir !== "desc") {
    params.set("sort", filter.sort.by);
    params.set("dir", filter.sort.dir);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return (query ? `${routes.admin.listings}?${query}` : routes.admin.listings) as Route;
}

/** Everyone on the open boards: find a listing, edit it, take it down or put it back. */
export function ListingsScreen({ entries, filter, counts, timeZone, paging, limits, justAdded }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(filter.q);
  const [editing, setEditing] = useState<AdminEntry | null>(null);
  const [confirming, setConfirming] = useState<AdminEntry | null>(null);
  const [working, startWork] = useTransition();
  // Sorting, filtering and paging ask the server: the list dims and the bar runs until it answers.
  const [loading, startLoading] = useTransition();
  // A new search starts again from the first page.
  const go = (next: Partial<Filter>) => startLoading(() => router.push(listingsUrl({ ...filter, q, ...next })));
  const pages = Math.max(1, Math.ceil(paging.total / paging.pageSize));
  const firstShown = (paging.page - 1) * paging.pageSize + 1;

  useEffect(() => {
    // The id keeps it to one notice if the effect runs twice.
    if (justAdded) notifications.show({ id: "comped-added", message: "Comped listing added. It’s live on the board.", color: "green" });
  }, [justAdded]);

  function setStatus(entry: AdminEntry, status: "live" | "removed") {
    startWork(async () => {
      const result = await adminSetStatus(entry.id, status);
      notifications.show(
        result.ok ? { message: result.message, color: "green" } : { message: result.errors?.form ?? "That didn’t work.", color: "red" },
      );
      // The fresh list arrives with the action's own answer.
      setConfirming(null);
    });
  }

  // A second click on the same column turns it round.
  const sortBy = (column: (typeof COLUMNS)[number]) =>
    go({ sort: { by: column.by, dir: filter.sort.by === column.by ? (filter.sort.dir === "asc" ? "desc" : "asc") : column.first } });
  const added = new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric", year: "numeric" });

  const md = parseKey(filter.date);
  return (
    <>
      <PageHead
        title="Listings"
        lead={
          <>
            {md ? `Everyone on ${formatLong(md)}’s board.` : "Every listing on the open boards, newest first."}
            <span className={classes.deskOnly}> Click a column to sort by it.</span>
          </>
        }
        aside={
          <div className={classes.counts}>
            {VIEWS.map((view) => (
              <Badge key={view.value} className={classes.count}>
                {view.label} {counts[view.value].toLocaleString("en-US")}
              </Badge>
            ))}
          </div>
        }
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
        <DateSelect value={filter.date} onChange={(date) => go({ date })} allowAll compact />
        <TextInput label="Name" placeholder="Search names" value={q} onChange={(e) => setQ(e.currentTarget.value)} w={200} className={classes.filterGrow} />
        <Button type="submit" variant="default">
          Search
        </Button>
        <SegmentedControl
          className={classes.filterTabs}
          aria-label="Which listings"
          value={filter.status}
          onChange={(status) => go({ status: status as AdminView })}
          data={VIEWS}
        />
        <Select
          className={classes.phoneOnly}
          label="Sort by"
          allowDeselect={false}
          value={`${filter.sort.by}:${filter.sort.dir}`}
          // An order picked from a column that isn't in the list (status, reversed) still shows as picked.
          data={
            SORT_CHOICES.some((choice) => choice.value === `${filter.sort.by}:${filter.sort.dir}`)
              ? SORT_CHOICES
              : [...SORT_CHOICES, { value: `${filter.sort.by}:${filter.sort.dir}`, label: "Custom" }]
          }
          onChange={(picked) => {
            const [by, dir] = (picked ?? "added:desc").split(":") as [AdminSort["by"], AdminSort["dir"]];
            go({ sort: { by, dir } });
          }}
          comboboxProps={{ position: "bottom-start", middlewares: { flip: false, shift: false }, withinPortal: true }}
          classNames={{ dropdown: classes.listPanel, option: classes.listOption }}
        />
      </form>

      <LoadingBar active={loading || working} />
      <Paper className={classes.tableCard} data-busy={loading || undefined} aria-busy={loading}>
        {entries.length === 0 ? (
          <p className={classes.empty}>No listings match. Try another date or name.</p>
        ) : (
          <Table className={classes.listTable}>
            <Table.Thead>
              <Table.Tr>
                {COLUMNS.map((column) => {
                  const active = filter.sort.by === column.by;
                  const up = active ? filter.sort.dir === "asc" : column.first === "asc";
                  const Arrow = up ? CaretUpIcon : CaretDownIcon;
                  return (
                    <Table.Th key={column.by} aria-sort={active ? (filter.sort.dir === "asc" ? "ascending" : "descending") : undefined}>
                      <button type="button" className={classes.sort} data-active={active || undefined} onClick={() => sortBy(column)}>
                        {column.label}
                        <Arrow size={12} weight="bold" aria-hidden className={classes.sortArrow} />
                      </button>
                    </Table.Th>
                  );
                })}
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
                    <Table.Td className={classes.personCell}>
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
                          <div className={classes.personName} data-removed={removed || undefined} title={entry.name}>
                            {entry.name}
                          </div>
                          <div className={classes.personSub} title={entry.bio || undefined}>
                            {entry.bio || entry.ownerEmail || "No bio"}
                          </div>
                        </div>
                      </div>
                    </Table.Td>
                    <Table.Td className={classes.dateCell}>
                      {/* Not loaded ahead: 50 rows would each ask the server for a public page nobody may open. */}
                      <Anchor
                        component={Link}
                        prefetch={false}
                        href={routes.person(date, removed ? null : entry.slug)}
                        target="_blank"
                        c="inherit"
                        fw={600}
                        underline="always"
                      >
                        {formatShort(date)}
                      </Anchor>
                      <Text size="xs" c="dimmed" className={classes.dateYear}>
                        {entry.year}
                      </Text>
                    </Table.Td>
                    <Table.Td className={classes.money}>{formatUsd(entry.totalCents)}</Table.Td>
                    <Table.Td className={classes.statusCell}>
                      <Group gap={6} wrap="nowrap">
                        {removed ? (
                          <Badge className={classes.badgeRemoved}>Removed</Badge>
                        ) : (
                          <Badge className={classes.badgeLive}>Live</Badge>
                        )}
                        {entry.isComped && <Badge className={classes.badgeComped}>Comped</Badge>}
                        {entry.isMinor && <Badge className={classes.badgeChild}>Child</Badge>}
                      </Group>
                    </Table.Td>
                    <Table.Td className={classes.addedCell}>{entry.liveAt ? added.format(new Date(entry.liveAt)) : "–"}</Table.Td>
                    <Table.Td className={classes.actionCell}>
                      <Menu position="bottom-end" withinPortal classNames={{ dropdown: classes.listPanel, item: classes.menuItem }}>
                        <Menu.Target>
                          <ActionIcon variant="default" className={classes.rowAction} aria-label={`Actions for ${entry.name}`} loading={working && removed}>
                            <DotsThreeIcon size={22} weight="bold" aria-hidden />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<PencilSimpleIcon size={16} weight="bold" aria-hidden />} onClick={() => setEditing(entry)}>
                            Edit
                          </Menu.Item>
                          {removed ? (
                            <Menu.Item leftSection={<ArrowCounterClockwiseIcon size={16} weight="bold" aria-hidden />} onClick={() => setStatus(entry, "live")}>
                              Restore
                            </Menu.Item>
                          ) : (
                            <Menu.Item
                              leftSection={<TrashIcon size={16} weight="bold" aria-hidden />}
                              className={classes.menuDanger}
                              onClick={() => setConfirming(entry)}
                            >
                              Remove
                            </Menu.Item>
                          )}
                        </Menu.Dropdown>
                      </Menu>
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
              onChange={(page) => startLoading(() => router.push(listingsUrl({ ...filter, q: filter.q }, page)))}
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
            compedCents={editing.compedCents}
            limits={limits}
            onDone={() => setEditing(null)}
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
