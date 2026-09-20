import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import Community from "@/community/Community";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), user: null as any }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mocks.user }),
}));
vi.mock("@/components/realhunt/AuthModal", () => ({
  default: ({ open, redirect }: any) =>
    open ? <div role="dialog" data-return-to={redirect}>Join the hunt</div> : null,
}));
const deal = {
  id: "deal-1",
  slug: "stone-home",
  title: "Stone home by the sea",
  price_eur: 39000,
  country: "Italy",
  category: "beach",
  source_url: "https://example.org/house",
  image_urls: ["https://example.org/photo.jpg"],
  hunter_handle: "realhunt",
  rank: 1,
  week_up: 2,
  week_down: 0,
  week_net: 2,
  life_up: 2,
  life_down: 0,
  life_net: 2,
  saves: 0,
  views: 0,
  comments: 0,
  votes_24h: 2,
};
let failVote = false;
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  mocks.user = null;
  failVote = false;
  mocks.rpc.mockReset();
  mocks.rpc.mockImplementation(async (name: string, p: any) => {
    if (name === "community_rankings")
      return {
        data: {
          rows: [deal],
          picks: [],
          total: 1,
          global_deals: 1,
          global_votes: 2,
          weekly_votes: 2,
          countries: ["Italy"],
          week: { label: "Sep 21–28, 2026" },
        },
      };
    if (p.p_action === "session")
      return {
        data: { token: "issued-token", admin: false, votes: {}, saved: [] },
      };
    if (p.p_action === "vote")
      return failVote
        ? {
            data: {
              error: "Voting is temporarily limited. Please try again later.",
            },
          }
        : { data: { ok: true } };
    if (p.p_action === "detail") return {data: {deal, comments: []}};
    if (p.p_action === "import") return { data: { data: null, manual: true } };
    return { data: { ok: true } };
  });
});
afterEach(cleanup);
const open = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Community />
    </MemoryRouter>,
  );
test("voting without registration acknowledges success and exposes sharing", async () => {
  open();
  const up = await screen.findByRole("button", { name: "Upvote deal" });
  await waitFor(() => expect(up).not.toBeDisabled());
  fireEvent.click(up);
  await screen.findByText(/Vote counted ✓ Share this find/);
  expect(up).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
test("failed vote rolls back optimistic state and does not claim success", async () => {
  failVote = true;
  open();
  const up = await screen.findByRole("button", { name: "Upvote deal" });
  await waitFor(() => expect(up).not.toBeDisabled());
  fireEvent.click(up);
  await screen.findByText(/Voting is temporarily limited/);
  expect(up).toHaveAttribute("aria-pressed", "false");
  expect(screen.queryByText(/Vote counted/)).not.toBeInTheDocument();
  expect(up).toHaveTextContent("2");
});
test("saving requires sign-in and never writes for an anonymous visitor", async () => {
  open();
  fireEvent.click(await screen.findByRole("button", { name: "Save deal" }));
  await screen.findByRole("dialog");
  expect(mocks.rpc.mock.calls.some(([, p]) => p.p_action === "save")).toBe(
    false,
  );
});
test("country and lifetime views send real filter parameters and omit Today", async () => {
  open();
  await screen.findByRole("button", { name: "Upvote deal" });
  fireEvent.click(screen.getByRole("button", { name: "Countries" }));
  fireEvent.change(screen.getByLabelText("Country"), {
    target: { value: "Italy" },
  });
  await waitFor(() =>
    expect(mocks.rpc).toHaveBeenCalledWith(
      "community_rankings",
      expect.objectContaining({ p_country: "Italy" }),
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "All Time" }));
  await screen.findByRole("heading", { name: "All-time favourites ↗" });
  expect(
    screen.queryByRole("button", { name: "Today" }),
  ).not.toBeInTheDocument();
});
test("unsupported import falls back to manual details and keeps the draft through sign-in", async () => {
  open("/submit");
  fireEvent.change(screen.getByLabelText("Original property listing"), {
    target: { value: "https://example.org/new-house" },
  });
  const next = screen.getByRole("button", { name: "Continue →" });
  await waitFor(() => expect(next).not.toBeDisabled());
  fireEvent.click(next);
  await screen.findByLabelText("Give it a short, useful title");
  fireEvent.change(screen.getByLabelText("Give it a short, useful title"), {
    target: { value: "A village home" },
  });
  fireEvent.change(screen.getByLabelText("Price in EUR"), {
    target: { value: "35000" },
  });
  fireEvent.change(screen.getByLabelText("Country"), {
    target: { value: "Italy" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Submit for review" }).closest("form")!,
  );
  await screen.findByRole("dialog");
  expect(JSON.parse(sessionStorage.getItem("rh_hunt_submission")!).title).toBe(
    "A village home",
  );
  expect(mocks.rpc.mock.calls.some(([, p]) => p.p_action === "submit")).toBe(
    false,
  );
});

test("Sumba is the third card, labelled sponsored and outside voting", async () => {
  const previous = mocks.rpc.getMockImplementation()!;
  mocks.rpc.mockImplementation(async (name: string, p: any) => {
    const response = await previous(name, p);
    if (name === "community_rankings") response.data.rows = [deal, {...deal, id: "deal-2", slug: "second-home", rank: 2}, {...deal, id: "deal-3", slug: "third-home", rank: 3}];
    return response;
  });
  open();
  const ad = await screen.findByRole("article", {name: "Sponsored: Eco Beach City, Sumba"});
  expect(screen.getAllByRole("article")[2]).toBe(ad);
  expect(ad.textContent).toContain("Sponsored");
  expect(ad.querySelector("button")).toBeNull();
  expect(ad.querySelector("a")?.getAttribute("href")).toBe("/ecobeachcity");
  expect(screen.getAllByRole("button", {name: "Upvote deal"})).toHaveLength(3);
});

for (const path of ['/', '/deal/stone-home']) {
  test(`original listings require an account on ${path}`, async () => {
    open(path);
    const source = await screen.findByRole('button', {name:'Original listing'});
    expect(screen.queryByRole('link',{name:'Original listing'})).toBeNull();
    fireEvent.click(source);
    expect(await screen.findByRole('dialog')).toHaveAttribute('data-return-to','/deal/stone-home');
  });
  test(`signed-in visitors can open the original listing on ${path}`, async () => {
    mocks.user = {id:'signed-in'};
    open(path);
    expect(await screen.findByRole('link',{name:'Original listing'})).toHaveAttribute('href',deal.source_url);
  });
}
test('the full catalog stays available beyond the first page', async () => {
  const previous=mocks.rpc.getMockImplementation()!;
  mocks.rpc.mockImplementation(async (name:string,p:any)=>{
    const response=await previous(name,p);
    if(name==='community_rankings') response.data={...response.data,total:349,global_deals:349,rows:[{...deal,id:'deal-'+p.p_offset,slug:'home-'+p.p_offset,rank:p.p_offset+1}]};
    return response;
  });
  open();
  expect(await screen.findByText('Showing 1 of 349 deals')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'More discoveries'}));
  expect(await screen.findByText('Showing 2 of 349 deals · plus 1 sponsored listing')).toBeInTheDocument();
  expect(screen.getAllByRole('button',{name:'Original listing'})).toHaveLength(2);
});
