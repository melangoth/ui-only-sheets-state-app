export type GeolocationState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'located'; lat: number; lng: number }
  | { status: 'error'; message: string };
