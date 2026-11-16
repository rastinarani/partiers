// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ErrorPage from "@/app/error";
import GlobalError from "@/app/global-error";
import EmptyState from "./EmptyState";
afterEach(cleanup);
it("keeps internal error details private and provides retry", () => {
  const retry = vi.fn();
  render(<ErrorPage error={new Error("PRIVATE_TEST_DETAIL")} retry={retry} />);
  expect(screen.queryByText("PRIVATE_TEST_DETAIL")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(retry).toHaveBeenCalledTimes(1);
});
it("provides a complete global error document without depending on the root layout", () => {
  const html = renderToStaticMarkup(
    <GlobalError error={new Error("PRIVATE_TEST_DETAIL")} retry={() => {}} />,
  );
  expect(html).toContain('<html lang="en">');
  expect(html).toContain("<body");
  expect(html).toContain("Back to home");
  expect(html).not.toContain("PRIVATE_TEST_DETAIL");
});
it("provides an explanatory empty state and a useful action", () => {
  render(
    <EmptyState
      title="No events"
      description="Nothing is scheduled for this date."
      href="/"
      action="Book now"
    />,
  );
  expect(screen.getByRole("heading", { name: "No events" })).toBeDefined();
  expect(
    screen.getByRole("link", { name: "Book now" }).getAttribute("href"),
  ).toBe("/");
});
