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

interface ComparisonState {
  isComparisonMode: boolean;
  leftIdeaId: string | null;
  rightIdeaId: string | null;
}

interface IdeaBoardState {
  columns: IdeaBoardColumn[];
  filters: IdeaBoardFilters;
  sortField: IdeaBoardSortField;
  sortDirection: SortDirection;
  selectedRows: Set<string>;
  comparison: ComparisonState;

  setColumns: (columns: IdeaBoardColumn[]) => void;
  toggleColumn: (column: IdeaBoardColumn) => void;
  setFilter: <K extends keyof IdeaBoardFilters>(key: K, value: IdeaBoardFilters[K]) => void;
  resetFilters: () => void;
  setSort: (field: IdeaBoardSortField, direction: SortDirection) => void;
  toggleSort: (field: IdeaBoardSortField) => void;
  toggleRowSelection: (id: string) => void;
  selectAllRows: (ids: string[]) => void;
  clearSelection: () => void;
  toggleComparisonMode: () => void;
  setComparisonSlot: (slot: "left" | "right", ideaId: string) => void;
  clearComparisonSlot: (slot: "left" | "right") => void;
  swapComparisonSlots: () => void;
  resetComparison: () => void;
}

const DEFAULT_FILTERS: IdeaBoardFilters = {
  search: "",
  status: undefined,
  category: undefined,
  tag: undefined,
};

const DEFAULT_COMPARISON: ComparisonState = {
  isComparisonMode: false,
  leftIdeaId: null,
  rightIdeaId: null,
};

export const useIdeaBoardStore = create<IdeaBoardState>()(
  persist(
    (set, get) => ({
      columns: DEFAULT_COLUMNS,
      filters: DEFAULT_FILTERS,
      sortField: "createdAt",
      sortDirection: "desc",
      selectedRows: new Set<string>(),
      comparison: DEFAULT_COMPARISON,

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

      toggleComparisonMode: () => {
        const current = get().comparison;
        if (current.isComparisonMode) {
          set({ comparison: DEFAULT_COMPARISON });
        } else {
          set({
            comparison: { ...current, isComparisonMode: true },
          });
        }
      },

      setComparisonSlot: (slot, ideaId) =>
        set((state) => ({
          comparison: {
            ...state.comparison,
            [slot === "left" ? "leftIdeaId" : "rightIdeaId"]: ideaId,
          },
        })),

      clearComparisonSlot: (slot) =>
        set((state) => ({
          comparison: {
            ...state.comparison,
            [slot === "left" ? "leftIdeaId" : "rightIdeaId"]: null,
          },
        })),

      swapComparisonSlots: () =>
        set((state) => ({
          comparison: {
            ...state.comparison,
            leftIdeaId: state.comparison.rightIdeaId,
            rightIdeaId: state.comparison.leftIdeaId,
          },
        })),

      resetComparison: () => set({ comparison: DEFAULT_COMPARISON }),
    }),
    {
      name: "ignite-idea-board",
      partialize: (state) => ({
        columns: state.columns,
        sortField: state.sortField,
        sortDirection: state.sortDirection,
        // Don't persist comparison state — it's session-only
      }),
    },
  ),
);
