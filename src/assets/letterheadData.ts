import geethanjaleeImg from "./geethanjalee.png?inline";
import sandaminiImg from "./sandamini.png?inline";

export type LetterheadType = "geethanjalee" | "sandamini" | "none";

export const GEETHANJALEE_LETTERHEAD = geethanjaleeImg;
export const SANDAMINI_LETTERHEAD = sandaminiImg;

export const LETTERHEAD_CONFIG = {
  geethanjalee: {
    x: 10,
    y: 4,
    width: 128,
    height: 43,
  },
  sandamini: {
    x: 10,
    y: 6,
    width: 128,
    height: 38.2,
  },
} as const;
