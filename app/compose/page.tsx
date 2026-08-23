import type { Metadata } from "next";
import StoryComposer from "./StoryComposer";
export const metadata:Metadata={title:"Share a story",description:"Recommend a song by telling the story behind it."};
export default function ComposePage(){return <StoryComposer/>;}

