import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import AuthModal from "@/components/realhunt/AuthModal";
import Callback from "@/pages/auth/Callback";
import { safeReturnPath } from "@/lib/auth-return";
const auth = vi.hoisted(() => ({ signInWithPassword: vi.fn(), signInWithOtp: vi.fn(), getSession: vi.fn(), updateUser: vi.fn(), onAuthStateChange: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
vi.mock("@/lib/rh", () => ({ track: vi.fn() }));
const destination = "/submit?quick=1&url=https%3A%2F%2Fexample.org%2Fhome";
function Location() { const l=useLocation(); return <output aria-label="Current route">{l.pathname+l.search}</output>; }
const showModal = (mode: "in"|"up" = "in", close=vi.fn()) => render(<MemoryRouter><AuthModal open onClose={close} initialMode={mode} redirect={destination} /><Location /></MemoryRouter>);
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); window.history.replaceState({},"","/");
  auth.signInWithPassword.mockResolvedValue({data:{session:{user:{id:"test-user"}}},error:null});
  auth.signInWithOtp.mockResolvedValue({data:{},error:null});
  auth.getSession.mockResolvedValue({data:{session:null},error:null});
  auth.updateUser.mockResolvedValue({data:{user:{}},error:null});
  auth.onAuthStateChange.mockReturnValue({data:{subscription:{unsubscribe:vi.fn()}}});
});
afterEach(cleanup);
test("password sign-in preserves the submitted property and normalizes email", async () => {
  const close=vi.fn(); showModal("in",close);
  fireEvent.change(screen.getByRole("textbox",{name:"Email address"}),{target:{value:"OWNER@example.test"}});
  fireEvent.change(screen.getByLabelText("Password"),{target:{value:"test-only-password"}});
  fireEvent.click(screen.getByRole("button",{name:"Sign in"}));
  await waitFor(()=>expect(close).toHaveBeenCalled());
  expect(auth.signInWithPassword).toHaveBeenCalledWith({email:"owner@example.test",password:"test-only-password"});
  expect(screen.getByLabelText("Current route")).toHaveTextContent(destination);
});
test("wrong passwords do not close the dialog or claim login success", async () => {
  auth.signInWithPassword.mockResolvedValue({error:{message:"Invalid login credentials"}});
  const close=vi.fn(); showModal("in",close);
  fireEvent.change(screen.getByRole("textbox",{name:"Email address"}),{target:{value:"owner@example.test"}});
  fireEvent.change(screen.getByLabelText("Password"),{target:{value:"incorrect"}});
  fireEvent.click(screen.getByRole("button",{name:"Sign in"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("does not match");
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByRole("button",{name:"Sign in"})).not.toBeDisabled();
});
test("email signup carries the property in its confirmation URL and prevents immediate resend", async () => {
  showModal("up");
  fireEvent.change(screen.getByRole("textbox",{name:"Email address"}),{target:{value:"owner@example.test"}});
  fireEvent.click(screen.getByRole("button",{name:"Send confirmation link"}));
  expect(await screen.findByRole("status")).toHaveTextContent("Check owner@example.test");
  expect(auth.signInWithOtp).toHaveBeenCalledWith(expect.objectContaining({options:expect.objectContaining({shouldCreateUser:true,emailRedirectTo:expect.stringContaining(encodeURIComponent(destination))})}));
  expect(screen.getByRole("button",{name:/Resend in/})).toBeDisabled();
});
test("email provider failure is surfaced instead of a false sent confirmation", async () => {
  auth.signInWithOtp.mockResolvedValue({error:{status:500,message:"Email provider failed"}});
  showModal("up");
  fireEvent.change(screen.getByRole("textbox",{name:"Email address"}),{target:{value:"owner@example.test"}});
  fireEvent.click(screen.getByRole("button",{name:"Send confirmation link"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("could not complete");
  expect(screen.queryByRole("status")).toBeNull();
});
test("confirmed accounts return to the property submission", async () => {
  window.history.replaceState({},"","/auth/callback?next="+encodeURIComponent(destination));
  auth.getSession.mockResolvedValue({data:{session:{user:{user_metadata:{has_password:true}}}}});
  render(<MemoryRouter><Callback /><Location /></MemoryRouter>);
  await waitFor(()=>expect(screen.getByLabelText("Current route")).toHaveTextContent(destination));
});
test("new accounts choose a password before returning to their saved destination", async () => {
  window.history.replaceState({},"","/auth/callback?next="+encodeURIComponent(destination));
  auth.getSession.mockResolvedValue({data:{session:{user:{user_metadata:{}}}}});
  render(<MemoryRouter><Callback /><Location /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText("New password"),{target:{value:"test-password-123"}});
  fireEvent.change(screen.getByLabelText("Confirm new password"),{target:{value:"test-password-123"}});
  fireEvent.click(screen.getByRole("button",{name:"Save and continue"}));
  await waitFor(()=>expect(screen.getByLabelText("Current route")).toHaveTextContent(destination));
  expect(auth.updateUser).toHaveBeenCalledWith({password:"test-password-123",data:{has_password:true}});
});
test("expired links offer recovery and unsafe return destinations are rejected", async () => {
  window.history.replaceState({},"","/auth/callback?error=expired&next="+encodeURIComponent(destination));
  render(<MemoryRouter><Callback /></MemoryRouter>);
  expect(await screen.findByText("This link could not sign you in.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Request a new link"}));
  expect(await screen.findByRole("dialog")).toBeInTheDocument();
  for(const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "/auth/callback"]) expect(safeReturnPath(bad)).toBe("/");
});
