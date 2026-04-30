import { RemixBrowser } from "@remix-run/react";
import { startTransition } from "react";
import { createRoot } from "react-dom/client";

startTransition(() => {
  createRoot(document.getElementById("root")).render(<RemixBrowser />);
});
