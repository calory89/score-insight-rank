import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

Object.defineProperty(window,"scrollTo",{value:()=>{},writable:true});
Object.defineProperty(HTMLElement.prototype,"scrollIntoView",{value:()=>{},writable:true});
globalThis.IntersectionObserver = class {observe(){} unobserve(){} disconnect(){} takeRecords(){return [];} root=null;rootMargin='';thresholds=[];} as any;
globalThis.ResizeObserver = class {observe(){} unobserve(){} disconnect(){}} as any;
