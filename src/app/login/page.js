import LoginForm from "@/components/login-form";


export const metadata = {
  alternates: {
    canonical: "/login",
  },
  title: "Sign In to Stream Music Free",
  description: "Sign in to your Jammify account and stream 80M+ songs free with no ads. Access your playlists, liked songs, and personalized recommendations.",
  openGraph: {
    title: "Sign In to Stream Music Free | Jammify",
    description: "Sign in to Jammify and enjoy 80M+ songs, Spotify playlist import, live lyrics, and more — all free.",
  },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-editorial">


      <div className="w-full max-w-md">
        {/* Simple logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Jammify</h1>
          <p className="text-muted-foreground">Welcome back</p>
        </div>

        {/* Login form */}
        <LoginForm />
      </div>
    </div>
  );
}
