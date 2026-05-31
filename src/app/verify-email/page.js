import VerifyEmailForm from "@/components/verify-email-form";


export const metadata = {
    alternates: {
        canonical: "/verify-email",
    },
    title: "Verify Email - Jammify",
    description: "Verify your email address",
};

export default function VerifyEmailPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 font-editorial">


            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Verify Email</h1>
                    <p className="text-muted-foreground">
                        Enter the 6-digit code we sent to your email address
                    </p>
                </div>

                {/* Form */}
                <VerifyEmailForm />
            </div>
        </div>
    );
}
