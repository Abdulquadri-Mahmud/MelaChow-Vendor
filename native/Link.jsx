"use client";
import NextLink from "next/link";
import { toNativeHref } from "./routes.mjs";
export default function Link({ href, ...props }) { return <NextLink href={toNativeHref(href)} {...props} />; }
