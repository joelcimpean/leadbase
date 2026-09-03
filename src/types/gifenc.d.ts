declare module "gifenc" {
    export type GifPalette =
      | number[][]
      | Uint8Array
      | Uint8ClampedArray;
  
    export type QuantizeOptions = {
      format?:
        string;
  
      oneBitAlpha?:
        number;
  
      clearAlpha?:
        boolean;
  
      clearAlphaColor?:
        number;
  
      clearAlphaThreshold?:
        number;
    };
  
    export type GifFrameOptions = {
      palette?:
        GifPalette;
  
      delay?:
        number;
  
      repeat?:
        number;
  
      transparent?:
        boolean;
  
      transparentIndex?:
        number;
  
      dispose?:
        number;
    };
  
    export type GifEncoderInstance = {
      writeFrame(
        index:
          Uint8Array
          | Uint8ClampedArray,
        width:
          number,
        height:
          number,
        options?:
          GifFrameOptions
      ):
        void;
  
      finish():
        void;
  
      bytes():
        Uint8Array;
  
      bytesView?():
        Uint8Array;
    };
  
    export function GIFEncoder():
      GifEncoderInstance;
  
    export function quantize(
      rgba:
        Uint8Array
        | Uint8ClampedArray,
      maxColors:
        number,
      options?:
        QuantizeOptions
    ):
      GifPalette;
  
    export function applyPalette(
      rgba:
        Uint8Array
        | Uint8ClampedArray,
      palette:
        GifPalette,
      format?:
        string
    ):
      Uint8Array;
  }
  