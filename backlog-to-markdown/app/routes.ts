import { type RouteConfig, index, route, prefix } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  ...prefix("api/v1", [
    index("routes/api/index.tsx"),
    route("*", "routes/api/not-found.tsx"),
  ]),
] satisfies RouteConfig;
