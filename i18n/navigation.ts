import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Wrappers de navigation localisés (Link, redirect, usePathname, useRouter,
 * getPathname). À utiliser à la place des imports next/link et next/navigation
 * dans les composants qui doivent respecter la locale active.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
