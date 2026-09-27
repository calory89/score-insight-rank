import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import Community from "@/community/Community";
import {rowCache} from "@/community/v4";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), user: null as any }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc, from: () => {const q:any={then:(ok:any)=>Promise.resolve({data:[],count:0}).then(ok)};for(const m of ['select','eq','in','order','limit','update'])q[m]=()=>q;return q;} },
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
  rowCache.clear();
  localStorage.clear();
  sessionStorage.clear();
  mocks.user = null;
  failVote = false;
  mocks.rpc.mockReset();
  mocks.rpc.mockImplementation(async (name: string, p: any) => {
    if ((name === "community_rankings" || name === "community_feed"))
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
    if (p?.p_action === "session")
      return {
        data: { token: "issued-token", admin: false, votes: {}, saved: [] },
      };
    if (p?.p_action === "vote")
      return failVote
        ? {
            data: {
              error: "Voting is temporarily limited. Please try again later.",
            },
          }
        : { data: { ok: true } };
    if (p?.p_action === "detail") return {data: {deal, comments: []}};
    if (p?.p_action === "import") return { data: { data: null, manual: true } };
    return { data: { ok: true } };
  });
});
afterEach(cleanup);
const open = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/deal/:slug" element={<Community/>}/><Route path="*" element={<Community/>}/></Routes>
    </MemoryRouter>,
  );
test("voting without registration acknowledges success and exposes sharing", async () => {
  open();
  const up = await screen.findByRole("button", { name: "Vote for this home" });
  await waitFor(() => expect(up).not.toBeDisabled());
  fireEvent.click(up);
  await screen.findByText(/You and 2 others love this/);
  expect(await screen.findByRole("button",{name:"You voted for this home"})).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
test("failed vote rolls back optimistic state and does not claim success", async () => {
  failVote = true;
  open();
  const up = await screen.findByRole("button", { name: "Vote for this home" });
  await waitFor(() => expect(up).not.toBeDisabled());
  fireEvent.click(up);
  await screen.findByText(/Voting is temporarily limited/);
  expect(up).toHaveAttribute("aria-pressed", "false");
  expect(screen.queryByText(/Vote counted/)).not.toBeInTheDocument();
  expect(up).toHaveTextContent("2");
});
test("saving requires sign-in and never writes for an anonymous visitor", async () => {
  open();
  fireEvent.click(await screen.findByRole("button", { name: "Save this home" }));
  await screen.findByRole("dialog");
  expect(mocks.rpc.mock.calls.some(([, p]) => p?.p_action === "save")).toBe(
    false,
  );
});
test('week and all time preserve country filters and request their own counts', async()=>{
 open('/?country=Italy');await screen.findByRole('button',{name:'Vote for this home'});
 expect(mocks.rpc).toHaveBeenCalledWith('community_feed',expect.objectContaining({p:expect.objectContaining({country:'Italy',scope:'week'})}));
 fireEvent.click(screen.getByRole('button',{name:'All Time'}));
 await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('community_feed',expect.objectContaining({p:expect.objectContaining({country:'Italy',scope:'all'})})));
});
test("unsupported import falls back to manual details and keeps the draft through sign-in", async () => {
  open("/submit?details=1");
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
  expect(mocks.rpc.mock.calls.some(([, p]) => p?.p_action === "submit")).toBe(
    false,
  );
});

test("Sumba is labelled sponsored and outside voting", async () => {
  const previous = mocks.rpc.getMockImplementation()!;
  mocks.rpc.mockImplementation(async (name: string, p: any) => {
    const response = await previous(name, p);
    if ((name === "community_rankings" || name === "community_feed")) response.data.rows = Array.from({length:10},(_,i)=>({...deal,id:"deal-"+i,slug:"home-"+i,rank:i+1}));
    return response;
  });
  open();
  const ad = await screen.findByRole("article", {name: "Sponsored: Eco Beach City, Sumba"});
  expect(screen.getAllByRole("article")[9]).toBe(ad);
  expect(ad.textContent).toContain("Sponsored");
  expect(ad.querySelector("button")).toBeNull();
  expect(ad.querySelector("a")?.getAttribute("href")).toBe("/ecobeachcity");
  expect(screen.getAllByRole("button", {name: "Vote for this home"})).toHaveLength(10);
});

for (const path of ['/deal/stone-home']) {
  test(`original listings require an account on ${path}`, async () => {
    open(path);
    const source = (await screen.findAllByRole('button', {name:/View listing/}))[0];
    expect(screen.queryByRole('link',{name:/View listing/})).toBeNull();
    fireEvent.click(source);
    expect(await screen.findByRole('dialog')).toHaveAttribute('data-return-to','/deal/stone-home');
  });
  test(`signed-in visitors can open the original listing on ${path}`, async () => {
    mocks.user = {id:'signed-in'};
    open(path);
    expect((await screen.findAllByRole('link',{name:/View listing/}))[0]).toHaveAttribute('href',deal.source_url);
  });
}
test('the complete catalogue remains accessible beyond its first page',async()=>{
 const previous=mocks.rpc.getMockImplementation()!;
 mocks.rpc.mockImplementation(async(name,p)=>{const r=await previous(name,p);if(name==='community_feed')r.data={...r.data,total:49,rows:[{...deal,id:'deal-'+(p.p.offset||0),slug:'home-'+(p.p.offset||0)}]};return r;});
 open();await screen.findByRole('button',{name:'More discoveries'});
 fireEvent.click(screen.getByRole('button',{name:'More discoveries'}));
 await waitFor(()=>expect(screen.getAllByRole('button',{name:'Vote for this home'})).toHaveLength(2));
});
test('the home removes the old copy and asks for registration before a link submission', async () => {
  open();
  expect(screen.queryByText('THE WORLD IS FULL OF GOOD FINDS')).toBeNull();
  expect(screen.queryByText(/A little place by the sea/)).toBeNull();
  fireEvent.change(screen.getByRole('textbox',{name:'Property listing URL'}),{target:{value:'https://example.org/new-home'}});
  fireEvent.submit(screen.getByRole('button',{name:'Send property'}).closest('form')!);
  expect(await screen.findByRole('dialog')).toHaveAttribute('data-return-to','/submit?quick=1&url=https%3A%2F%2Fexample.org%2Fnew-home');
  expect(mocks.rpc.mock.calls.some(([,p])=>p?.p_action==='quick_submit')).toBe(false);
});
test('a signed-in visitor submits just a link for private review', async () => {
  mocks.user={id:'signed-in'};
  open('/submit?quick=1&url=https%3A%2F%2Fexample.org%2Fnew-home');
  const button=screen.getByRole('button',{name:'Send property'});
  await waitFor(()=>expect(button).not.toBeDisabled());
  expect(screen.getByRole('textbox',{name:'Property listing URL'})).toHaveValue('https://example.org/new-home');
  expect(mocks.rpc.mock.calls.some(([,p])=>p?.p_action==='quick_submit')).toBe(false);
  fireEvent.click(button);
  expect(await screen.findByRole('status')).toHaveTextContent('pending admin review');
  expect(mocks.rpc).toHaveBeenCalledWith('community_api',expect.objectContaining({p_action:'quick_submit',p_payload:expect.objectContaining({url:'https://example.org/new-home'})}));
  expect(screen.getByRole('link',{name:'View my submissions →'})).toHaveAttribute('href','/hunt/mine');
});
test('submission failures preserve the link and never claim it was received', async () => {
  mocks.user={id:'signed-in'};
  const previous=mocks.rpc.getMockImplementation()!;
  mocks.rpc.mockImplementation((name:string,p:any)=>p?.p_action==='quick_submit'?Promise.resolve({data:{error:'You have reached the submission limit'}}):previous(name,p));
  open('/submit?quick=1&url=https%3A%2F%2Fexample.org%2Fnew-home');
  const button=screen.getByRole('button',{name:'Send property'});await waitFor(()=>expect(button).not.toBeDisabled());fireEvent.click(button);
  expect(await screen.findByRole('alert')).toHaveTextContent('submission limit');
  expect(screen.getByRole('textbox',{name:'Property listing URL'})).toHaveValue('https://example.org/new-home');
  expect(screen.queryByText(/Received. Your property/)).toBeNull();
});
test('my submissions shows statuses, review feedback and real property data', async () => {
  mocks.user={id:'signed-in'};const previous=mocks.rpc.getMockImplementation()!;
  mocks.rpc.mockImplementation((name:string,p:any)=>p?.p_action==='dashboard'?Promise.resolve({data:{saved:[],deals:[{...deal,status:'approved',created_at:'2026-09-20T12:00:00Z',approved_at:'2026-09-20T13:00:00Z',week_score:4,lifetime_votes:6,views:20},{...deal,id:'pending',title:'New submitted home',status:'pending',created_at:'2026-09-20T14:00:00Z'},{...deal,id:'rejected',title:'Unavailable home',status:'rejected',reject_reason:'No longer available',created_at:'2026-09-20T14:00:00Z'}]}}):previous(name,p));
  open('/hunt/mine');
  expect(await screen.findByText('New submitted home')).toBeInTheDocument();
  expect(screen.getByText('Review note: No longer available')).toBeInTheDocument();
  expect(screen.getByText('4 weekly score · 6 lifetime votes · 20 views')).toBeInTheDocument();
  expect(screen.getByLabelText('Submission totals')).toHaveTextContent('3 submitted');
});

test('initial points preserve live voting even on old demo links', async () => {
  const previous=mocks.rpc.getMockImplementation()!;
  mocks.rpc.mockImplementation(async(name:string,p:any)=>{
    const response=await previous(name,p);
    if(name==='community_rankings'||name==='community_feed') response.data={...response.data,weekly_points:372,rows:[{...deal,launch_points:370,launch_week_points:370,week_net:372,life_net:372}]};
    return response;
  });
  open('/?demo=1');
  const up=await screen.findByRole('button',{name:'Vote for this home'});
  await waitFor(()=>expect(up).not.toBeDisabled());
  expect(up).toHaveTextContent('372');
  expect(up).toHaveAttribute('title','370 initial points + 2 real votes');
  expect(screen.queryByRole('link',{name:'Weekly winners'})).toBeNull();
  fireEvent.click(up);
  await screen.findByText(/You and 2 others love this/);
  expect(mocks.rpc.mock.calls.some(([,p])=>p?.p_action==='vote' && p.p_payload.value===1)).toBe(true);
  expect(screen.queryByText(/Real voting is disabled/)).toBeNull();
});

test('submission workspace shows photos, source links, status filters and image fallback', async()=>{
  mocks.user={id:'signed-in'};
  const previous=mocks.rpc.getMockImplementation()!;
  mocks.rpc.mockImplementation((name:string,p:any)=>p?.p_action==='dashboard'?Promise.resolve({data:{saved:[],deals:[{...deal,status:'approved',created_at:'2026-09-20'},{...deal,id:'pending',title:'Farm awaiting review',status:'pending',image_urls:[],created_at:'2026-09-20'}]}}):previous(name,p));
  open('/hunt/mine');
  const title=await screen.findByRole('heading',{name:'Stone home by the sea'});
  const card=title.closest('article')!;
  expect(within(card).getByRole('img')).toHaveAttribute('src',deal.image_urls[0]);
  expect(within(card).getByRole('link',{name:'example.org'})).toHaveAttribute('href',deal.source_url);
  fireEvent.error(within(card).getByRole('img'));
  expect(within(card).getByText('Photo pending')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Submission status'),{target:{value:'pending'}});
  expect(screen.queryByRole('heading',{name:'Stone home by the sea'})).toBeNull();
  expect(screen.getByRole('heading',{name:'Farm awaiting review'})).toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox',{name:'Search my submissions'}),{target:{value:'no matching property'}});
  expect(screen.getByText('No submissions match your search.')).toBeInTheDocument();
});
test('admin workspace previews source photos and retains explicit approval actions',async()=>{
  mocks.user={id:'admin'};
  const previous=mocks.rpc.getMockImplementation()!;
  mocks.rpc.mockImplementation(async(name:string,p:any)=>{
    if(p?.p_action==='session') return {data:{token:'admin-token',admin:true,votes:{},saved:[]}};
    if(p?.p_action==='queue') return {data:{pending:[{...deal,status:'pending',created_at:'2026-09-20'}],approved:[],reports:[]}};
    return previous(name,p);
  });
  open('/hunt/admin');
  const title=await screen.findByRole('heading',{name:deal.title});
  const card=title.closest('article')!;
  expect(within(card).getByRole('img')).toHaveAttribute('src',deal.image_urls[0]);
  expect(within(card).getByRole('link',{name:'example.org'})).toHaveAttribute('href',deal.source_url);
  expect(card.querySelector('details')).not.toHaveAttribute('open');
  fireEvent.click(within(card).getByRole('button',{name:'Approve'}));
  await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('community_api',expect.objectContaining({p_action:'moderate',p_payload:{id:deal.id,decision:'approve'}})));
  fireEvent.change(screen.getByRole('searchbox',{name:'Search admin submissions'}),{target:{value:'unmatched'}});
  expect(screen.getByText('No pending submissions match your search.')).toBeInTheDocument();
});

test('detail keeps server points including launch allocation instead of recalculating ballots',async()=>{
  const previous=mocks.rpc.getMockImplementation()!;
  mocks.rpc.mockImplementation((name:string,p:any)=>p?.p_action==='detail'?Promise.resolve({data:{deal:{...deal,week_up:1,week_net:371,life_up:5,life_net:375,launch_points:370,launch_week_points:370,sqm:78},comments:[]}}):previous(name,p));
  open('/deal/stone-home');
  expect((await screen.findAllByRole('button',{name:'Vote for this home'}))[0]).toHaveTextContent('371');
  expect(screen.getByText(/\/m²/)).toHaveTextContent('500');
});
test('all-time card links retain the scoring period when opening detail',async()=>{
  open('/?tab=all');
  const title=(await screen.findAllByRole('link',{name:deal.title})).find(el=>el.classList.contains('hv-info'))!;
  expect(title).toHaveAttribute('href','/deal/stone-home?tab=all');
  fireEvent.click(title);
  await screen.findByRole('link',{name:'← Back to your results'});
  expect(screen.getByText(/All-time votes/)).toBeInTheDocument();
});
test('all-time detail displays the cumulative points from the server',async()=>{
  const previous=mocks.rpc.getMockImplementation()!;
  mocks.rpc.mockImplementation((name:string,p:any)=>p?.p_action==='detail'?Promise.resolve({data:{deal:{...deal,week_net:1,life_net:375,life_up:5,launch_points:370,launch_week_points:0},comments:[]}}):previous(name,p));
  open('/deal/stone-home?tab=all');
  expect((await screen.findAllByRole('button',{name:'Vote for this home'}))[0]).toHaveTextContent('375');
});
