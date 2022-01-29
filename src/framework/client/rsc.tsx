import { Suspense, useEffect, useState } from "react";
import type { Location } from "history";
import {
  createFromReadableStream,
  createFromFetch,
  FlightResponse,
} from "react-server-dom-webpack";
import { useRoute, LocationContext } from "../shared/router";
import { useDataResource, Resource } from "../../lib/data";

const textEncoder = new TextEncoder();
const initialResponse = createFromReadableStream(
  new ReadableStream({
    start(controller) {
      const processRow = (row: string) => {
        if (row === "") {
          controller.close();
          return;
        }
        controller.enqueue(textEncoder.encode(row + "\n"));
      };
      ((window as any).__flight ??= []).forEach(processRow);
      (window as any).__flight.push = processRow;
    },
  })
);

function useFlightResponse(location: Location) {
  const [isMount, setIsMount] = useState(false);
  useEffect(() => {
    setIsMount(true);
  }, []);

  const key = location.pathname;

  const responseResource = useDataResource(`/__flight__${key}`, async () => {
    if (isMount) {
      return createFromFetch(fetch(location.pathname + ".flight"));
    } else {
      return initialResponse;
    }
  });

  return responseResource;
}

const FlightComponent = ({
  response,
}: {
  response: Resource<FlightResponse>;
}): JSX.Element => response.read().readRoot();

if (import.meta.hot) {
  import.meta.hot.accept("/src/entry-server.tsx", () => {
    console.log("reloading server");
  });
}

export const FlightApp = (): JSX.Element => {
  const { location, isPending } = useRoute();
  const response = useFlightResponse(location);
  return (
    <LocationContext.Provider value={{ location, isPending }}>
      <Suspense fallback={null}>
        <FlightComponent response={response} />
      </Suspense>
    </LocationContext.Provider>
  );
};
