/* eslint-disable @typescript-eslint/no-explicit-any */
// Minimal declarations for three add-ons used in this project.
// Prefer installing @types/three for full types. This file provides quick fixes
// for editor/ts-server when using 'three/addons/...'.

declare module 'three/addons/webxr/VRButton.js' {
  export const VRButton: {
    createButton: (renderer: any) => HTMLElement;
  };
}

declare module 'three/addons/webxr/XRControllerModelFactory.js' {
  export class XRControllerModelFactory {
    constructor();
    createControllerModel(controller: any): any;
  }
}

declare module 'three/addons/loaders/GLTFLoader.js' {
  export class GLTFLoader {
    constructor(manager?: any);
    load(url: string, onLoad: (gltf: any) => void, onProgress?: (ev: any) => void, onError?: (err: any) => void): void;
    // some versions expose a promise-based API
    loadAsync?(url: string): Promise<any>;
  }
  export interface GLTF {
    scene: any;
    scenes?: any[];
    animations?: any[];
    cameras?: any[];
    asset?: any;
  }
}

// fallback for any other three/addons imports
declare module 'three/addons/*' {
  const whatever: any;
  export default whatever;
}
