export type LoginRequest =
  | { method: "email"; email: string }
  | { method: "google" };

export type LoginMethod = LoginRequest["method"];
