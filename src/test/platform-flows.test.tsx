import React from "react";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
const state = vi.hoisted(() => ({ user: { id: "qa-user", email: "qa@example.test" }, insertFails: false, mutationFails: false, rpc: vi.fn(), insert: vi.fn(), toastError: vi.fn(), overview: null as any }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: state.user, loading: false }) }));
vi.mock("@/components/realhunt/RHNav", () => ({ default: () => null }));
vi.mock("@/components/realhunt/AuthModal", () => ({ default: () => null }));
vi.mock("@/lib/experiments", () => ({ useExperiment: (_: string, choices: any[]) => choices[0] }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: state.toastError } }));
vi.mock("@/lib/rh", () => ({ track: vi.fn(), eur: (n: number) => `€${n}`, db: {
  rpc: state.rpc,
  from: () => ({ insert: state.insert }),
} }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ insert: state.insert }) } }));
import Network from "@/pages/Network";
import NetworkApp from "@/pages/NetworkApp";
beforeEach(() => {
  sessionStorage.clear(); localStorage.clear(); state.insertFails = false; state.mutationFails = false;
  state.toastError.mockClear(); state.insert.mockReset().mockImplementation(async () => ({ error: state.insertFails ? { message: "Connection failed" } : null }));
  state.overview = { developer: { id: "qa-dev", project_name: "QA project", status: "approved", agreement_version: "2026-09-17", email: "qa@example.test", mode: "both" }, signed: true, leads: 2051, shared: 500, received: [{ id: "qa-intro", buyer: "QA buyer", status: "proposed", created_at: "2026-09-20", note: "Interested in Italy" }], given: [], deals: [], by_month: [] };
  state.rpc.mockReset().mockImplementation(async (name, params) => {
    if (name === "dev_overview") return { data: structuredClone(state.overview) };
    if (name === "dev_buyer_history") return { data: [] };
    if (name === "dev_contacts_page") return { data: { total: 2051, rows: [{ id: params.p_offset + 1, fp: "a".repeat(64), kind: "email", shared: false, country: "Italy" }] } };
    if (name === "dev_update_intro") {
      if (state.mutationFails) return { error: { message: "Save failed" } };
      Object.assign(state.overview.received[0], params.p_patch); return { data: { ok: true } };
    }
    return { data: null };
  });
});
afterEach(cleanup);
it("does not invent analysis or buyers and does not acknowledge a failed lead capture", async () => {
  render(<MemoryRouter><Network /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Project URL"), { target: { value: "project.example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit my project, free" }));
  expect(screen.getByText(/No buyer matches have been generated yet/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "qa@example.test" } });
  state.insertFails = true; fireEvent.click(screen.getByRole("button", { name: "Submit for review, €0" }));
  await waitFor(() => expect(state.toastError).toHaveBeenCalled());
  expect(screen.getByLabelText("Email")).toHaveValue("qa@example.test");
  expect(screen.queryByText(/Request saved/)).toBeNull();
  state.insertFails = false; fireEvent.click(screen.getByRole("button", { name: "Submit for review, €0" }));
  expect(await screen.findByText(/Request saved/)).toBeInTheDocument();
});
it("keeps the buyer in its original stage when a save fails, then supports a successful retry", async () => {
  render(<MemoryRouter initialEntries={["/network/app/buyers"]}><Routes><Route path="/network/app/:tab" element={<NetworkApp />} /></Routes></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: /Buyer QA buyer/ }));
  state.mutationFails = true;
  fireEvent.click(screen.getByRole("button", { name: "Accept these terms" }));
  await waitFor(() => expect(state.toastError).toHaveBeenCalledWith("Save failed", expect.anything()));
  expect(screen.getByRole("button", { name: "Accept these terms" })).toBeInTheDocument();
  state.mutationFails = false;
  fireEvent.click(screen.getByRole("button", { name: "Accept these terms" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Accept these terms" })).toBeNull());
  expect(screen.getByRole("button", { name: "Contacted" })).toBeInTheDocument();
});
it("paginates beyond the old 2000-contact limit and sends search to the server", async () => {
  render(<MemoryRouter initialEntries={["/network/app/leads"]}><Routes><Route path="/network/app/:tab" element={<NetworkApp />} /></Routes></MemoryRouter>);
  expect(await screen.findByText("1–50 of 2,051")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() => expect(state.rpc).toHaveBeenCalledWith("dev_contacts_page", expect.objectContaining({ p_offset: 50 })));
  fireEvent.change(screen.getByLabelText("Search all contacts"), { target: { value: "Japan" } });
  await waitFor(() => expect(state.rpc).toHaveBeenCalledWith("dev_contacts_page", expect.objectContaining({ p_query: "Japan", p_offset: 0 })));
});
it("registers a contact contributor without a project or forced agreement redirect", async () => {
  const created=structuredClone(state.overview);state.overview=null;
  state.insert.mockImplementation((payload:any)=>({select:()=>({single:async()=>{state.overview={...created,developer:{...created.developer,...payload,receiving_enabled:false,status:"pending"}};return {data:{id:"qa-dev"},error:null};}})}));
  render(<MemoryRouter initialEntries={["/network/app/overview"]}><Routes><Route path="/network/app/:tab" element={<NetworkApp />} /></Routes></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText("Company or professional name"),{target:{value:"QA contributor"}});
  fireEvent.change(screen.getByLabelText("Your name"),{target:{value:"QA"}});
  expect(screen.getByLabelText("Project name (only required to receive buyers)")).not.toBeRequired();
  fireEvent.click(screen.getByRole("button",{name:"Create my panel"}));
  await waitFor(()=>expect(state.insert).toHaveBeenCalledWith(expect.objectContaining({company:"QA contributor",project_url:"",project_name:""})));
  expect(await screen.findByText("Protect. Share. Receive.")).toBeInTheDocument();
});
