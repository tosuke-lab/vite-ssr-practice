import { Suspense, useEffect, useState } from "react";
import type { Location } from "history";
import {
  createFromReadableStream,
  createFromFetch,
  FlightResponse,
} from "react-server-dom-webpack";
import { useRoute, LocationContext } from "../shared/router";

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

const responseCache = new Map<string, FlightResponse>();

function useFlightResponse(location: Location) {
  const [isMount, setIsMount] = useState(false);
  useEffect(() => {
    setIsMount(true);
  }, []);

  const key = location.pathname;

  let response = responseCache.get(key);
  if (response == null) {
    if (isMount) {
      response = createFromFetch(fetch(location.pathname + ".flight"));
    } else {
      response = initialResponse;
    }
    responseCache.set(key, response);
  }

  return response;
}

const FlightComponent = ({
  response,
}: {
  response: FlightResponse;
}): JSX.Element => response.readRoot();

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
