import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn } from "lucide-react";

export default function Login() {
    const handleGoogleLogin = () => {
        window.location.href = "/api/auth/google";
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <Card className="w-[400px] shadow-lg border-0">
                <CardHeader className="text-center space-y-2">
                    <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                        Bienvenue
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                        Connectez-vous pour accéder à la gestion de projet
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 py-8">
                    <Button
                        onClick={handleGoogleLogin}
                        className="w-full h-12 text-lg font-medium transition-all hover:scale-[1.02]"
                    >
                        <LogIn className="mr-3 h-5 w-5" />
                        Continuer avec Google
                    </Button>
                    <p className="text-xs text-center text-slate-400 mt-4">
                        L'accès est restreint aux comptes autorisés uniquement.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
