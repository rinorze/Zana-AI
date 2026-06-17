import { Composition, registerRoot } from "remotion";

import { DemoVideo } from "./video";

export const REMOTION_FPS = 30;
export const DEMO_DURATION_IN_SECONDS = 54;
export const DEMO_WIDTH = 1920;
export const DEMO_HEIGHT = 1080;

const Main = () => {
  return (
    <Composition
      id="DemoVideo"
      component={DemoVideo}
      durationInFrames={REMOTION_FPS * DEMO_DURATION_IN_SECONDS}
      fps={REMOTION_FPS}
      width={DEMO_WIDTH}
      height={DEMO_HEIGHT}
      defaultProps={{
        homeImage: "/remotion-demo/home.png",
        servicesImage: "/remotion-demo/services.png",
        chatImage: "/remotion-demo/chat.png",
        agentImage: "/remotion-demo/agent.png",
        adminImage: "/remotion-demo/admin.png",
      }}
    />
  );
};

registerRoot(Main);