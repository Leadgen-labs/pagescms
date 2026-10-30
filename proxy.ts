import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { internalProjectPath, publicProjectPath } from "@/lib/project-url";

function isAllowedOrigin(originHeader: string, hostHeader: string): boolean {
	try {
		const originUrl = new URL(originHeader);
		return originUrl.host.toLowerCase() === hostHeader.toLowerCase();
	} catch {
		return false;
	}
}

export function proxy(request: NextRequest) {
	const pathname = request.nextUrl.pathname;
	const internalPath = internalProjectPath(pathname);
	const publicPath = publicProjectPath(pathname);
	const isStaticAsset =
		pathname.startsWith("/_next/") ||
		pathname === "/favicon.ico" ||
		/\.[^/]+$/.test(pathname);

	if (isStaticAsset && internalPath === pathname && publicPath === pathname) {
		return NextResponse.next();
	}

	if (pathname.startsWith("/api/") && pathname !== "/api/webhook/github" && request.method !== "GET") {
		const originHeader = request.headers.get("Origin");
		const hostHeader = request.headers.get("Host");
		if (!originHeader || !hostHeader || !isAllowedOrigin(originHeader, hostHeader)) {
			return new NextResponse(null, {
				status: 403
			});
		}
	}

	// Canonicalize page GETs only. API calls and form/action POSTs keep their behavior.
	if ((request.method === "GET" || request.method === "HEAD") && publicPath !== pathname) {
		const destination = new URL(request.url);
		destination.pathname = publicPath;
		return NextResponse.redirect(destination, 307);
	}
	const requestHeaders = new Headers(request.headers);
	const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
	requestHeaders.set("x-return-to", returnTo);

	if (internalPath !== pathname) {
		const destination = new URL(request.url);
		destination.pathname = internalPath;
		return NextResponse.rewrite(destination, { request: { headers: requestHeaders } });
	}

	return NextResponse.next({
		request: {
			headers: requestHeaders,
		},
	});
}

export const config = {
	matcher: "/:path*"
}
