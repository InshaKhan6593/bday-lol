"use client";

import { ActionIcon, Alert, Anchor, Badge, Button, Group, Menu, Modal, Pagination, Paper, SegmentedControl, Select, Table, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { ArrowCounterClockwiseIcon, CaretDownIcon, CaretUpIcon, DotsThreeIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { THEMES } from "@/config/themes";
import { formatLong, formatShort, parseKey } from "@/lib/birthday";
import {
  applyChange,
  compedAmountError,
  countViews,
  listingFromForm,
  viewListings,
  type AdminCounts,
  type AdminEntry,
  type AdminSort,
  type AdminView,
  type ListingPatch,
  type ListingsChange,
} from "@/lib/admin-listings";
import { parseAmountCents } from "@/lib/boost";
import { validateListing } from "@/lib/claim";
import { formatUsd } from "@/lib/money";
import { initials } from "@/lib/people";
import { routes } from "@/lib/routes";
import { adminSaveListing, adminSetStatus, type AdminActionState } from "@/server/actions/admin";
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

type Limits = { nameMaxLength: number; bioMaxLength: number; maxGiftLinks: number };

type Props = {
  /**
   * "browser": `entries` is every listing, and searching, sorting, tabs and pages happen here with no
   * trip to the server (lib/admin-listings.ts). "server": `entries` is one page the server picked.
   */
  mode: "browser" | "server";
  entries: AdminEntry[];
  filter: Filter;
  /** How many listings each tab holds, on every open board. */
  counts: AdminCounts;
  /** The site's time zone, for the "Added" column. */
  timeZone: string;
  /** Which page this is, and how many listings match in all. */
  paging: { page: number; total: number; pageSize: number };
  limits: Limits;
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
export function ListingsScreen({ mode, entries, filter: asked, counts: serverCounts, timeZone, paging, limits, justAdded }: Props) {
  const router = useRouter();
  const browser = mode === "browser";
  // In the browser's hands the filter lives here. It starts from the address and starts again when
  // the address changes (the menu's "Listings", a new comped listing's date).
  const askedKey = JSON.stringify([asked, paging.page]);
  const [seenKey, setSeenKey] = useState(askedKey);
  const [local, setLocal] = useState({ ...asked, page: paging.page });
  const [q, setQ] = useState(asked.q);
  if (askedKey !== seenKey) {
    setSeenKey(askedKey);
    setLocal({ ...asked, page: paging.page });
    setQ(asked.q);
  }
  const filter: Filter = browser ? local : asked;

  // A change is drawn at once and the server's list replaces it when the answer arrives.
  const [shown, change] = useOptimistic(entries, (current: AdminEntry[], next: ListingsChange) => applyChange(current, next));
  const [editing, setEditing] = useState<AdminEntry | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editErrors, setEditErrors] = useState<AdminActionState["errors"]>(undefined);
  const editingId = useRef<string | null>(null);
  const [confirming, setConfirming] = useState<AdminEntry | null>(null);
  const [working, startWork] = useTransition();
  // The server's way only: sorting, filtering and paging ask it, and the list dims until it answers.
  const [loading, startLoading] = useTransition();

  const view = useMemo(
    () =>
      browser
        ? viewListings(shown, { ...local, q }, local.page)
        : { rows: shown, total: paging.total, page: paging.page, pages: Math.max(1, Math.ceil(paging.total / paging.pageSize)) },
    [browser, shown, local, q, paging],
  );
  const counts = browser ? countViews(shown) : serverCounts;
  const firstShown = (view.page - 1) * paging.pageSize + 1;

  // A new search starts again from the first page.
  const go = (next: Partial<Filter>) => {
    if (browser) setLocal((current) => ({ ...current, ...next, page: 1 }));
    else startLoading(() => router.push(listingsUrl({ ...filter, q, ...next })));
  };
  const goToPage = (page: number) => {
    if (browser) setLocal((current) => ({ ...current, page }));
    else startLoading(() => router.push(listingsUrl({ ...filter, q: filter.q }, page)));
  };

  useEffect(() => {
    // The id keeps it to one notice if the effect runs twice.
    if (justAdded) notifications.show({ id: "comped-added", message: "Comped listing added. It’s live on the board.", color: "green" });
  }, [justAdded]);

  const failed = (result: AdminActionState) =>
    notifications.show({ message: result.errors?.form ?? "That didn’t work. Nothing was changed.", color: "red" });

  function setStatus(entry: AdminEntry, status: "live" | "removed") {
    setConfirming(null);
    startWork(async () => {
      change({ kind: "status", id: entry.id, status });
      const result = await adminSetStatus(entry.id, status).catch((): AdminActionState => ({ ok: false }));
      // The fresh list arrives with the action's own answer; a refusal puts the row back as it was.
      if (result.ok) notifications.show({ message: result.message, color: "green" });
      else failed(result);
    });
  }

  function openEdit(entry: AdminEntry) {
    editingId.current = entry.id;
    setEditErrors(undefined);
    setEditing(entry);
    setEditOpen(true);
  }

  function closeEdit() {
    editingId.current = null;
    setEditOpen(false);
    setEditing(null);
  }

  /** The form has checked itself: the dialog closes and the row changes now, the server follows. */
  function saveEdit(entry: AdminEntry, form: FormData, patch: ListingPatch, preview: string | null) {
    setEditOpen(false);
    startWork(async () => {
      change({ kind: "edit", id: entry.id, patch });
      const result = await adminSaveListing({}, form).catch((): AdminActionState => ({ ok: false }));
      if (preview) URL.revokeObjectURL(preview);
      if (result.ok) {
        notifications.show({ message: result.message, color: "green" });
        if (editingId.current === entry.id) closeEdit();
        return;
      }
      // The form is still there with everything that was typed: open it again with what went wrong.
      if (editingId.current === entry.id) {
        setEditErrors(result.errors ?? { form: "That didn’t save. Try again." });
        setEditOpen(true);
      } else {
        failed(result);
      }
    });
  }

  // A second click on the same column turns it round.
  const sortBy = (column: (typeof COLUMNS)[number]) =>
    go({ sort: { by: column.by, dir: filter.sort.by === column.by ? (filter.sort.dir === "asc" ? "desc" : "asc") : column.first } });
  const added = new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric", year: "numeric" });

  const md = parseKey(filter.date);
  const pages = view.pages;
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
        <TextInput label="Name" placeholder="Search names" value={q} onChange={(e) => {
            setQ(e.currentTarget.value);
            // The matches change as the name is typed: back to their first page.
            if (browser) setLocal((current) => ({ ...current, page: 1 }));
          }}
          className={`${classes.filterGrow} ${classes.filterName}`}
        />
        {/* In the browser's hands the list follows the name as it is typed: nothing to press. */}
        {!browser && (
          <Button type="submit" variant="default">
            Search
          </Button>
        )}
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
        {view.rows.length === 0 ? (
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
              {view.rows.map((entry) => {
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
                          <ActionIcon variant="default" className={classes.rowAction} aria-label={`Actions for ${entry.name}`}>
                            <DotsThreeIcon size={22} weight="bold" aria-hidden />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<PencilSimpleIcon size={16} weight="bold" aria-hidden />} onClick={() => openEdit(entry)}>
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

      {view.total > 0 && (
        <Group justify="space-between" mt="lg">
          <Text size="sm" fw={600} c="dimmed">
            Showing {firstShown}–{firstShown + view.rows.length - 1} of {view.total}
          </Text>
          {pages > 1 && (
            <Pagination
              total={pages}
              value={view.page}
              onChange={goToPage}
              radius="xl"
              getControlProps={(control) => ({ "aria-label": `${control} page` })}
            />
          )}
        </Group>
      )}

      {/* Kept in place while a save is on its way, so a refused save can open it again as it was left. */}
      <Modal opened={editOpen} onClose={closeEdit} title={editing ? `Edit ${editing.name}` : ""} size="lg" keepMounted>
        {editing && (
          <EditForm
            key={editing.id}
            entry={editing}
            limits={limits}
            serverErrors={editErrors}
            onSave={(form, patch, preview) => saveEdit(editing, form, patch, preview)}
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
              <Button color="red.8" onClick={() => setStatus(confirming, "removed")}>
                Take it down
              </Button>
            </Group>
          </>
        )}
      </Modal>
    </>
  );
}

/**
 * The edit form. It checks itself with the rules the server uses (lib/claim.ts), so a mistake shows
 * at once; a form that passes is handed up, and the dialog closes without waiting for the server.
 */
function EditForm({
  entry,
  limits,
  serverErrors,
  onSave,
}: {
  entry: AdminEntry;
  limits: Limits;
  /** What the server refused, after the form itself had passed. */
  serverErrors: AdminActionState["errors"];
  onSave: (form: FormData, patch: ListingPatch, preview: string | null) => void;
}) {
  const [errors, setErrors] = useState<AdminActionState["errors"]>(undefined);
  // The newest word wins: the server's refusal shows until the form is checked again.
  const [seenServer, setSeenServer] = useState(serverErrors);
  if (serverErrors !== seenServer) {
    setSeenServer(serverErrors);
    setErrors(serverErrors);
  }
  const photo = useRef<Blob | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const checked = validateListing(listingFromForm(form), limits);
        if (!checked.ok) return setErrors(checked.errors);
        const patch: ListingPatch = { ...checked.listing };
        if (entry.compedCents !== null) {
          const amountCents = parseAmountCents(String(form.get("amount") ?? ""));
          const amountError = compedAmountError(amountCents);
          if (amountError) return setErrors({ amount: amountError });
          patch.totalCents = entry.totalCents - entry.compedCents + amountCents;
          patch.compedCents = amountCents;
        }
        let preview: string | null = null;
        if (photo.current) {
          form.set("photo", photo.current, "photo.jpg");
          preview = URL.createObjectURL(photo.current);
          patch.photoUrl = preview;
        } else if (form.get("removePhoto") === "1") {
          patch.photoUrl = null;
        }
        setErrors(undefined);
        onSave(form, patch, preview);
      }}
    >
      <input type="hidden" name="entryId" value={entry.id} />
      {errors?.form && (
        <Alert color="red" variant="light" mb="md" role="alert">
          {errors.form}
        </Alert>
      )}
      <ListingFields initial={entry} errors={errors} limits={limits} onPhoto={(blob) => (photo.current = blob)} />
      {entry.compedCents !== null && (
        <TextInput
          mt="lg"
          name="amount"
          label="Comped amount"
          description="The free amount you gave this listing, in whole dollars. Paid boosts are added to it."
          defaultValue={String(entry.compedCents / 100)}
          leftSection="$"
          inputMode="numeric"
          error={errors?.amount}
          classNames={{ wrapper: classes.amountBox }}
        />
      )}
      <Group justify="flex-end" mt="xl">
        <Button type="submit">Save listing</Button>
      </Group>
    </form>
  );
}
