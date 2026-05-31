import SignupForm from "@/components/signup-form";


export const metadata = {
  alternates: {
    canonical: "/signup",
  },
  title: "Create Free Account — Start Streaming Music",
  description: "Create your free Jammify account and start streaming 80M+ songs with no ads. Import Spotify playlists, build your library, and enjoy high-fidelity audio.",
  openGraph: {
    title: "Create Free Account | Jammify",
    description: "Join Jammify for free and stream 80M+ songs — no ads, Spotify import, live lyrics, and lossless audio.",
  },
};

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-editorial">


      <div className="w-full max-w-md">
        {/* Simple logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Jammify</h1>
          <p className="text-muted-foreground">Create your account</p>
        </div>

        {/* Signup form */}
        <SignupForm />
      </div>
    </div>
  );
}
