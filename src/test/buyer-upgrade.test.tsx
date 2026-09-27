import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {beforeEach,afterEach,expect,test,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import {Ctx} from '@/community/ctx';
import {PropertyImage,ComparePick,RentPreference,QuickHome} from '@/community/BuyerTools';
import {Filters,CostPanel} from '@/community/extras';
import {RentLine} from '@/community/v6';
import {backToCatalog,safeFacts,tenure} from '@/community/buyer-state';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),notice:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mocks.rpc}}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:null})}));
const house=(slug='one')=>({id:slug,slug,title:'Test house',price_eur:35000,country:'Italy',sqm:null,bedrooms:null,image_urls:['/photo-1.webp','/photo-2.webp','/photo-3.webp']}) as any;
const wrapper=({children}:any)=><MemoryRouter><Ctx.Provider value={{setNotice:mocks.notice}}>{children}</Ctx.Provider></MemoryRouter>;
beforeEach(()=>{localStorage.clear();sessionStorage.clear();mocks.notice.mockReset();mocks.rpc.mockReset();mocks.rpc.mockResolvedValue({data:{rows:[],total:24}});});afterEach(cleanup);
test('failed responsive thumbnail retries the actual original, then a fallback, then an accessible placeholder',()=>{
 const {container}=render(<PropertyImage src="/finds/acquappesa-bedroom.webp" fallback="/fallback.webp" alt="Bedroom"/>);
 let img=screen.getByAltText('Bedroom') as HTMLImageElement;
 expect(container.querySelector('source')).toHaveAttribute('srcset','/finds/acquappesa-bedroom-s.webp');
 Object.defineProperty(img,'currentSrc',{configurable:true,value:'https://realhunt.co/finds/acquappesa-bedroom-s.webp'});fireEvent.error(img);
 expect(container.querySelector('source')).toBeNull();expect(img).toHaveAttribute('src','/finds/acquappesa-bedroom.webp');
 Object.defineProperty(img,'currentSrc',{configurable:true,value:'https://realhunt.co/finds/acquappesa-bedroom.webp'});fireEvent.error(img);
 expect(img).toHaveAttribute('src','/fallback.webp');fireEvent.error(img);
 expect(screen.getByRole('img',{name:'Bedroom'})).toHaveTextContent('Photo unavailable');
});
test('unknown images never receive invented thumbnail URLs',()=>{const {container}=render(<PropertyImage src="/imported-photo.webp" alt="Home"/>);expect(container.querySelector('source')).toBeNull();expect(screen.getByAltText('Home')).toHaveAttribute('src','/imported-photo.webp');});
test('comparison is shared across cards, limited to three, and can be deselected',()=>{
 render(<>{['a','b','c','d'].map(slug=><ComparePick key={slug} deal={house(slug)}/>)}</>,{wrapper});
 for(let i=0;i<3;i++)fireEvent.click(screen.getAllByRole('button',{name:'Compare'})[0]);
 fireEvent.click(screen.getByRole('button',{name:'Compare'}));expect(mocks.notice).toHaveBeenCalledWith('Choose up to three homes. Remove one first.');
 expect(JSON.parse(localStorage.getItem('rh.compare.homes')!)).toEqual(['a','b','c']);
 fireEvent.click(screen.getAllByRole('button',{name:'Selected'})[0]);expect(JSON.parse(localStorage.getItem('rh.compare.homes')!)).toEqual(['b','c']);
});
test('draft filters request an exact count and do not mutate the catalogue before applying',async()=>{
 const change=vi.fn();render(<Filters countries={{Italy:25}} value={{scope:'all'}} onChange={change}/>);
 fireEvent.change(screen.getByLabelText('Max price'),{target:{value:'30000'}});
 expect(change).not.toHaveBeenCalled();fireEvent.click(await screen.findByRole('button',{name:'View 24 homes'}));
 expect(change).toHaveBeenCalledWith({scope:'all',max_price:30000});expect(mocks.rpc).toHaveBeenCalledWith('community_feed',{p:expect.objectContaining({max_price:30000,limit:1})});
});
test('return location refuses external redirects and preserves the entire filter query',()=>{
 sessionStorage.setItem('rh.catalog.return',JSON.stringify('/?country=Italy&price=30000&tab=all'));expect(backToCatalog()).toBe('/?country=Italy&price=30000&tab=all');
 sessionStorage.setItem('rh.catalog.return',JSON.stringify('//evil.test'));expect(backToCatalog()).toBe('/');
});
test('rent comparisons stay hidden until chosen and use the same user amount in cards and costs',()=>{
 localStorage.setItem('rh_rent','900');
 render(<><RentPreference/><RentLine price={35000}/><CostPanel deal={house()}/></>);
 expect(screen.queryByText(/≈ .*months of your rent/)).toBeNull();fireEvent.change(screen.getByLabelText(/Your monthly rent/),{target:{value:'1000'}});
 expect(screen.getByText('≈ 35 months of your rent')).toBeInTheDocument();expect(localStorage.getItem('rh_rent')).toBe('1000');
});
test('negated, nearby and future amenities do not become confirmed features',()=>{
 expect(safeFacts({title:'No pool',why_great:'Nearby sauna. Could add parking. Private terrace.'})).toBe(' Private terrace. ');
 expect(tenure({why_great:'80-year leasehold'})).toMatch(/Leasehold/);expect(tenure({title:'Lovely house'})).toBe('Ownership type not confirmed');
});
test('quick view restores the viewed photo and clamps an obsolete index',async()=>{
 sessionStorage.setItem('rh.photo.one','2');const r=render(<QuickHome rows={[house()]} index={0} onIndex={()=>{}} onClose={()=>{}}/>,{wrapper});
 await waitFor(()=>expect(screen.getByAltText('Test house')).toHaveAttribute('src','/photo-3.webp'));
 fireEvent.click(screen.getByRole('button',{name:'Next photo'}));expect(sessionStorage.getItem('rh.photo.one')).toBe('0');r.unmount();
 sessionStorage.setItem('rh.photo.one','90');render(<QuickHome rows={[house()]} index={0} onIndex={()=>{}} onClose={()=>{}}/>,{wrapper});
 await waitFor(()=>expect(screen.getByAltText('Test house')).toHaveAttribute('src','/photo-3.webp'));
});
