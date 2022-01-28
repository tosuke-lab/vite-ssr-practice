import { Suspense } from "react";
import {
  createFromReadableStream,
  FlightResponse,
} from "react-server-dom-webpack";

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

function useFlightResponse() {
  return initialResponse;
}

const FlightComponent = ({
  response,
}: {
  response: FlightResponse;
}): JSX.Element => response.readRoot();

export const FlightApp = (): JSX.Element => {
  const response = useFlightResponse();
  return (
    <Suspense fallback={null}>
      <FlightComponent response={response} />
    </Suspense>
  );
};
