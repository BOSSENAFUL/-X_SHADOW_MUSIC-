"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
    {
        q: "What is Jammify?",
        a: "Jammify is a music streaming web app built as a personal learning and portfolio project. It focuses on fast music streaming, playlist importing, and a smooth cross-platform experience.",
    },
    {
        q: "Is Jammify free?",
        a: "Yes, Jammify is completely free to use.",
    },
    {
        q: "Does Jammify have ads?",
        a: "No, Jammify is completely ad-free. There are zero ads or interruptions.",
    },
    {
        q: "Can I import Spotify playlists?",
        a: "Yes 🎵 You can import Spotify playlists directly using the playlist link.",
    },
    {
        q: "Does YouTube Music playlist import work?",
        a: "Yes, YouTube Music playlist import is also supported.",
    },
    {
        q: "Why are some songs missing after importing playlists?",
        a: "Jammify only imports songs that are currently available in its music sources/database. Some artists or tracks may not be available yet.",
    },
    {
        q: "Can I transfer liked songs?",
        a: "Right now playlist import works best with public playlists. Full account syncing or liked-song transfer is not supported yet.",
    },
    {
        q: "Does Jammify support offline playback?",
        a: "No. Offline playback inside the app is not supported currently.",
    },
    {
        q: "Why does the Android APK show a Play Protect warning?",
        a: "The APK is not published on the Google Play Store yet, so Play Protect may flag it as an unknown app. The Android app is mainly a PWA-based wrapper of the website.",
    },
    {
        q: "Is Jammify available on iPhone?",
        a: "Yes 📱 Open Jammify in Safari and tap \"Add to Home Screen\" to use it like an app.",
    },
    {
        q: "Does Jammify support lyrics?",
        a: "Yes 🎤 Most songs support synced lyrics, while some songs currently only have static lyrics.",
    },
    {
        q: "Does Jammify host music files?",
        a: "Jammify uses multiple APIs and music-related sources for streaming, metadata, playlists, and search-related functionality.",
    },
    {
        q: "Is Jammify affiliated with Spotify, YouTube Music, or JioSaavn?",
        a: "No. Jammify is not affiliated with or endorsed by Spotify, YouTube Music, JioSaavn, or any music label/company.",
    },
    {
        q: "Why did you build Jammify?",
        a: "Jammify started as a fun side project for learning music streaming technologies, PWAs, caching, playlist systems, and scalable app architecture. It later started gaining users globally.",
    },
    {
        q: "Will Jammify continue getting updates?",
        a: "Yes 😅 The focus right now is mainly on stability, improvements, polishing the experience, and adding useful features over time.",
    },
];

export default function FaqSection() {
    return (
        <section className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-28 pb-48 sm:pb-28">
            <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-semibold tracking-tighter mb-3">
                    Frequently Asked Questions
                </h2>
                <p className="text-muted-foreground text-base sm:text-lg font-normal">
                    Everything you need to know about Jammify.
                </p>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-2">
                {faqs.map((faq, i) => (
                    <AccordionItem
                        key={i}
                        value={`item-${i}`}
                        className="border border-border/40 rounded-xl px-5 bg-background/50 backdrop-blur-sm data-[state=open]:border-border/70 transition-colors"
                    >
                        <AccordionTrigger className="text-sm sm:text-base font-medium text-left hover:no-underline py-4">
                            {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                            {faq.a}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </section>
    );
}
