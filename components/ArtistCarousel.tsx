'use client';

import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowLeft, ArrowRight, Play } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const artists = [
  { name: 'Frédéric Chopin', years: '1810—1849', era: 'Romantic era', work: 'Nocturnes, Op. 9', image: '/artists/chopin.jpg', position: 'object-[center_18%]', accent: '#c77b63', description: 'Poetry written for eighty-eight keys. Begin with the nocturnes, then follow the quiet revolution.' },
  { name: 'Ludwig van Beethoven', years: '1770—1827', era: 'Classical · Romantic', work: 'Symphony No. 7', image: '/artists/beethoven.jpg', position: 'object-[center_20%]', accent: '#c9a663', description: 'Music that wrestles silence into triumph. Start with the restless pulse of the Seventh Symphony.' },
  { name: 'Johann Sebastian Bach', years: '1685—1750', era: 'Baroque', work: 'The Well-Tempered Clavier', image: '/artists/bach.jpg', position: 'object-[center_16%]', accent: '#80999b', description: 'Architecture made audible: intricate, humane, and endlessly revealing with every return.' },
  { name: 'Nina Simone', years: '1933—2003', era: 'Jazz · Soul · Blues', work: 'I Put a Spell on You', image: '/artists/nina-simone.jpg', position: 'object-[center_20%]', accent: '#a56c82', description: 'A voice of fierce intelligence and radical truth—classical precision transformed into freedom.' },
];

export default function ArtistCarousel() {
  const [viewportRef, api] = useEmblaCarousel({ loop: true, align: 'start' });
  const [selected, setSelected] = useState(0);
  const updateSelected = useCallback(() => api && setSelected(api.selectedScrollSnap()), [api]);

  useEffect(() => {
    if (!api) return;
    api.on('select', updateSelected);
    api.on('reInit', updateSelected);
    return () => {
      api.off('select', updateSelected);
      api.off('reInit', updateSelected);
    };
  }, [api, updateSelected]);

  return <section aria-labelledby="artist-series-title" className="border-b border-stone-900/8 bg-[#21191d] px-4 py-5 text-white sm:px-6 sm:py-7"><div className="mx-auto max-w-[1400px]"><div className="mb-5 flex items-end justify-between px-2"><div><p className="micro-label text-[#d48169]">Sasagayo artist series · 01</p><h2 id="artist-series-title" className="mt-2 font-serif text-3xl tracking-[-.03em] sm:text-4xl">Masters &amp; Muses</h2></div><div className="flex items-center gap-2"><span className="mr-3 hidden text-[10px] tabular-nums text-stone-500 sm:block">0{selected + 1} / 0{artists.length}</span><button onClick={() => api?.scrollPrev()} className="carousel-control" aria-label="Previous musician"><ArrowLeft className="size-4"/></button><button onClick={() => api?.scrollNext()} className="carousel-control" aria-label="Next musician"><ArrowRight className="size-4"/></button></div></div>
    <div className="overflow-hidden rounded-[30px]" ref={viewportRef} role="region" aria-roledescription="carousel" aria-label="Featured musicians"><div className="flex touch-pan-y">{artists.map((artist, index) => <article key={artist.name} className="relative min-w-0 shrink-0 grow-0 basis-full overflow-hidden bg-[#171013]" role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${artists.length}: ${artist.name}`}><div className="grid min-h-[540px] lg:grid-cols-[1.05fr_.95fr]"><div className="relative min-h-[390px] overflow-hidden lg:order-2 lg:min-h-0"><Image src={artist.image} alt={`Portrait of ${artist.name}`} fill priority={index === 0} className={`object-cover grayscale-[20%] ${artist.position}`} sizes="(max-width: 1024px) 100vw, 50vw"/><div className="absolute inset-0 bg-gradient-to-t from-[#171013] via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#171013] lg:via-transparent lg:to-transparent"/><span className="absolute right-5 top-5 rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-[9px] uppercase tracking-[.16em] text-white/75 backdrop-blur">Portrait series</span></div><div className="relative z-10 flex flex-col justify-end p-6 sm:p-10 lg:order-1 lg:justify-center lg:p-14"><div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.18em]" style={{color:artist.accent}}><span className="size-1.5 rounded-full" style={{backgroundColor:artist.accent}}/>Featured musician · {artist.era}</div><h3 className="mt-5 max-w-xl font-serif text-5xl leading-[.88] tracking-[-.045em] sm:text-7xl">{artist.name}</h3><p className="mt-3 text-[10px] tracking-[.18em] text-stone-500">{artist.years}</p><p className="mt-6 max-w-lg text-sm leading-7 text-stone-300">{artist.description}</p><div className="mt-7 flex flex-wrap items-center gap-3"><button className="inline-flex h-11 items-center gap-6 rounded-full bg-[#fff8ee] px-5 text-xs font-semibold text-[#21191d] transition hover:-translate-y-0.5"><Play className="size-3.5 fill-current"/>Explore their music <ArrowRight className="size-3.5"/></button><span className="text-[10px] text-stone-500">Begin with · <strong className="font-medium text-stone-300">{artist.work}</strong></span></div></div></div></article>)}</div></div>
    <div className="mt-5 flex items-center justify-center gap-2" aria-label="Choose musician">{artists.map((artist,index)=><button key={artist.name} onClick={()=>api?.scrollTo(index)} className={`h-1 rounded-full transition-all ${selected===index?'w-10 bg-[#d48169]':'w-5 bg-white/15 hover:bg-white/30'}`} aria-label={`Show ${artist.name}`} aria-current={selected===index?'true':undefined}/>)}</div></div></section>;
}
