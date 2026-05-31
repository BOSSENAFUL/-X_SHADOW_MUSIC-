import ResetPasswordForm from "@/components/reset-password-form";


export const metadata = {
  alternates: {
    canonical: "/reset-password",
  },
  title: "Reset Password - Jammify",
  description: "Create a new password for your account",
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-editorial">


      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Reset Password</h1>
          <p className="text-muted-foreground">
            Create a new password for your account
          </p>
        </div>

        {/* Form */}
        <ResetPasswordForm />
      </div>
    </div>
  );
}
