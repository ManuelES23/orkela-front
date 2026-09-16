import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import AccessTile from "./AccessTile";

const motionProps = [];
let reduceMotion = false;

vi.mock("framer-motion", async (importOriginal) => ({
  ...(await importOriginal()),
  useReducedMotion: () => reduceMotion,
  motion: {
    div: ({ children, layout, variants }) => {
      motionProps.push({ layout, variants });
      return <div>{children}</div>;
    },
  },
}));

describe("AccessTile", () => {
  beforeEach(() => {
    motionProps.length = 0;
  });

  it("anima el layout y la entrada con desplazamiento", () => {
    reduceMotion = false;
    render(<AccessTile title='Google' subtitle='x' statusLabel='Activa' />);

    expect(motionProps.at(-1).layout).toBe(true);
    expect(motionProps.at(-1).variants.hidden.y).toBe(20);
  });

  it("con movimiento reducido no anima el layout ni desplaza la entrada", () => {
    reduceMotion = true;
    render(<AccessTile title='Google' subtitle='x' statusLabel='Activa' />);

    const { layout, variants } = motionProps.at(-1);
    expect(layout).toBe(false);
    expect(variants.hidden).not.toHaveProperty("y");
    expect(variants.visible).not.toHaveProperty("y");
  });
});
