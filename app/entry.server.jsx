import { RemixServer } from "@remix-run/react";
import { renderToReadableStream } from "react-dom/server";
import { isbot } from "isbot";

export default async function handleRequest(request, responseStatusCode, responseHeaders, remixContext) {
  const userAgent = request.headers.get("user-agent");
  const stream = await renderToReadableStream(
    <RemixServer context={remixContext} url={request.url} />,
    {
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    }
  );

  // Bots: wait for full stream to ensure complete HTML for crawlers
  if (isbot(userAgent)) {
    await stream.allReady;
  }

  responseHeaders.set("Content-Type", "text/html");
  return new Response(stream, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}
