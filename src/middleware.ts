import type { NextRequest } from "next/server";
import { proxyMiddleware } from "./proxy";

export function middleware(request: NextRequest) {
  return proxyMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
