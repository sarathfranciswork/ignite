import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { IdeaStatus } from "@/types/idea";

export type IdeaBoardSortField =
  | "title"
  | "status"
  | "category"
  | "likesCount"
  | "commentsCount"
  | "viewsCount"
  | "createdAt"
  | "updatedAt";

export type SortDirection = "asc" | "desc";

export type IdeaBoardColumn =
  | "title"
  | "status"
  | "contributor"
  | "category"
  | "tags"
  | "likesCount"
  | "commentsCount"
  | "viewsCount"
  | "createdAt"
  | "updatedAt";

const DEFAULT_COLUMNS: IdeaBoardColumn[] = [
  "title",
  "status",
  "contributor",
  "category",
  "likesCount",
  "commentsCount",
  "createdAt",
];

interface IdeaBoardFilters {
  search: string;
  status: IdeaStatus | undefined;
  category: string | undefined;
  tag: string | undefined;
}

interface IdeaBoardState {
  columns: IdeaBoardColumn[];
  filters: IdeaBoardFilters;
  sortField: IdeaBoardSortField;
  sortDirection: SortDirection;
  selectedRows: Set<string>;

  setColumns: (columns: IdeaBoardColumn[]) => void;
  toggleColumn: (column: IdeaBoardColumn) => void;
  setFilter: <K extends keyof IdeaBoardFilters>(key: K, value: IdeaBoardFilters[K]) => void;
  resetFilters: () => void;
  setSort: (field: IdeaBoardSortField, direction: SortDirection) => void;
  toggleSort: (field: IdeaBoardSortField) => void;
  toggleRowSelection: (id: string) => void;
  selectAllRows: (ids: string[]) => void;
  clearSelection: () => void;
}

const DEFAULT_FILTERS: IdeaBoardFilters = {
  search: "",
  status: undefined,
  category: undefined,
  tag: undefined,
};

export const useIdeaBoardStore = create<IdeaBoardState>()(
  persist(
    (set, get) => ({
      columns: DEFAULT_COLUMNS,
      filters: DEFAULT_FILTERS,
      sortField: "createdAt",
      sortDirection: "desc",
      selectedRows: new Set<string>(),

      setColumns: (columns) => set({ columns }),

      toggleColumn: (column) => {
        const current = get().columns;
        const next = current.includes(column)
          ? current.filter((c) => c !== column)
          : [...current, column];
        set({ columns: next });
      },

      setFilter: (key, value) =>
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        })),

      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      setSort: (field, direction) => set({ sortField: field, sortDirection: direction }),

      toggleSort: (field) => {
        const state = get();
        if (state.sortField === field) {
          set({ sortDirection: state.sortDirection === "asc" ? "desc" : "asc" });
        } else {
          set({ sortField: field, sortDirection: "desc" });
        }
      },

      toggleRowSelection: (id) => {
        const next = new Set(get().selectedRows);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        set({ selectedRows: next });
      },

      selectAllRows: (ids) => set({ selectedRows: new Set(ids) }),

      clearSelection: () => set({ selectedRows: new Set() }),
    }),
    {
      name: "ignite-idea-board",
      partialize: (state) => ({
        columns: state.columns,
        sortField: state.sortField,
        sortDirection: state.sortDirection,
      }),
    },
  ),
);
