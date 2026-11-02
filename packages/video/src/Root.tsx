import React from "react";
import { Composition } from "remotion";
import { EVENT_FORMATS, EventAvatar, EventCover, EventGrid, EventStory, type EventKit, type EventProps } from "./events/EventKit";
import { LessonVideo } from "./Lesson";
import sample from "./sample.json";
import { dimensions, FPS, timeline } from "./timing";
import type { Lesson, LessonProps } from "./types";

const sampleKit: EventKit = {
  id: "sample", status: "ready", name: "Hack Night", date: "Saturday, 18:00", place: "Santa Cruz de la Sierra",
  description: "", community: "", language: "English", logos: [], spec: null, key_visual: null, key_visual_size: null,
  cutout: null, cutout_box: null, download: null, events: [], error: null,
};
const eventProps: EventProps = { kit: sampleKit, assetBase: "http://localhost:8000" };
const EVENTS = { EventGrid, EventCover, EventAvatar, EventStory };

export const RemotionRoot: React.FC = () => (
  <>
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
    {(Object.keys(EVENTS) as (keyof typeof EVENTS)[]).map((id) => (
      <Composition
        key={id}
        id={id}
        component={EVENTS[id] as React.FC<Record<string, unknown>>}
        fps={FPS}
        width={EVENT_FORMATS[id].width}
        height={EVENT_FORMATS[id].height}
        durationInFrames={EVENT_FORMATS[id].frames}
        defaultProps={eventProps}
      />
    ))}
  </>
);
