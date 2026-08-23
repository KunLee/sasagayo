import type { Metadata } from "next";
import CirclesClient from "./CirclesClient";
export const metadata:Metadata={title:"Circles",description:"Small listening communities organized around a feeling or ritual."};
export default function CirclesPage(){return <CirclesClient/>;}

