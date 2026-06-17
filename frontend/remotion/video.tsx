import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type DemoVideoProps = {
  homeImage: string;
  servicesImage: string;
  chatImage: string;
  agentImage: string;
  adminImage: string;
};

type Scene = {
  title: string;
  subtitle: string;
  eyebrow: string;
  image?: string;
  accent: string;
  callout: string;
  reverse?: boolean;
};

const scenes: Scene[] = [
  {
    title: "ZANA turns public services into a guided experience.",
    subtitle: "A polished front door for citizens, agents, and administrators.",
    eyebrow: "Home",
    image: "/remotion-demo/home.png",
    accent: "from-amber-200/80 via-rose-200/70 to-white/70",
    callout: "Multilingual AI, voice input, and a premium landing surface.",
  },
  {
    title: "The services portal keeps the catalogue searchable and structured.",
    subtitle: "Browse life events, filter by audience, and jump straight into the right procedure.",
    eyebrow: "Services",
    image: "/remotion-demo/services.png",
    accent: "from-sky-200/80 via-cyan-200/70 to-white/70",
    callout: "Services, categories, and an ask-ZANA shortcut in one place.",
    reverse: true,
  },
  {
    title: "Citizens can ask in natural language and get grounded answers.",
    subtitle: "Chat, citations, follow-ups, and voice support all live in the same flow.",
    eyebrow: "Citizen chat",
    image: "/remotion-demo/chat.png",
    accent: "from-emerald-200/80 via-teal-200/70 to-white/70",
    callout: "Responses stay tied to the catalogue instead of drifting into generic advice.",
  },
  {
    title: "The agent workspace assists live conversations in real time.",
    subtitle: "Suggestions, templates, caller context, and after-call summaries move with the call.",
    eyebrow: "Agent copilot",
    image: "/remotion-demo/agent.png",
    accent: "from-violet-200/80 via-indigo-200/70 to-white/70",
    callout: "Built for fast support: context in, guidance out.",
    reverse: true,
  },
  {
    title: "Administrators can manage the catalogue, documents, and analytics.",
    subtitle: "Everything needed to keep the service layer fresh and searchable.",
    eyebrow: "Admin",
    image: "/remotion-demo/admin.png",
    accent: "from-blue-200/80 via-slate-200/70 to-white/70",
    callout: "Tools for services, templates, sources, analytics, and playground testing.",
  },
  {
    title: "ZANA unifies service discovery, support, and operations.",
    subtitle: "One product surface across citizens, agents, and administrators.",
    eyebrow: "Close",
    accent: "from-neutral-900 via-slate-900 to-black",
    callout: "Built to feel helpful in under a minute.",
  },
];

const SCENE_SECONDS = 9;

export function DemoVideo(props: DemoVideoProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const sceneFrames = fps * SCENE_SECONDS;

  return (
    <AbsoluteFill style={{ backgroundColor: "#050816", color: "white", fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      {scenes.map((scene, index) => {
        const start = index * sceneFrames;
        const localFrame = Math.max(0, frame - start);
        const fadeIn = interpolate(localFrame, [0, 18], [0, 1], {
          extrapolateRight: "clamp",
        });
        const fadeOut = interpolate(localFrame, [sceneFrames - 24, sceneFrames], [1, 0], {
          extrapolateLeft: "clamp",
        });
        const opacity = Math.min(fadeIn, fadeOut);
        if (opacity <= 0) return null;

        if (!scene.image) {
          return (
            <AbsoluteFill
              key={scene.eyebrow}
              style={{
                opacity,
                background:
                  "radial-gradient(circle at top left, rgba(251,191,36,0.24), transparent 35%), radial-gradient(circle at bottom right, rgba(59,130,246,0.2), transparent 34%), linear-gradient(135deg, #0f172a 0%, #020617 100%)",
              }}
            >
              <CenteredOutro frame={localFrame} width={width} height={height} scene={scene} />
            </AbsoluteFill>
          );
        }

        return (
          <AbsoluteFill
            key={scene.eyebrow}
            style={{
              opacity,
              background:
                "radial-gradient(circle at top left, rgba(255,255,255,0.1), transparent 30%), linear-gradient(135deg, #081120 0%, #050816 55%, #020617 100%)",
            }}
          >
            <SceneLayout
              frame={localFrame}
              width={width}
              height={height}
              image={propsForScene(scene, props)}
              scene={scene}
              reverse={scene.reverse}
            />
          </AbsoluteFill>
        );
      })}
      <ProgressBar frame={frame} durationInFrames={durationInFrames} />
    </AbsoluteFill>
  );
}

function propsForScene(scene: Scene, props: DemoVideoProps): string {
  switch (scene.image) {
    case "/remotion-demo/home.png":
      return props.homeImage;
    case "/remotion-demo/services.png":
      return props.servicesImage;
    case "/remotion-demo/chat.png":
      return props.chatImage;
    case "/remotion-demo/agent.png":
      return props.agentImage;
    case "/remotion-demo/admin.png":
      return props.adminImage;
    default:
      return props.homeImage;
  }
}

function SceneLayout({
  frame,
  width,
  height,
  image,
  scene,
  reverse,
}: {
  frame: number;
  width: number;
  height: number;
  image: string;
  scene: Scene;
  reverse?: boolean;
}) {
  const intro = spring({
    frame,
    fps: 30,
    config: { damping: 18, stiffness: 120, mass: 0.8 },
  });

  const imageScale = interpolate(frame, [0, 240], [1.08, 1], {
    extrapolateRight: "clamp",
  });

  const layoutDirection = reverse ? "row-reverse" : "row";
  const screenshotShift = interpolate(frame, [0, 35], [40, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: 64, justifyContent: "center" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 48,
          flexDirection: layoutDirection as "row" | "row-reverse",
          height: height - 128,
        }}
      >
        <div style={{ flex: 1, maxWidth: 620, transform: `translateY(${(1 - intro) * 26}px)`, opacity: intro }}>
          <Eyebrow label={scene.eyebrow} accent={scene.accent} />
          <h1
            style={{
              fontSize: 72,
              lineHeight: 1.03,
              letterSpacing: -2,
              marginTop: 20,
              marginBottom: 18,
              fontWeight: 800,
            }}
          >
            {scene.title}
          </h1>
          <p style={{ fontSize: 28, lineHeight: 1.35, color: "rgba(226,232,240,0.88)", maxWidth: 540 }}>{scene.subtitle}</p>
          <div style={{ marginTop: 28 }}>
            <Callout text={scene.callout} />
          </div>
        </div>

        <div
          style={{
            flex: 1.1,
            transform: `translateY(${screenshotShift}px) scale(${0.98 + intro * 0.02})`,
            opacity: 0.98,
          }}
        >
          <ScreenshotFrame image={image} imageScale={imageScale} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

function CenteredOutro({
  frame,
  width,
  height,
  scene,
}: {
  frame: number;
  width: number;
  height: number;
  scene: Scene;
}) {
  const intro = spring({
    frame,
    fps: 30,
    config: { damping: 18, stiffness: 110, mass: 0.8 },
  });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 64 }}>
      <div style={{ maxWidth: 1100, textAlign: "center", transform: `translateY(${(1 - intro) * 24}px)`, opacity: intro }}>
        <Eyebrow label={scene.eyebrow} accent={scene.accent} center />
        <h1
          style={{
            fontSize: Math.min(86, width * 0.055),
            lineHeight: 1.05,
            letterSpacing: -2.2,
            marginTop: 24,
            marginBottom: 20,
            fontWeight: 800,
          }}
        >
          {scene.title}
        </h1>
        <p style={{ fontSize: 30, lineHeight: 1.4, color: "rgba(226,232,240,0.88)", maxWidth: 900, margin: "0 auto" }}>{scene.subtitle}</p>
        <div style={{ display: "inline-flex", marginTop: 36 }}>
          <Callout text={scene.callout} dark />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 52,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "rgba(148,163,184,0.9)",
          fontSize: 20,
        }}
      >
        Designed for public-service discovery, support, and operations.
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at center, rgba(255,255,255,0.06), transparent 38%), radial-gradient(circle at top left, rgba(245,158,11,0.16), transparent 28%), radial-gradient(circle at bottom right, rgba(14,165,233,0.18), transparent 28%)",
        }}
      />
    </AbsoluteFill>
  );
}

function ScreenshotFrame({ image, imageScale }: { image: string; imageScale: number }) {
  const frame = useCurrentFrame();
  const floating = Math.sin(frame / 24) * 6;

  return (
    <div
      style={{
        borderRadius: 36,
        padding: 16,
        background: "rgba(255,255,255,0.08)",
        boxShadow: "0 32px 90px rgba(0,0,0,0.45)",
        border: "1px solid rgba(255,255,255,0.14)",
        backdropFilter: "blur(18px)",
        transform: `translateY(${floating}px)`,
      }}
    >
      <div style={{ overflow: "hidden", borderRadius: 24, background: "#0f172a" }}>
        <div style={{ height: 16, background: "rgba(15,23,42,0.95)" }} />
        <div style={{ height: 670, position: "relative", overflow: "hidden" }}>
          <Img
            src={staticFile(image)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${imageScale})`,
              transformOrigin: "top center",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(2,6,23,0.03) 0%, rgba(2,6,23,0.0) 28%, rgba(2,6,23,0.22) 100%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function Eyebrow({ label, accent, center }: { label: string; accent: string; center?: boolean }) {
  return (
    <div style={{ display: "inline-flex", padding: 1, borderRadius: 9999, background: `linear-gradient(135deg, ${accent})` }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "10px 18px",
          borderRadius: 9999,
          background: "rgba(2,6,23,0.82)",
          color: "white",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          width: center ? "auto" : undefined,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 9999, background: "#fbbf24", boxShadow: "0 0 0 4px rgba(251,191,36,0.15)" }} />
        {label}
      </div>
    </div>
  );
}

function Callout({ text, dark }: { text: string; dark?: boolean }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 18px",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.12)",
        background: dark ? "rgba(15,23,42,0.65)" : "rgba(255,255,255,0.1)",
        color: dark ? "#e2e8f0" : "white",
        fontSize: 20,
        fontWeight: 600,
        maxWidth: 520,
        boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
      }}
    >
      <span style={{ width: 11, height: 11, borderRadius: 9999, background: "#38bdf8", boxShadow: "0 0 0 6px rgba(56,189,248,0.16)" }} />
      {text}
    </div>
  );
}

function ProgressBar({ frame, durationInFrames }: { frame: number; durationInFrames: number }) {
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 6,
        background: "rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          background: "linear-gradient(90deg, #f59e0b, #38bdf8, #34d399)",
        }}
      />
    </div>
  );
}