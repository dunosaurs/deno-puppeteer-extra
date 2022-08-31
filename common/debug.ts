export default function debug(...args: any[]) {
  if (Deno.args.includes("debug")) {
    console.log(...args);
  }
}
