/** Sort keys for the Membership "Members" table. */
export type MemberSortKey =
  | "name-asc"
  | "name-desc"
  | "start-desc"
  | "start-asc"
  | "status";

type SortableMember = {
  userName: string;
  startDate: string;
  status: string;
};

/**
 * Return a NEW array of membership rows sorted by the given key.
 * Dates are ISO (YYYY-MM-DD), so a lexicographic compare is chronological.
 */
export function sortMembers<T extends SortableMember>(
  rows: T[],
  key: MemberSortKey,
): T[] {
  const out = [...rows];
  switch (key) {
    case "name-asc":
      return out.sort((a, b) => a.userName.localeCompare(b.userName));
    case "name-desc":
      return out.sort((a, b) => b.userName.localeCompare(a.userName));
    case "start-desc":
      return out.sort((a, b) => b.startDate.localeCompare(a.startDate));
    case "start-asc":
      return out.sort((a, b) => a.startDate.localeCompare(b.startDate));
    case "status":
      return out.sort((a, b) => a.status.localeCompare(b.status));
    default:
      return out;
  }
}
