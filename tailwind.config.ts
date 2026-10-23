import type { Config } from "tailwindcss";
export default { content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"], theme: { extend: { colors: { ink: "#15231e", muted: "#75827d", line: "#e8ede9", canvas: "#f7f9f7", green: "#147a55", lime: "#d9f36a" }, boxShadow: { soft: "0 8px 26px rgba(26,50,39,.05)" } } }, plugins: [] } satisfies Config;
