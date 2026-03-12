import { describe, it, expect, beforeEach } from "vitest";
import { useIdeaBoardStore } from "./ideaBoard.store";

describe("useIdeaBoardStore", () => {
  beforeEach(() => {
    const { resetFilters, clearSelection, setColumns, setSort, resetComparison } =
      useIdeaBoardStore.getState();
    resetFilters();
    clearSelection();
    resetComparison();
    setColumns([
      "title",
      "status",
      "contributor",
      "category",
      "likesCount",
      "commentsCount",
      "createdAt",
    ]);
    setSort("createdAt", "desc");
  });

  describe("columns", () => {
    it("starts with default columns", () => {
      const { columns } = useIdeaBoardStore.getState();
      expect(columns).toContain("title");
      expect(columns).toContain("status");
      expect(columns).toContain("contributor");
    });

    it("toggleColumn adds a column not in the list", () => {
      const { toggleColumn } = useIdeaBoardStore.getState();
      toggleColumn("viewsCount");
      expect(useIdeaBoardStore.getState().columns).toContain("viewsCount");
    });

    it("toggleColumn removes a column already in the list", () => {
      const { toggleColumn } = useIdeaBoardStore.getState();
      toggleColumn("category");
      expect(useIdeaBoardStore.getState().columns).not.toContain("category");
    });

    it("setColumns replaces all columns", () => {
      const { setColumns } = useIdeaBoardStore.getState();
      setColumns(["title", "status"]);
      expect(useIdeaBoardStore.getState().columns).toEqual(["title", "status"]);
    });
  });

  describe("filters", () => {
    it("setFilter updates a single filter", () => {
      const { setFilter } = useIdeaBoardStore.getState();
      setFilter("status", "HOT");
      expect(useIdeaBoardStore.getState().filters.status).toBe("HOT");
    });

    it("setFilter updates search", () => {
      const { setFilter } = useIdeaBoardStore.getState();
      setFilter("search", "machine learning");
      expect(useIdeaBoardStore.getState().filters.search).toBe("machine learning");
    });

    it("resetFilters clears all filters", () => {
      const { setFilter, resetFilters } = useIdeaBoardStore.getState();
      setFilter("status", "HOT");
      setFilter("search", "test");
      setFilter("category", "Tech");
      resetFilters();

      const { filters } = useIdeaBoardStore.getState();
      expect(filters.search).toBe("");
      expect(filters.status).toBeUndefined();
      expect(filters.category).toBeUndefined();
      expect(filters.tag).toBeUndefined();
    });
  });

  describe("sorting", () => {
    it("setSort updates field and direction", () => {
      const { setSort } = useIdeaBoardStore.getState();
      setSort("likesCount", "asc");
      const state = useIdeaBoardStore.getState();
      expect(state.sortField).toBe("likesCount");
      expect(state.sortDirection).toBe("asc");
    });

    it("toggleSort reverses direction on same field", () => {
      const { setSort, toggleSort } = useIdeaBoardStore.getState();
      setSort("createdAt", "desc");
      toggleSort("createdAt");
      expect(useIdeaBoardStore.getState().sortDirection).toBe("asc");
    });

    it("toggleSort switches to new field with desc direction", () => {
      const { setSort, toggleSort } = useIdeaBoardStore.getState();
      setSort("createdAt", "asc");
      toggleSort("likesCount");
      const state = useIdeaBoardStore.getState();
      expect(state.sortField).toBe("likesCount");
      expect(state.sortDirection).toBe("desc");
    });
  });

  describe("row selection", () => {
    it("toggleRowSelection adds a row", () => {
      const { toggleRowSelection } = useIdeaBoardStore.getState();
      toggleRowSelection("idea-1");
      expect(useIdeaBoardStore.getState().selectedRows.has("idea-1")).toBe(true);
    });

    it("toggleRowSelection removes a selected row", () => {
      const { toggleRowSelection } = useIdeaBoardStore.getState();
      toggleRowSelection("idea-1");
      toggleRowSelection("idea-1");
      expect(useIdeaBoardStore.getState().selectedRows.has("idea-1")).toBe(false);
    });

    it("selectAllRows replaces selection with given ids", () => {
      const { selectAllRows } = useIdeaBoardStore.getState();
      selectAllRows(["idea-1", "idea-2", "idea-3"]);
      const { selectedRows } = useIdeaBoardStore.getState();
      expect(selectedRows.size).toBe(3);
      expect(selectedRows.has("idea-1")).toBe(true);
      expect(selectedRows.has("idea-3")).toBe(true);
    });

    it("clearSelection empties the selection", () => {
      const { selectAllRows, clearSelection } = useIdeaBoardStore.getState();
      selectAllRows(["idea-1", "idea-2"]);
      clearSelection();
      expect(useIdeaBoardStore.getState().selectedRows.size).toBe(0);
    });
  });

  describe("comparison mode", () => {
    it("starts with comparison mode disabled", () => {
      const { comparison } = useIdeaBoardStore.getState();
      expect(comparison.isComparisonMode).toBe(false);
      expect(comparison.leftIdeaId).toBeNull();
      expect(comparison.rightIdeaId).toBeNull();
    });

    it("toggleComparisonMode enables comparison mode", () => {
      const { toggleComparisonMode } = useIdeaBoardStore.getState();
      toggleComparisonMode();
      expect(useIdeaBoardStore.getState().comparison.isComparisonMode).toBe(true);
    });

    it("toggleComparisonMode disables and resets comparison", () => {
      const { toggleComparisonMode, setComparisonSlot } = useIdeaBoardStore.getState();
      toggleComparisonMode();
      setComparisonSlot("left", "idea-1");
      setComparisonSlot("right", "idea-2");
      toggleComparisonMode();

      const { comparison } = useIdeaBoardStore.getState();
      expect(comparison.isComparisonMode).toBe(false);
      expect(comparison.leftIdeaId).toBeNull();
      expect(comparison.rightIdeaId).toBeNull();
    });

    it("setComparisonSlot sets left idea", () => {
      const { setComparisonSlot } = useIdeaBoardStore.getState();
      setComparisonSlot("left", "idea-1");
      expect(useIdeaBoardStore.getState().comparison.leftIdeaId).toBe("idea-1");
    });

    it("setComparisonSlot sets right idea", () => {
      const { setComparisonSlot } = useIdeaBoardStore.getState();
      setComparisonSlot("right", "idea-2");
      expect(useIdeaBoardStore.getState().comparison.rightIdeaId).toBe("idea-2");
    });

    it("clearComparisonSlot clears the left slot", () => {
      const { setComparisonSlot, clearComparisonSlot } = useIdeaBoardStore.getState();
      setComparisonSlot("left", "idea-1");
      clearComparisonSlot("left");
      expect(useIdeaBoardStore.getState().comparison.leftIdeaId).toBeNull();
    });

    it("clearComparisonSlot clears the right slot", () => {
      const { setComparisonSlot, clearComparisonSlot } = useIdeaBoardStore.getState();
      setComparisonSlot("right", "idea-2");
      clearComparisonSlot("right");
      expect(useIdeaBoardStore.getState().comparison.rightIdeaId).toBeNull();
    });

    it("swapComparisonSlots swaps left and right", () => {
      const { setComparisonSlot, swapComparisonSlots } = useIdeaBoardStore.getState();
      setComparisonSlot("left", "idea-1");
      setComparisonSlot("right", "idea-2");
      swapComparisonSlots();

      const { comparison } = useIdeaBoardStore.getState();
      expect(comparison.leftIdeaId).toBe("idea-2");
      expect(comparison.rightIdeaId).toBe("idea-1");
    });

    it("swapComparisonSlots works with only one slot filled", () => {
      const { setComparisonSlot, swapComparisonSlots } = useIdeaBoardStore.getState();
      setComparisonSlot("left", "idea-1");
      swapComparisonSlots();

      const { comparison } = useIdeaBoardStore.getState();
      expect(comparison.leftIdeaId).toBeNull();
      expect(comparison.rightIdeaId).toBe("idea-1");
    });

    it("resetComparison resets all comparison state", () => {
      const { toggleComparisonMode, setComparisonSlot, resetComparison } =
        useIdeaBoardStore.getState();
      toggleComparisonMode();
      setComparisonSlot("left", "idea-1");
      setComparisonSlot("right", "idea-2");
      resetComparison();

      const { comparison } = useIdeaBoardStore.getState();
      expect(comparison.isComparisonMode).toBe(false);
      expect(comparison.leftIdeaId).toBeNull();
      expect(comparison.rightIdeaId).toBeNull();
    });
  });
});
