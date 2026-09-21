import { Miniflare } from "miniflare";
import { createHash } from "node:crypto";

const UUID = "12345678-1234-4234-8234-123456789012";
const ADMIN = "test123";

const mf = new Miniflare({
	scriptPath: "_worker.js",
	modules: true,
	compatibilityDate: "2025-11-04",
	kvNamespaces: ["KV"],
	bindings: { ADMIN, UUID },
});

let pass = 0, fail = 0;
const results = [];

async function hit(method, path, { expectStatus, expectTypeContains, bodyContains } = {}) {
	const url = `https://test.local${path}`;
	let res;
	try {
		res = await mf.dispatchFetch(url, { method });
	} catch (e) {
		results.push(`FAIL ${method} ${path} -> 抛错: ${e.message}`);
		fail++;
		return;
	}
	const text = await res.text();
	const ct = res.headers.get("content-type") || "";
	let ok = true;
	const notes = [];
	if (expectStatus !== undefined && res.status !== expectStatus) { ok = false; notes.push(`status=${res.status} 期望${expectStatus}`); }
	if (expectTypeContains && !ct.includes(expectTypeContains)) { ok = false; notes.push(`ct=${ct}`); }
	if (bodyContains && !text.includes(bodyContains)) { ok = false; notes.push(`body 不含 ${bodyContains}`); }
	results.push(`${ok ? "PASS" : "FAIL"} ${method} ${path} -> ${res.status} ${ct.slice(0, 40)}${notes.length ? " | " + notes.join("; ") : ""}`);
	if (ok) pass++; else fail++;
}

await hit("GET", `/version?uuid=${UUID}`, { expectStatus: 200, expectTypeContains: "json" });
await hit("GET", "/robots.txt", { expectStatus: 200, expectTypeContains: "text/plain" });
await hit("GET", "/favicon.ico", { expectStatus: 404 });
await hit("GET", "/.env", { expectStatus: 404 });
await hit("GET", "/.git/config", { expectStatus: 404 });
await hit("GET", "/wp-admin", { expectStatus: 404 });
await hit("GET", "/wp-login.php", { expectStatus: 404 });
await hit("GET", "/wp-content/uploads/x", { expectStatus: 404 });
await hit("GET", "/xmlrpc.php", { expectStatus: 404 });
await hit("GET", "/administrator", { expectStatus: 404 });
await hit("GET", "/admin.php", { expectStatus: 404 });
await hit("GET", "/phpmyadmin", { expectStatus: 404 });
await hit("GET", "/cgi-bin/test", { expectStatus: 404 });
await hit("GET", "/server-status", { expectStatus: 404 });
await hit("GET", "/actuator/env", { expectStatus: 404 });
await hit("GET", "/api-docs", { expectStatus: 404 });
await hit("GET", "/swagger", { expectStatus: 404 });
await hit("GET", "/.aws/credentials", { expectStatus: 404 });
await hit("GET", "/.ssh/id_rsa", { expectStatus: 404 });
await hit("GET", "/test.php", { expectStatus: 404 });
await hit("GET", "/foo.asp", { expectStatus: 404 });
await hit("GET", "/bar.aspx", { expectStatus: 404 });
await hit("GET", "/baz.jsp", { expectStatus: 404 });
await hit("GET", "/.well-known/acme-challenge", { expectStatus: 404 });
await hit("GET", "/", { expectStatus: 200 });
await hit("GET", "/unknownpage", { expectStatus: 200 });
await hit("GET", "/some/deep/path", { expectStatus: 200 });

console.log(results.join("\n"));
console.log(`\n合计: ${pass} 通过, ${fail} 失败`);

await mf.dispose();
process.exit(fail === 0 ? 0 : 1);