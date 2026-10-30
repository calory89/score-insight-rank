import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const mocks=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock("@/lib/rh",()=>({db:{rpc:mocks.rpc},eur:(n:number)=>`€${n}`}));
vi.mock("sonner",()=>({toast:{success:vi.fn(),error:vi.fn()}}));
import { NetworkPreferences, IntroductionTerms, SourceContactRequests, NetworkTasks, sourcePaymentLabel } from "@/components/realhunt/NetworkTools";
import { AdminNetworkDay } from "@/components/realhunt/AdminNetworkTools";
afterEach(()=>{cleanup();vi.clearAllMocks();});
describe("independent network workflows",()=>{
 it("toggles receiving without submitting sharing choices",async()=>{
  mocks.rpc.mockResolvedValue({data:{ok:true},error:null});const reload=vi.fn().mockResolvedValue(undefined);
  render(<MemoryRouter><NetworkPreferences overview={{developer:{receiving_enabled:false},leads:8,shared:2}} onChange={reload}/></MemoryRouter>);
  fireEvent.click(screen.getByRole("switch"));
  await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith("dev_network_preferences",{p_receive:true}));
  expect(screen.getByText(/8 registered · 6 private/)).toBeInTheDocument();
  await waitFor(()=>expect(reload).toHaveBeenCalledTimes(1));
 });
 it("does not claim a receiving preference was saved on error",async()=>{
  mocks.rpc.mockResolvedValue({data:null,error:{message:"offline"}});const reload=vi.fn();
  render(<MemoryRouter><NetworkPreferences overview={{developer:{receiving_enabled:false},leads:0,shared:0}} onChange={reload}/></MemoryRouter>);
  fireEvent.click(screen.getByRole("switch"));await waitFor(()=>expect(screen.getByRole("switch")).not.toBeDisabled());expect(reload).not.toHaveBeenCalled();expect(screen.getByRole("switch")).toHaveAttribute("aria-checked","false");
 });
 it("shows fixed commission and prior-contact evidence before acceptance",()=>{
  render(<IntroductionTerms buyer={{from:"Network developer",was_mine:true,commission_pct:7,prior_contact_at:"2026-09-01T12:00:00Z"}}/>);
  expect(screen.getByText("0% · prior contact")).toBeInTheDocument();expect(screen.queryByText("7%")).not.toBeInTheDocument();
 });
 it("keeps seller collection separate from the source payout",()=>{
  expect(sourcePaymentLabel("ready_for_payout")).toBe("Collected · payout pending");
  expect(sourcePaymentLabel("paid_to_you")).toBe("Paid to you");
  expect(sourcePaymentLabel("reported",true)).toBe("Exempt · no commission");
 });
 it("requests permission and a contact before enabling a handoff",async()=>{
  mocks.rpc.mockResolvedValue({data:{ok:true},error:null});const reload=vi.fn().mockResolvedValue(undefined);
  render(<SourceContactRequests given={[{id:"intro-a",buyer:"12345678",to:"Project B",status:"accepted",contact_ready:false}]} onChange={reload}/>);
  fireEvent.click(screen.getByRole("button",{name:"Provide authorized contact"}));
  const send=screen.getByRole("button",{name:"Share this contact"});expect(send).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Email"),{target:{value:"buyer@example.test"}});expect(send).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));expect(send).not.toBeDisabled();fireEvent.click(send);
  await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith("dev_authorize_intro_contact",expect.objectContaining({p_intro:"intro-a",p_email:"buyer@example.test",p_authorized:true})));
 });
 it("does not offer a contact handoff before acceptance",()=>{
  render(<SourceContactRequests given={[{id:"intro-a",buyer:"12345678",to:"Project B",status:"proposed",contact_ready:false}]} onChange={vi.fn()}/>);
  expect(screen.queryByRole("button",{name:"Provide authorized contact"})).not.toBeInTheDocument();
 });
 it("loads private tasks and creates a dated task",async()=>{
  mocks.rpc.mockImplementation((name:string)=>Promise.resolve({data:name==="dev_tasks"?[]:{id:"task-a"},error:null}));
  render(<MemoryRouter><NetworkTasks buyers={[]} onOpen={vi.fn()}/></MemoryRouter>);
  await screen.findByText("No tasks yet.");fireEvent.change(screen.getByLabelText("Task"),{target:{value:"Prepare visit"}});fireEvent.change(screen.getByLabelText("Due date"),{target:{value:"2026-10-01"}});fireEvent.click(screen.getByRole("button",{name:"Add task"}));
  await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith("dev_save_task",{p_id:null,p_intro:null,p_title:"Prepare visit",p_due:"2026-10-01",p_done:false}));
 });
 it("routes collected commission to the payout queue, not unpaid sales",()=>{
  const route=vi.fn();render(<AdminNetworkDay data={{developers:[],introductions:[],deals:[{status:"paid",source_paid_at:null,source_share_eur:900}]}} onQueue={route}/>);
  fireEvent.click(screen.getByRole("button",{name:/Collected · referral payout due/}));expect(route).toHaveBeenCalledWith("deals","payout");
 });
});
