"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Terminal } from "lucide-react";

const HEADLINE = "Operations on autopilot. Humans in command.";

export function HeroSection() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const root = rootRef.current;
      if (!root) return;

      const { animate, stagger, createDrawable, createMotionPath } =
        await import("animejs");
      if (cancelled) return;

      const words = root.querySelectorAll<HTMLElement>("[data-word]");
      animate(words, {
        opacity: [0, 1],
        translateY: [28, 0],
        filter: ["blur(8px)", "blur(0px)"],
        duration: 800,
        delay: stagger(55),
        ease: "out(3)",
      });

      const reveals = root.querySelectorAll<HTMLElement>("[data-reveal]");
      animate(reveals, {
        opacity: [0, 1],
        translateY: [18, 0],
        duration: 700,
        delay: stagger(110, { start: 450 }),
        ease: "out(2)",
      });

      const TRAIL_DURATION = 9000;
      const TRAIL_DELAY = 1400;
      const TRAIL_EASE = "inOut(2)";

      animate(createDrawable(".hero-route"), {
        draw: ["0 0", "0 1"],
        duration: TRAIL_DURATION,
        delay: TRAIL_DELAY,
        ease: TRAIL_EASE,
      });

      animate(".hero-arrow", {
        ...createMotionPath(".hero-route"),
        duration: TRAIL_DURATION,
        delay: TRAIL_DELAY,
        ease: TRAIL_EASE,
      });

      animate(".hero-arrow", {
        opacity: [
          { from: 1, to: 1, duration: TRAIL_DURATION - 400 },
          { to: 0, duration: 400 },
        ],
        delay: TRAIL_DELAY,
        ease: "linear",
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const words = HEADLINE.split(" ");

  return (
    <section
      ref={rootRef}
      className="relative px-4 pb-24 pt-32 sm:px-6 md:pb-32 md:pt-44 lg:px-8"
    >
      <div className="mx-auto max-w-3xl">
        <h1 className="text-balance font-semibold tracking-tight text-foreground text-4xl sm:text-5xl lg:text-7xl lg:leading-[1.04]">
          {words.map((w, i) => (
            <span
              key={`${w}-${i}`}
              className="inline-block overflow-hidden pr-[0.22em] align-bottom"
            >
              <span data-word className="inline-block opacity-0">
                {w}
              </span>
            </span>
          ))}
        </h1>

        <p
          data-reveal
          className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground opacity-0 sm:text-xl"
        >
          LogiTrack deploys explainable AI agents that forecast demand, route fleets, and resolve exceptions — then waits for your sign-off before anything ships.
        </p>

        <div
          data-reveal
          className="mt-10 flex flex-col items-start gap-3 opacity-0 sm:flex-row sm:items-center"
        >
          <Link
            href="/system"
            className="group inline-flex h-11 items-center justify-center gap-2 rounded-md bg-foreground px-5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Open the command center
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/vendor"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium text-foreground transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Terminal className="size-4 text-muted-foreground" />
            Owner console
          </Link>
        </div>
      </div>

      {/* Single proof element: the route */}
      <figure
        data-reveal
        className="mx-auto mt-20 max-w-3xl opacity-0"
        aria-label="A planned delivery route, traced in real time"
      >
        <svg
          viewBox="0 0 304 112"
          preserveAspectRatio="xMidYMid meet"
          className="block h-auto w-full"
          aria-hidden="true"
        >
          {/* Ghost guide */}
          <path
            d="M189.142857,4 C227.456875,4 248.420457,4.00974888 256.864191,4.00974888 C263.817211,4.00974888 271.61219,3.69583517 274.986231,6.63061513 C276.382736,7.84531176 279.193529,11.3814152 280.479499,13.4815847 C281.719344,15.5064248 284.841964,20.3571626 275.608629,20.3571626 C265.817756,20.3571626 247.262478,19.9013915 243.955117,19.9013915 C239.27946,19.9013915 235.350655,24.7304885 228.6344,24.7304885 C224.377263,24.7304885 219.472178,21.0304113 214.535324,21.0304113 C207.18393,21.0304113 200.882842,30.4798911 194.124187,30.4798911 C186.992968,30.4798911 182.652552,23.6245972 173.457298,23.6245972 C164.83277,23.6245972 157.191045,31.5424105 157.191045,39.1815359 C157.191045,48.466779 167.088672,63.6623005 166.666679,66.9065088 C166.378668,69.1206889 155.842137,79.2568633 151.508744,77.8570506 C145.044576,75.7689355 109.126667,61.6405346 98.7556561,52.9785141 C96.4766876,51.0750861 89.3680347,39.5769094 83.4195005,38.5221785 C80.6048001,38.0231057 73.0179337,38.7426555 74.4158694,42.6956376 C76.7088819,49.1796531 86.3280337,64.1214904 87.1781062,66.9065088 C88.191957,70.2280995 86.4690152,77.0567847 82.2060607,79.2503488 C79.2489435,80.7719756 73.1324132,82.8858479 64.7015706,83.0708761 C55.1604808,83.2802705 44.4254811,80.401884 39.1722168,80.401884 C25.7762119,80.401884 24.3280517,89.1260466 22.476679,94.4501705 C21.637667,96.8629767 20.4337535,108 33.2301959,108 C37.8976087,108 45.0757044,107.252595 53.4789069,103.876424 C61.8821095,100.500252 122.090049,78.119656 128.36127,75.3523302 C141.413669,69.5926477 151.190142,68.4987755 147.018529,52.0784879 C143.007818,36.291544 143.396957,23.4057975 145.221196,19.6589263 C146.450194,17.1346449 148.420955,14.8552817 153.206723,15.7880203 C155.175319,16.1716965 155.097637,15.0525421 156.757598,11.3860986 C158.417558,7.71965506 161.842736,4.00974888 167.736963,4.00974888 C177.205308,4.00974888 184.938832,4 189.142857,4 Z"
            fill="none"
            className="text-muted-foreground"
            stroke="currentColor"
            strokeOpacity="0.22"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1.5 3"
          />
          {/* Drawn trail */}
          <path
            className="hero-route text-foreground"
            d="M189.142857,4 C227.456875,4 248.420457,4.00974888 256.864191,4.00974888 C263.817211,4.00974888 271.61219,3.69583517 274.986231,6.63061513 C276.382736,7.84531176 279.193529,11.3814152 280.479499,13.4815847 C281.719344,15.5064248 284.841964,20.3571626 275.608629,20.3571626 C265.817756,20.3571626 247.262478,19.9013915 243.955117,19.9013915 C239.27946,19.9013915 235.350655,24.7304885 228.6344,24.7304885 C224.377263,24.7304885 219.472178,21.0304113 214.535324,21.0304113 C207.18393,21.0304113 200.882842,30.4798911 194.124187,30.4798911 C186.992968,30.4798911 182.652552,23.6245972 173.457298,23.6245972 C164.83277,23.6245972 157.191045,31.5424105 157.191045,39.1815359 C157.191045,48.466779 167.088672,63.6623005 166.666679,66.9065088 C166.378668,69.1206889 155.842137,79.2568633 151.508744,77.8570506 C145.044576,75.7689355 109.126667,61.6405346 98.7556561,52.9785141 C96.4766876,51.0750861 89.3680347,39.5769094 83.4195005,38.5221785 C80.6048001,38.0231057 73.0179337,38.7426555 74.4158694,42.6956376 C76.7088819,49.1796531 86.3280337,64.1214904 87.1781062,66.9065088 C88.191957,70.2280995 86.4690152,77.0567847 82.2060607,79.2503488 C79.2489435,80.7719756 73.1324132,82.8858479 64.7015706,83.0708761 C55.1604808,83.2802705 44.4254811,80.401884 39.1722168,80.401884 C25.7762119,80.401884 24.3280517,89.1260466 22.476679,94.4501705 C21.637667,96.8629767 20.4337535,108 33.2301959,108 C37.8976087,108 45.0757044,107.252595 53.4789069,103.876424 C61.8821095,100.500252 122.090049,78.119656 128.36127,75.3523302 C141.413669,69.5926477 151.190142,68.4987755 147.018529,52.0784879 C143.007818,36.291544 143.396957,23.4057975 145.221196,19.6589263 C146.450194,17.1346449 148.420955,14.8552817 153.206723,15.7880203 C155.175319,16.1716965 155.097637,15.0525421 156.757598,11.3860986 C158.417558,7.71965506 161.842736,4.00974888 167.736963,4.00974888 C177.205308,4.00974888 184.938832,4 189.142857,4 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Arrowhead on the leading edge */}
          <g className="hero-arrow text-foreground">
            <path
              d="M -3.5 -3 L 4 0 L -3.5 3 L -1.5 0 Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="0.6"
              strokeLinejoin="round"
            />
          </g>
        </svg>
        <figcaption className="mt-4 text-sm text-muted-foreground">
          A dispatch plan, traced in the time it takes to read this sentence.
        </figcaption>
      </figure>
    </section>
  );
}
