"use client";
import { publishMenuItem } from '@/app/lib/publishMenuItem.mjs';
import * as menuApi from '@/app/lib/menuApi';

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
    updateMenuItem,
    toggleMenuItemAvailability,
    toggleMenuItemStock,
    archiveMenuItem,
    getFullVendorMenu,
    getPlatformCategories,
    getVendorSections,
    createVendorSection,
} from "../lib/menuApi";

// ─────────────────────────────────────────────
// READ HOOKS
// ─────────────────────────────────────────────

export const useVendorMenu = (vendorId) => {
    return useQuery({
        queryKey: ["vendor-menu", vendorId],
        queryFn: () => getFullVendorMenu(vendorId),
        enabled: !!vendorId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

export const usePlatformCategories = () => {
    return useQuery({
        queryKey: ["platform-categories"],
        queryFn: getPlatformCategories,
        staleTime: 1000 * 60 * 30, // 30 min — categories rarely change
    });
};

export const useVendorSections = (vendorId) => {
    return useQuery({
        queryKey: ["vendor-sections", vendorId],
        queryFn: () => getVendorSections(vendorId),
        enabled: !!vendorId,
    });
};

// ─────────────────────────────────────────────
// CREATE FOOD — SEQUENTIAL ORCHESTRATION
// ─────────────────────────────────────────────

/**
 * useCreateMenuItem — orchestrates the full 4-step creation sequence:
 *
 * 1. POST /v1/menu/:vendorId/items              → get itemId
 * 2. POST .../items/:itemId/portions            → one call per portion
 * 3. POST .../items/:itemId/choice-groups       → one call per group → get groupId
 * 4. POST .../choice-groups/:groupId/options    → one call per option
 *
 * The mutationFn receives:
 * {
 *   vendorId: string,
 *   item: { name, description, image_url, item_type, prep_time_minutes, tags,
 *            platform_category_id, vendor_section_id }
 *   portions: [{ label, price_naira, is_default, max_quantity, sort_order }]
 *   choice_groups: [{
 *     name, min_selections, max_selections, is_required, sort_order,
 *     options: [{ label, price_modifier_naira, is_available, sort_order }]
 *   }]
 * }
 *
 * CRITICAL KOBO CONVERSIONS — done INSIDE this hook, NOT in the component:
 *   portion.price_naira * 100          → portion.price (kobo)
 *   option.price_modifier_naira * 100  → option.price_modifier (kobo)
 *
 * Returns the created item's _id on success.
 */
export const useCreateMenuItem = (vendorId) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (draft) => publishMenuItem(menuApi, vendorId, draft),

        onSuccess: () => {
            toast.success("Food is live on your menu! 🎉");
            // Invalidate so vendor menu lists re-fetch with the new item
            queryClient.invalidateQueries({ queryKey: ["vendor-menu", vendorId] });
            queryClient.invalidateQueries({ queryKey: ["vendor-foods", vendorId] });
            queryClient.invalidateQueries({ queryKey: ["vendors"] });
        },

        onError: (error) => {
            const message = error?.response?.data?.message || error?.message;
            console.error("[useCreateMenuItem] Error:", error);
            // Do NOT reset form on error — user must be able to retry
            toast.error(message || "Something went wrong. Your progress is saved — please try again.");
        },
    });
};

// ─────────────────────────────────────────────
// UPDATE & TOGGLE HOOKS
// ─────────────────────────────────────────────

export const useUpdateMenuItem = (vendorId) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ itemId, payload }) => updateMenuItem(vendorId, itemId, payload),
        onSuccess: () => {
            toast.success("Food updated");
            queryClient.invalidateQueries({ queryKey: ["vendor-menu", vendorId] });
            queryClient.invalidateQueries({ queryKey: ["vendors"] });
        },
        onError: () => toast.error("Failed to update food"),
    });
};

export const useToggleAvailability = (vendorId) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ itemId, is_available }) =>
            toggleMenuItemAvailability(vendorId, itemId, is_available),
        onSuccess: (_, { is_available }) => {
            toast.success(is_available ? "Food is now available" : "Food hidden from customers");
            queryClient.invalidateQueries({ queryKey: ["vendor-menu", vendorId] });
            queryClient.invalidateQueries({ queryKey: ["vendors"] });
        },
        onError: () => toast.error("Failed to update availability"),
    });
};

export const useToggleStock = (vendorId) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ itemId, is_in_stock }) =>
            toggleMenuItemStock(vendorId, itemId, is_in_stock),
        onSuccess: (_, { is_in_stock }) => {
            toast.success(is_in_stock ? "Marked as in stock" : "Marked as sold out");
            queryClient.invalidateQueries({ queryKey: ["vendor-menu", vendorId] });
            queryClient.invalidateQueries({ queryKey: ["vendors"] });
        },
        onError: () => toast.error("Failed to update stock status"),
    });
};

/**
 * Soft delete — sets is_archived: true.
 * NEVER uses HTTP DELETE for food items.
 * The item disappears from the menu but remains in the database.
 */
export const useArchiveMenuItem = (vendorId) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (itemId) => archiveMenuItem(vendorId, itemId),
        onSuccess: () => {
            toast.success("Food removed from menu");
            queryClient.invalidateQueries({ queryKey: ["vendor-menu", vendorId] });
            queryClient.invalidateQueries({ queryKey: ["vendors"] });
        },
        onError: () => toast.error("Failed to remove food"),
    });
};

// ─────────────────────────────────────────────
// SECTION HOOKS
// ─────────────────────────────────────────────

export const useCreateSection = (vendorId) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (name) => createVendorSection(vendorId, name),
        onSuccess: () => {
            toast.success("Section created");
            queryClient.invalidateQueries({ queryKey: ["vendor-sections", vendorId] });
        },
        onError: () => toast.error("Failed to create section"),
    });
};
