/**
 * Merge class names with Tailwind CSS conflict resolution.
 * Placeholder — Story 1.1 will add clsx + tailwind-merge.
 */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
