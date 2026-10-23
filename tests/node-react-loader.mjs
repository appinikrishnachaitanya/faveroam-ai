import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../node_modules/react");
const dom = resolve(dirname(fileURLToPath(import.meta.url)), "../node_modules/react-dom");
const entries = new Map([
  ["react", `${root}/index.js`],
  ["react/jsx-runtime", `${root}/jsx-runtime.js`],
  ["react/jsx-dev-runtime", `${root}/jsx-dev-runtime.js`],
  ["react-dom", `${dom}/index.js`],
  ["react-dom/server", `${dom}/server.node.js`],
]);

// Server-only modules need React's server condition, while unit tests that
// import client components need the ordinary React exports. Components are
// not rendered in Node tests; this hook lets both module types load together.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const entry = entries.get(specifier);
    return entry ? { url: pathToFileURL(entry).href, shortCircuit: true } : nextResolve(specifier, context);
  },
});
