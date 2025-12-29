import { trpc } from "@/lib/trpc";
import { type ReactNode, useEffect } from "react";
import { useLocation } from "wouter";

type ProtectedRouteProps = {
    children: ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { data: user, isLoading } = trpc.auth.me.useQuery();
    const [, setLocation] = useLocation();

    useEffect(() => {
        if (!isLoading && !user) {
            setLocation("/login");
        }
    }, [user, isLoading, setLocation]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return <>{children}</>;
}
