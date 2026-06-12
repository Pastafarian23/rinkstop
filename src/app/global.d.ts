declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.jpg' {
  const src: string;
  export default src;
}
declare module '*.svg' {
  const src: string;
  export default src;
}

declare global {
  interface Window {
    google: {
      maps: {
        Map: any;
        Marker: any;
        InfoWindow: any;
        LatLngBounds: any;
        LatLng: any;
        SymbolPath: { CIRCLE: string };
        importLibrary: (name: string) => Promise<any>;
      };
    };
  }
}
export {};
