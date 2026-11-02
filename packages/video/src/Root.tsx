import React from "react";
import { Composition } from "remotion";
import { LessonVideo } from "./Lesson";
import sample from "./sample.json";
import { dimensions, FPS, timeline } from "./timing";
import type { Lesson, LessonProps } from "./types";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Lesson"
    component={LessonVideo as React.FC<Record<string, unknown>>}
    fps={FPS}
    width={1920}
    height={1080}
    durationInFrames={FPS * 10}
    defaultProps={{ lesson: sample as unknown as Lesson, assetBase: "http://localhost:8000", captions: true } satisfies LessonProps}
    calculateMetadata={({ props }) => {
      const lesson = (props as unknown as LessonProps).lesson;
      return { durationInFrames: timeline(lesson).total, ...dimensions(lesson) };
    }}
  />
);
