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
        Size: any;
        SymbolPath: { CIRCLE: string };
      };
    };
    __gmapsInit?: () => void;
    markerClusterer?: { MarkerClusterer: any };
  }
}
export {};
