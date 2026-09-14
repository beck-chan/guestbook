import { flags } from "@/lib/flags";

export function RouteLoading() {
  if (flags.public) {
    return (
      <p className="route-loading is-public" role="status">
        Loading artifacts from the last millennium ...
      </p>
    );
  }

  return (
    <p className="route-loading" role="status">
      <span>{"And now the matchless deed 's achieved,"}</span>
      <span>Determined, dared, and done!</span>
    </p>
  );
}
